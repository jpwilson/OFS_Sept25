"""
Backfill: migrate existing Cloudinary assets to Cloudflare R2 and rewrite the
DB URLs in place. Run LOCALLY (not on Vercel) with prod DATABASE_URL + R2_* set.

Idempotent: a JSON map (cloudinary public-id -> new R2 base) is persisted so
re-runs skip already-migrated assets. Cloudinary assets are left untouched, so
this is fully reversible (restore the DB snapshot or reverse the map).

ALWAYS snapshot the database first (Supabase dashboard -> Database -> Backups).

Usage:
    cd backend
    # report only, write nothing:
    python scripts/migrate_cloudinary_to_r2.py --dry-run
    # migrate everything:
    python scripts/migrate_cloudinary_to_r2.py
    # limit / scope while testing:
    python scripts/migrate_cloudinary_to_r2.py --limit 20
    python scripts/migrate_cloudinary_to_r2.py --table event_image
"""
import sys
import os
import io
import re
import json
import uuid
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from PIL import Image, ImageOps
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.api.upload import resize_image, THUMBNAIL_SIZE, MEDIUM_SIZE
from app.utils.r2_client import r2_configured, r2_put, r2_public_url
from app.models import (
    Event, EventImage, User, TagProfile, EventLocation, ContentBlock,
)

CLOUDINARY_RE = re.compile(r'https://res\.cloudinary\.com/[^\s"\'<>)]+')
MAP_PATH = os.path.join(os.path.dirname(__file__), 'cloudinary_to_r2_map.json')

# Cache: cloudinary "original" URL -> new R2 base filename (e.g. "abc123.jpg" / "abc123.mp4")
asset_map = {}


def load_map():
    global asset_map
    if os.path.exists(MAP_PATH):
        with open(MAP_PATH) as f:
            asset_map = json.load(f)


def save_map():
    with open(MAP_PATH, 'w') as f:
        json.dump(asset_map, f, indent=2)


def is_cloudinary(url):
    return bool(url) and 'res.cloudinary.com' in url


def is_video_url(url):
    return '/video/upload/' in url


def cloudinary_original(url):
    """Strip transformation + version segments to get a stable cache key."""
    # .../upload/<transforms>/<vNNN>/<public_id>.<ext>
    m = re.search(r'/(?:image|video)/upload/(.+)$', url)
    if not m:
        return url
    segments = m.group(1).split('/')
    kept = [s for s in segments if (',' not in s and '=' not in s and not re.fullmatch(r'v\d+', s))]
    base = url.split('/upload/')[0] + '/upload/' + '/'.join(kept)
    return base


# ---- delivery URL helpers (match frontend getImageUrl conventions) ----

def r2_full_url(base):
    """Plain full-res URL — for columns rendered through getImageUrl()."""
    return r2_public_url(f"full/{base}")


def r2_bounded_url(base, width=1200):
    """Pre-sized delivery URL — for raw HTML <img> that bypasses getImageUrl()."""
    return f"https://{settings.R2_PUBLIC_DOMAIN}/cdn-cgi/image/width={width},quality=82,format=auto/full/{base}"


def r2_video_url(key):
    return r2_public_url(f"videos/{key}")


# ---- asset migration (download from Cloudinary, upload to R2) ----

def migrate_image(url, dry_run):
    """Return the R2 base filename (e.g. 'abc.jpg') for a Cloudinary image."""
    key = cloudinary_original(url)
    if key in asset_map:
        return asset_map[key]
    if dry_run:
        return '<new>'

    resp = requests.get(key, timeout=60)
    resp.raise_for_status()
    image = Image.open(io.BytesIO(resp.content))
    try:
        image = ImageOps.exif_transpose(image)
    except Exception:
        pass

    base = f"{uuid.uuid4()}.jpg"
    r2_put(f"full/{base}", resize_image(image, (4000, 4000), quality=90), "image/jpeg")
    r2_put(f"medium/{base}", resize_image(image, MEDIUM_SIZE, quality=85), "image/jpeg")
    r2_put(f"thumbnails/{base}", resize_image(image, THUMBNAIL_SIZE, quality=80), "image/jpeg")

    asset_map[key] = base
    save_map()
    return base


