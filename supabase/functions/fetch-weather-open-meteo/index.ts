import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Geocoding service to convert location name to coordinates
async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    const response = await fetch(geocodeUrl);
    
    if (!response.ok) {
      console.error('Geocoding failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      console.error('No geocoding results found for:', location);
      return null;
    }
    
    return {
      lat: data.results[0].latitude,
      lon: data.results[0].longitude
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location } = await req.json();
    
    if (!location) {
      return new Response(
        JSON.stringify({ error: 'Location is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching weather for location:', location);

    // Get coordinates from location name
    const coords = await geocodeLocation(location);
    
    if (!coords) {
      return new Response(
        JSON.stringify({ error: 'Could not find location coordinates' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Coordinates:', coords);

    // Fetch weather from Open-Meteo API
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
    
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      console.error('Weather API error:', weatherResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch weather data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const weatherData = await weatherResponse.json();
    console.log('Weather data received:', weatherData);

    // Weather code mapping (WMO Weather interpretation codes)
    const weatherCodeMap: Record<number, { condition: string; description: string; icon: string }> = {
      0: { condition: 'Clear', description: 'Clear sky', icon: '01d' },
      1: { condition: 'Mainly Clear', description: 'Mainly clear', icon: '01d' },
      2: { condition: 'Partly Cloudy', description: 'Partly cloudy', icon: '02d' },
      3: { condition: 'Overcast', description: 'Overcast', icon: '03d' },
      45: { condition: 'Foggy', description: 'Fog', icon: '50d' },
      48: { condition: 'Foggy', description: 'Depositing rime fog', icon: '50d' },
      51: { condition: 'Drizzle', description: 'Light drizzle', icon: '09d' },
      53: { condition: 'Drizzle', description: 'Moderate drizzle', icon: '09d' },
      55: { condition: 'Drizzle', description: 'Dense drizzle', icon: '09d' },
      61: { condition: 'Rain', description: 'Slight rain', icon: '10d' },
      63: { condition: 'Rain', description: 'Moderate rain', icon: '10d' },
      65: { condition: 'Rain', description: 'Heavy rain', icon: '10d' },
      71: { condition: 'Snow', description: 'Slight snow fall', icon: '13d' },
      73: { condition: 'Snow', description: 'Moderate snow fall', icon: '13d' },
      75: { condition: 'Snow', description: 'Heavy snow fall', icon: '13d' },
      77: { condition: 'Snow', description: 'Snow grains', icon: '13d' },
      80: { condition: 'Rain Showers', description: 'Slight rain showers', icon: '09d' },
      81: { condition: 'Rain Showers', description: 'Moderate rain showers', icon: '09d' },
      82: { condition: 'Rain Showers', description: 'Violent rain showers', icon: '09d' },
      85: { condition: 'Snow Showers', description: 'Slight snow showers', icon: '13d' },
      86: { condition: 'Snow Showers', description: 'Heavy snow showers', icon: '13d' },
      95: { condition: 'Thunderstorm', description: 'Thunderstorm', icon: '11d' },
      96: { condition: 'Thunderstorm', description: 'Thunderstorm with slight hail', icon: '11d' },
      99: { condition: 'Thunderstorm', description: 'Thunderstorm with heavy hail', icon: '11d' },
    };

    const weatherCode = weatherData.current.weather_code;
    const weatherInfo = weatherCodeMap[weatherCode] || { 
      condition: 'Unknown', 
      description: 'Weather condition unknown', 
      icon: '01d' 
    };

    const response = {
      temperature: Math.round(weatherData.current.temperature_2m),
      condition: weatherInfo.condition,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
      humidity: weatherData.current.relative_humidity_2m,
      windSpeed: Math.round(weatherData.current.wind_speed_10m * 10) / 10, // Round to 1 decimal
    };

    console.log('Returning weather response:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-weather-open-meteo:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
