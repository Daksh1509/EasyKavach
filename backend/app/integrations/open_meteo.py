import httpx
from typing import Dict, Any

async def get_temperature_forecast(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetch temperature forecast from Open-Meteo (no API key needed).
    Used for extreme heat detection (>42°C).
    """
    url = f"https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m",
        "current": "temperature_2m"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching Open-Meteo forecast: {e}")
            return {"current": {"temperature_2m": 25.0}, "hourly": {"temperature_2m": []}}
