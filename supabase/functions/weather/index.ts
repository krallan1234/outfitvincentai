import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city } = await req.json();

    if (!city) {
      throw new Error('City is required');
    }

    if (!OPENWEATHER_API_KEY) {
      throw new Error('OpenWeather API key not configured');
    }

    console.log(`Fetching weather for city: ${city}`);

    // Fetch current weather data
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!weatherResponse.ok) {
      const errorData = await weatherResponse.text();
      console.error('OpenWeather API error:', weatherResponse.status, errorData);
      
      if (weatherResponse.status === 404) {
        throw new Error('City not found. Please check the spelling.');
      } else if (weatherResponse.status === 401) {
        throw new Error('Weather API authentication failed. Please contact support.');
      } else {
        throw new Error('Failed to fetch weather data');
      }
    }

    const weatherData = await weatherResponse.json();
    
    console.log(`Weather fetched successfully for ${city}: ${weatherData.weather[0].main}`);

    // Format the response
    const formattedWeather = {
      temperature: Math.round(weatherData.main.temp),
      condition: weatherData.weather[0].main,
      description: weatherData.weather[0].description,
      icon: weatherData.weather[0].icon,
      humidity: weatherData.main.humidity,
      windSpeed: weatherData.wind.speed,
    };

    return new Response(JSON.stringify(formattedWeather), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Weather function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
