import httpx
from typing import Optional, Dict, Any
from app.core.config import settings

async def get_air_quality(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetch air quality from OpenWeatherMap Air Pollution API.
    """
    if not settings.OWM_API_KEY:
        # Mock AQI 1-5 (no API key case)
        return {"list": [{"main": {"aqi": 2}, "components": {"pm2_5": 30}}]}

    url = f"https://api.openweathermap.org/data/2.5/air_pollution"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": settings.OWM_API_KEY
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching AQI: {e}")
            # Map safety
            return {"list": [{"main": {"aqi": 1}, "components": {}}]}