def migrate_video(url, dry_run):
    """Return the R2 video key (e.g. 'abc.mp4') for a Cloudinary video."""
    key = cloudinary_original(url)
    if key in asset_map:
        return asset_map[key]
    if dry_run:
        return '<new>'

    # Download the delivered (already-compressed) mp4 from the stored URL
    resp = requests.get(url, timeout=180)
    resp.raise_for_status()
    out_key = f"{uuid.uuid4()}.mp4"
    r2_put(f"videos/{out_key}", resp.content, "video/mp4")

    asset_map[key] = out_key
    save_map()
    return out_key


def new_scalar_url(url, dry_run):
    """New R2 URL for a scalar column (image or video)."""
    if is_video_url(url):
        return r2_video_url(migrate_video(url, dry_run))
    return r2_full_url(migrate_image(url, dry_run))


def rewrite_html(html, dry_run, stats):
    """Replace every Cloudinary URL in an HTML body with its R2 equivalent.
    Individual asset failures are logged and skipped (URL left as-is)."""
    urls = set(CLOUDINARY_RE.findall(html or ''))
    for url in urls:
        stats['html'] += 1
        try:
            if is_video_url(url):
                new = r2_video_url(migrate_video(url, dry_run))
            else:
                new = r2_bounded_url(migrate_image(url, dry_run))
            if not dry_run:
                html = html.replace(url, new)
        except Exception as e:
            stats['errors'] += 1
            print(f"  ! skip html url {url[:70]}... ({e})")
    return html


# ---- per-table passes ----

def run(db, only_table, limit, dry_run):
    stats = {'scalar': 0, 'html': 0, 'video': 0, 'errors': 0}
    budget = [limit] if limit else [None]

    def take():
        if budget[0] is None:
            return True
        if budget[0] <= 0:
            return False
        budget[0] -= 1
        return True

    # Scalar image/video columns
    scalar_targets = [
        ('event', Event, ['cover_image_url']),
        ('event_image', EventImage, ['image_url', 'video_thumbnail_url']),
        ('user', User, ['avatar_url', 'banner_url']),
        ('tag_profile', TagProfile, ['photo_url']),
        ('event_location', EventLocation, ['associated_image_url']),
    ]
    for tname, model, cols in scalar_targets:
        if only_table and only_table != tname:
            continue
        for row in db.query(model).all():
            changed = False
            for col in cols:
                val = getattr(row, col, None)
                if is_cloudinary(val) and take():
                    stats['scalar'] += 1
                    if is_video_url(val):
                        stats['video'] += 1
                    try:
                        new = new_scalar_url(val, dry_run)
                        if not dry_run:
                            setattr(row, col, new)
                            changed = True
                    except Exception as e:
                        stats['errors'] += 1
                        print(f"  ! skip {tname}.{col} id={getattr(row,'id','?')} ({e})")
            if changed and not dry_run:
                db.commit()

    # HTML columns
    html_targets = [
        ('event', Event, 'description'),
        ('content_block', ContentBlock, 'content'),
    ]
    for tname, model, col in html_targets:
        if only_table and only_table != tname:
            continue
        for row in db.query(model).all():
            val = getattr(row, col, None)
            if val and 'res.cloudinary.com' in val and take():
                new_html = rewrite_html(val, dry_run, stats)
                if not dry_run and new_html != val:
                    setattr(row, col, new_html)
                    db.commit()

    return stats


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='report only, write nothing')
    parser.add_argument('--limit', type=int, default=None, help='max assets to process')
    parser.add_argument('--table', type=str, default=None, help='restrict to one table')
    args = parser.parse_args()

    if not args.dry_run and not r2_configured():
        print('ERROR: R2 is not configured (set R2_* env vars). Aborting.')
        sys.exit(1)

    load_map()
    engine = create_engine(settings.DATABASE_URL)  # single local connection
    db = sessionmaker(bind=engine)()
    try:
        stats = run(db, args.table, args.limit, args.dry_run)
    finally:
        db.close()

    mode = 'DRY RUN' if args.dry_run else 'MIGRATED'
    print(f"\n[{mode}] scalar columns: {stats['scalar']} | html URLs: {stats['html']} | videos: {stats['video']} | errors: {stats['errors']}")
    print(f"Asset map: {len(asset_map)} unique assets ({MAP_PATH})")
    if args.dry_run:
        print("Re-run without --dry-run to perform the migration.")


if __name__ == '__main__':
    main()
