"""
OFS Smart Import Clusterer v1 — segment a batch of photos into human-meaningful
albums ("a trip", "a birthday", "a beach day") using EXIF timestamps + GPS.

Design (grounded in PhotoTOC/Platt 2003, Apple US9411831, T-DBSCAN, stay-point
literature — see smart-import research):
  Stage 0: normalize + quarantine junk (screenshots / re-shared files)
  Stage 1: adaptive time-gap segmentation with spatial evidence
  Stage 2: per-segment features (median centroid, day chapters)
  Stage 3: home inference (grid-cell day-count)
  Stage 4: trip merging (multi-day trips become ONE album with day chapters)
  Stage 5: tiny-segment cleanup
  Stage 6: confidence, title hints, cover selection

Pure functions over sorted lists; stdlib only; O(n log n). Deliberately written
to be portable to Swift for the future native iOS app — keep the constants
table and function signatures stable.

Timestamps are treated as LOCAL wall-clock time (humans perceive events in
local time; never convert to UTC for segmentation).
"""
import math
from datetime import datetime, timedelta
from typing import Optional

# --- Constants (port this table to Swift verbatim) ---
MIN_GAP_S = 45 * 60          # never split below 45 min
MAX_GAP_S = 8 * 3600         # always split above 8 h (trip layer may re-merge)
PHOTOTOC_K = math.log(17)    # adaptive multiplier (PhotoTOC)
PHOTOTOC_D = 10              # window: 10 gaps each side (clamped at edges)
GAP_CLAMP_MIN_S = 60         # clamp gaps to >=60 s before log (burst guard)
VENUE_SPLIT_M = 5000         # ambiguous gap + moved >5 km -> split (new venue)
GPS_NOISE_M = 500            # ignore GPS deltas below this
GPS_INHERIT_S = 30 * 60      # GPS inheritance window
DAY_PIVOT_H = 4              # calendar day = local time shifted back 4 h
HOME_RADIUS_M = 50_000       # centroid >50 km from home -> AWAY
HOME_CELL_DEG = 0.5          # ~50 km grid cells for home inference
TRIP_MERGE_GAP_S = 40 * 3600 # away segments <=40 h apart merge into one trip
TRIP_CHAIN_M = 200_000       # or centroids <=200 km apart (road-trip chain)
MIN_ALBUM_PHOTOS = 5         # below -> merge or demote
TINY_MERGE_GAP_S = 3 * 3600  # tiny segment absorbs into neighbor within 3 h
BURST_GAP_S = 2              # <=2 s = burst (collapsed for density stats)

WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


def haversine_m(lat1, lon1, lat2, lon2):
    """Great-circle distance in meters."""
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def parse_ts(value) -> Optional[datetime]:
    """Parse client timestamps: ISO 8601 or EXIF 'YYYY:MM:DD HH:MM:SS'."""
    if not value:
        return None
    s = str(value).strip()
    # EXIF format uses colons in the date part
    if len(s) >= 19 and s[4] == ':' and s[7] == ':':
        s = s[:10].replace(':', '-') + s[10:]
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00')).replace(tzinfo=None)
    except (ValueError, TypeError):
        return None


def _median(vals):
    vals = sorted(vals)
    n = len(vals)
    if n == 0:
        return None
    mid = n // 2
    return vals[mid] if n % 2 else (vals[mid - 1] + vals[mid]) / 2


class _P:
    """Internal photo record."""
    __slots__ = ('id', 'ts', 'lat', 'lon', 'gps_inferred', 'width', 'height')

    def __init__(self, id, ts, lat, lon, width, height):
        self.id = id
        self.ts = ts
        self.lat = lat
        self.lon = lon
        self.gps_inferred = False
        self.width = width
        self.height = height


