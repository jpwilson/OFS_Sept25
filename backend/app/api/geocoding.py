from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any
import time
import httpx

from ..core.deps import get_current_user
from ..models.user import User
from ..utils.rate_limit import SlidingWindowLimiter

router = APIRouter()

NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"
USER_AGENT = "OurFamilySocials/1.0"

# Nominatim's usage policy allows about one request a second for the whole site and
# bans abusers, so the proxy needs a signed-in user, throttles each user, and caches
# answers (the same place is looked up again and again while a story is written).
GEOCODE_LIMIT_PER_MINUTE = 30
_geocode_limiter = SlidingWindowLimiter(limit=GEOCODE_LIMIT_PER_MINUTE, window_seconds=60)
CACHE_SECONDS = 24 * 3600
CACHE_MAX_ENTRIES = 2000
_cache: Dict[tuple, tuple] = {}


def _throttle(user: User):
    if not _geocode_limiter.allow(user.id):
        raise HTTPException(status_code=429, detail="Too many location lookups. Please wait a moment and try again.")


def _cache_get(key):
    hit = _cache.get(key)
    if hit and hit[0] > time.monotonic():
        return hit[1]
    _cache.pop(key, None)
    return None


def _cache_put(key, value):
    if len(_cache) >= CACHE_MAX_ENTRIES:
        _cache.clear()
    _cache[key] = (time.monotonic() + CACHE_SECONDS, value)

@router.get("/geocoding/search")
async def search_locations(
    query: str = Query(..., min_length=2, description="Location search query"),
    limit: int = Query(5, ge=1, le=10, description="Maximum number of results"),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """
    Forward geocoding: Search for locations by name
    Returns coordinates and formatted addresses
    """
    if not query or len(query.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters")
    if len(query) > 300:
        raise HTTPException(status_code=400, detail="Query is too long")

    cache_key = ("search", query.strip().lower(), limit)
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    _throttle(current_user)

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{NOMINATIM_BASE_URL}/search",
                params={
                    "q": query,
                    "format": "json",
                    "addressdetails": 1,
                    "limit": limit
                },
                headers={"User-Agent": USER_AGENT},
                timeout=10.0
            )
            response.raise_for_status()
            results = response.json()

            # Transform results to our format
            locations = []
            for result in results:
                locations.append({
                    "name": result.get("display_name", ""),
                    "latitude": float(result.get("lat", 0)),
                    "longitude": float(result.get("lon", 0)),
                    "type": result.get("type", ""),
                    "place_id": result.get("place_id", ""),
                    "address": result.get("address", {})
                })

            _cache_put(cache_key, locations)
            return locations

        except httpx.HTTPError as e:
            raise HTTPException(status_code=503, detail=f"Geocoding service unavailable: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error searching locations: {str(e)}")


@router.get("/geocoding/reverse")
async def reverse_geocode(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude"),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Reverse geocoding: Get location name from coordinates
    """
    # ~1 m precision: photos taken in the same spot share one lookup
    cache_key = ("reverse", round(latitude, 5), round(longitude, 5))
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    _throttle(current_user)

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{NOMINATIM_BASE_URL}/reverse",
                params={
                    "lat": latitude,
                    "lon": longitude,
                    "format": "json",
                    "addressdetails": 1
                },
                headers={"User-Agent": USER_AGENT},
                timeout=10.0
            )
            response.raise_for_status()
            result = response.json()

            if "error" in result:
                raise HTTPException(status_code=404, detail="No location found for these coordinates")

            place = {
                "name": result.get("display_name", ""),
                "latitude": float(result.get("lat", latitude)),
                "longitude": float(result.get("lon", longitude)),
                "type": result.get("type", ""),
                "place_id": result.get("place_id", ""),
                "address": result.get("address", {})
            }
            _cache_put(cache_key, place)
            return place

        except HTTPException:
            raise
        except httpx.HTTPError as e:
            raise HTTPException(status_code=503, detail=f"Geocoding service unavailable: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reverse geocoding: {str(e)}")
