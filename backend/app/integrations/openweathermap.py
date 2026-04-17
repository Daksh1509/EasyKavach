import httpx
from typing import Optional, Dict, Any
from app.core.config import settings

async def get_current_weather(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetch current weather from OpenWeatherMap.
    Falls back to mock data if OWM_API_KEY is missing.
    """
    if not settings.OWM_API_KEY:
        # Return mock rain if no API key (for development)
        return {
            "main": {"temp": 28.5, "humidity": 80},
            "rain": {"1h": 0.0},
            "weather": [{"main": "Clouds", "description": "broken clouds"}]
        }

    url = f"https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": settings.OWM_API_KEY,
        "units": "metric"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching OWM weather: {e}")
            return {"main": {"temp": 25.0}, "rain": {}, "weather": []}