def cluster_photos(photos: list[dict]) -> dict:
    """
    Cluster photo metadata into candidate albums.

    photos: [{id, timestamp, latitude, longitude, width, height, has_camera_exif}]
    Returns {albums: [...], unsorted_photo_ids: [...]}.
    """
    # ---------- Stage 0: normalize & quarantine ----------
    unsorted_ids = []
    parsed = []
    for ph in photos:
        ts = parse_ts(ph.get('timestamp'))
        # Junk: no usable capture time (screenshots / re-shared downloads
        # typically carry no EXIF timestamp and would poison clustering).
        # Dated files without camera EXIF (edited exports) are deliberately
        # KEPT — has_camera_exif is reserved for future tie-breaking.
        if ts is None:
            unsorted_ids.append(ph['id'])
            continue
        lat, lon = ph.get('latitude'), ph.get('longitude')
        if lat is None or lon is None:
            lat = lon = None  # partial GPS is unusable — normalize to none
        parsed.append(_P(
            ph['id'], ts, lat, lon,
            ph.get('width') or 0, ph.get('height') or 0,
        ))

    if not parsed:
        return {'albums': [], 'unsorted_photo_ids': unsorted_ids}

    parsed.sort(key=lambda p: (p.ts, p.id))

    if len(parsed) == 1:
        return {
            'albums': [_album_payload([parsed[0]], confidence='low')],
            'unsorted_photo_ids': unsorted_ids,
        }

    # GPS inheritance: missing GPS borrows nearest-in-time within 30 min
    gps_points = [(i, p) for i, p in enumerate(parsed) if p.lat is not None and p.lon is not None]
    if gps_points:
        for i, p in enumerate(parsed):
            if p.lat is not None:
                continue
            nearest = min(gps_points, key=lambda gp: abs((gp[1].ts - p.ts).total_seconds()))
            if abs((nearest[1].ts - p.ts).total_seconds()) <= GPS_INHERIT_S:
                p.lat, p.lon = nearest[1].lat, nearest[1].lon
                p.gps_inferred = True

    # ---------- Stage 1: segment boundaries (linear scan) ----------
    n = len(parsed)
    gaps = []
    for i in range(n - 1):
        g = (parsed[i + 1].ts - parsed[i].ts).total_seconds()
        gaps.append(max(g, GAP_CLAMP_MIN_S))  # clamps negative tz-jump gaps too
    logs = [math.log(g) for g in gaps]

    boundaries = []
    for i in range(n - 1):
        g = gaps[i]
        if g < MIN_GAP_S:
            continue
        if g > MAX_GAP_S:
            boundaries.append(i)
            continue
        # Ambiguous zone: need adaptive (PhotoTOC) OR movement evidence
        lo, hi = max(0, i - PHOTOTOC_D), min(n - 2, i + PHOTOTOC_D)
        window_mean = sum(logs[lo:hi + 1]) / (hi - lo + 1)
        adaptive = logs[i] >= PHOTOTOC_K + window_mean
        a, b = parsed[i], parsed[i + 1]
        moved = (
            a.lat is not None and b.lat is not None
            and haversine_m(a.lat, a.lon, b.lat, b.lon) > max(VENUE_SPLIT_M, GPS_NOISE_M)
        )
        if adaptive or moved:
            boundaries.append(i)

    segments = []
    start = 0
    for b in boundaries:
        segments.append(parsed[start:b + 1])
        start = b + 1
    segments.append(parsed[start:])

    # ---------- Stage 2/3: features + home inference ----------
    seg_feats = [_segment_features(s) for s in segments]
    home = _infer_home(seg_feats)
    for f in seg_feats:
        if f['centroid'] is None:
            f['zone'] = 'unknown'
        elif home is not None and haversine_m(
            f['centroid'][0], f['centroid'][1], home[0], home[1]
        ) > HOME_RADIUS_M:
            f['zone'] = 'away'
        else:
            f['zone'] = 'home'

    # ---------- Stage 4: trip merging ----------
    merged = _merge_trips(segments, seg_feats)

    # ---------- Stage 5: tiny-segment cleanup ----------
    merged, loose_ids = _cleanup_tiny(merged)
    unsorted_ids.extend(loose_ids)

    # ---------- Stage 6: build album payloads ----------
    albums = []
    for seg, was_trip in merged:
        conf = _confidence(seg, merged)
        albums.append(_album_payload(seg, confidence=conf, is_trip=was_trip))

    albums.sort(key=lambda a: a['start_ts'])
    return {'albums': albums, 'unsorted_photo_ids': unsorted_ids}


def _segment_features(seg):
    lats = [p.lat for p in seg if p.lat is not None and not p.gps_inferred]
    lons = [p.lon for p in seg if p.lon is not None and not p.gps_inferred]
    centroid = (_median(lats), _median(lons)) if lats else None
    dates = {_pivoted_date(p.ts) for p in seg}
    return {'centroid': centroid, 'zone': 'unknown', 'dates': dates}


