from app.integrations import get_current_weather, get_air_quality, get_temperature_forecast

async def calculate_zone_risk(lat: float, lon: float) -> float:
    """
    Risk Score = α(Weather Risk) + β(Traffic Disruption Risk) + γ(Pollution Risk)
    """
    # Fetch data
    weather = await get_current_weather(lat, lon)
    air = await get_air_quality(lat, lon)
    temp_forecast = await get_temperature_forecast(lat, lon)

    # Simple alpha, beta, gamma weights (sum = 1)
    ALPHA = 0.4 # Weather
    BETA = 0.3 # Traffic (mock for now)
    GAMMA = 0.3 # Pollution

    # Weather risk (0 to 1)
    rain_mm = weather.get("rain", {}).get("1h", 0)
    weather_risk = min(1.0, rain_mm / 100.0) # >100mm = max risk

    # Pollution risk (0 to 1) based on AQI (1-5)
    aqi = air.get("list", [{}])[0].get("main", {}).get("aqi", 1)
    pollution_risk = (aqi - 1) / 4.0 # Scale 1-5 to 0-1

    # Traffic / Civic risk (placeholder)
    traffic_risk = 0.2

    risk_score = (ALPHA * weather_risk) + (BETA * traffic_risk) + (GAMMA * pollution_risk)
    return round(risk_score, 2)
