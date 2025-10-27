from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
import httpx

router = APIRouter()

NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"
USER_AGENT = "OurFamilySocials/1.0"

@router.get("/geocoding/search")
async def search_locations(
    query: str = Query(..., min_length=2, description="Location search query"),
    limit: int = Query(5, ge=1, le=10, description="Maximum number of results")
) -> List[Dict[str, Any]]:
    """
    Forward geocoding: Search for locations by name
    Returns coordinates and formatted addresses
    """
    if not query or len(query.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters")

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

            return locations

        except httpx.HTTPError as e:
            raise HTTPException(status_code=503, detail=f"Geocoding service unavailable: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error searching locations: {str(e)}")


@router.get("/geocoding/reverse")
async def reverse_geocode(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude")
) -> Dict[str, Any]:
    """
    Reverse geocoding: Get location name from coordinates
    """
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

            return {
                "name": result.get("display_name", ""),
                "latitude": float(result.get("lat", latitude)),
                "longitude": float(result.get("lon", longitude)),
                "type": result.get("type", ""),
                "place_id": result.get("place_id", ""),
                "address": result.get("address", {})
            }

        except httpx.HTTPError as e:
            raise HTTPException(status_code=503, detail=f"Geocoding service unavailable: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reverse geocoding: {str(e)}")