def _infer_home(seg_feats):
    """Home = the ~50km grid cell whose segments span the most DISTINCT DAYS.
    Day-count (not segment- or photo-count) resists vacation inflation: on a
    trip people shoot many sessions per day; at home usually one. Needs >=2
    distinct cells to be meaningful; otherwise None (conservative: no trips)."""
    if len(seg_feats) < 2:
        return None
    cells = {}  # key -> {'dates': set, 'centroids': []}
    for f in seg_feats:
        if f['centroid'] is None:
            continue
        key = (
            round(f['centroid'][0] / HOME_CELL_DEG),
            round(f['centroid'][1] / HOME_CELL_DEG),
        )
        cell = cells.setdefault(key, {'dates': set(), 'centroids': []})
        cell['dates'] |= f['dates']
        cell['centroids'].append(f['centroid'])
    if len(cells) < 2:
        return None
    best = max(cells.values(), key=lambda c: (len(c['dates']), len(c['centroids'])))
    return (
        _median([c[0] for c in best['centroids']]),
        _median([c[1] for c in best['centroids']]),
    )


def _merge_trips(segments, seg_feats):
    """Merge adjacent AWAY segments into single trips (hotel-night silences
    must not shred a 3-day trip into 6 albums). UNKNOWN segments are absorbed
    only when sandwiched between AWAY segments of the same trip (<=24h gaps)."""
    merged = []  # list of (photos, is_trip)
    i = 0
    while i < len(segments):
        seg, feat = segments[i], seg_feats[i]
        if feat['zone'] != 'away':
            merged.append((list(seg), False))
            i += 1
            continue
        # Start a trip; greedily absorb following segments
        trip = list(seg)
        trip_centroid = feat['centroid']
        is_trip = False
        j = i + 1
        while j < len(segments):
            nxt, nf = segments[j], seg_feats[j]
            gap = (nxt[0].ts - trip[-1].ts).total_seconds()
            if gap > TRIP_MERGE_GAP_S:
                break
            if nf['zone'] == 'away':
                near = (
                    trip_centroid is None or nf['centroid'] is None
                    or haversine_m(trip_centroid[0], trip_centroid[1],
                                   nf['centroid'][0], nf['centroid'][1]) <= TRIP_CHAIN_M
                )
                if not near:
                    break
                trip.extend(nxt)
                trip_centroid = nf['centroid'] or trip_centroid
                is_trip = True
                j += 1
            elif nf['zone'] == 'unknown' and gap <= 24 * 3600:
                # Sandwich rule: absorb only if the segment after is AWAY and close
                if (
                    j + 1 < len(segments)
                    and seg_feats[j + 1]['zone'] == 'away'
                    and (segments[j + 1][0].ts - nxt[-1].ts).total_seconds() <= 24 * 3600
                ):
                    trip.extend(nxt)
                    trip.extend(segments[j + 1])
                    trip_centroid = seg_feats[j + 1]['centroid'] or trip_centroid
                    is_trip = True
                    j += 2
                else:
                    break
            else:
                break
        merged.append((trip, is_trip))
        i = j if j > i + 1 else i + 1
    return merged


def _cleanup_tiny(merged):
    """Absorb tiny segments into their nearest neighbor; demote 1-2 photo
    orphans to the unsorted pool."""
    loose_ids = []
    result = list(merged)
    changed = True
    while changed:
        changed = False
        # scan smallest-first
        order = sorted(range(len(result)), key=lambda k: len(result[k][0]))
        for k in order:
            seg, is_trip = result[k]
            if len(seg) >= MIN_ALBUM_PHOTOS:
                continue
            prev_gap = next_gap = None
            if k > 0:
                prev_gap = (seg[0].ts - result[k - 1][0][-1].ts).total_seconds()
            if k < len(result) - 1:
                next_gap = (result[k + 1][0][0].ts - seg[-1].ts).total_seconds()
            candidates = [
                (gap, idx) for gap, idx in
                [(prev_gap, k - 1), (next_gap, k + 1)]
                if gap is not None and gap <= TINY_MERGE_GAP_S
            ]
            if candidates:
                _, idx = min(candidates)
                target_seg, target_trip = result[idx]
                combined = sorted(target_seg + seg, key=lambda p: (p.ts, p.id))
                result[idx] = (combined, target_trip)
                result.pop(k)
                changed = True
                break
            if len(seg) <= 2 and len(result) > 1:
                # Orphans — but never demote the batch's ONLY segment
                # (a 2-photo import should still produce one album)
                loose_ids.extend(p.id for p in seg)
                result.pop(k)
                changed = True
                break
            # keep, will be flagged low-confidence
    return result, loose_ids


def _confidence(seg, merged):
    if len(seg) < MIN_ALBUM_PHOTOS:
        return 'low'
    if len(seg) >= 8:
        return 'high'
    return 'medium'


def _pivoted_date(ts):
    return (ts - timedelta(hours=DAY_PIVOT_H)).date()


def _pick_cover(seg):
    """Score: landscape + in peak-density hour + decent resolution + not in
    the first/last 5% by time. Bursts collapsed for the density histogram."""
    # peak-density hour with bursts collapsed
    hour_counts = {}
    last_ts = None
    for p in seg:
        if last_ts is not None and (p.ts - last_ts).total_seconds() <= BURST_GAP_S:
            last_ts = p.ts
            continue
        key = p.ts.replace(minute=0, second=0, microsecond=0)
        hour_counts[key] = hour_counts.get(key, 0) + 1
        last_ts = p.ts
    peak_hour = max(hour_counts, key=hour_counts.get) if hour_counts else None

    pixels = sorted(p.width * p.height for p in seg)
    median_px = pixels[len(pixels) // 2] if pixels else 0
    span = (seg[-1].ts - seg[0].ts).total_seconds() or 1
    edge = 0.05 * span

    def score(p):
        s = 0
        if p.width > p.height:
            s += 2
        if peak_hour and p.ts.replace(minute=0, second=0, microsecond=0) == peak_hour:
            s += 2
        if p.width * p.height >= median_px:
            s += 1
        offset = (p.ts - seg[0].ts).total_seconds()
        if edge < offset < span - edge:
            s += 1
        return s

    return max(seg, key=score).id


def _title_hint(seg, is_trip):
    """Template hint; '{place}' is substituted client-side after geocoding."""
    dates = sorted({_pivoted_date(p.ts) for p in seg})
    days = len(dates)
    has_gps = any(p.lat is not None for p in seg)
    if is_trip or days > 1:
        includes_weekend = any(d.weekday() >= 5 for d in dates)
        if days == 1:
            return 'Day trip to {place}' if has_gps else 'A day out'
        if 2 <= days <= 3 and includes_weekend:
            return 'Weekend in {place}' if has_gps else 'A weekend away'
        return f'{days} days in {{place}}' if has_gps else f'{days} days together'
    d = seg[0].ts
    part = 'morning' if d.hour < 12 else ('afternoon' if d.hour < 17 else 'evening')
    return f'{WEEKDAYS[d.weekday()]} {part}' + (' in {place}' if has_gps else '')


def _album_payload(seg, confidence='medium', is_trip=False):
    dates = sorted({_pivoted_date(p.ts) for p in seg})
    chapters = []
    for d in dates:
        ids = [p.id for p in seg if _pivoted_date(p.ts) == d]
        chapters.append({'date': d.isoformat(), 'photo_ids': ids})
    lats = [p.lat for p in seg if p.lat is not None]
    lons = [p.lon for p in seg if p.lon is not None]
    centroid = (
        {'latitude': _median(lats), 'longitude': _median(lons)} if lats else None
    )
    real_gps = sum(1 for p in seg if p.lat is not None and not p.gps_inferred)
    return {
        'photo_ids': [p.id for p in seg],
        'photo_count': len(seg),
        'start_ts': seg[0].ts.isoformat(),
        'end_ts': seg[-1].ts.isoformat(),
        'days': len(dates),
        'chapters': chapters,
        'centroid': centroid,
        'geo_frac': round(real_gps / len(seg), 2),
        'confidence': confidence,
        'is_trip': is_trip,
        'title_hint': _title_hint(seg, is_trip),
        'cover_photo_id': _pick_cover(seg),
    }
