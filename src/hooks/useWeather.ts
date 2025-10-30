import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface WeatherData {
  temperature: number;
  condition: string;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

// Weather-based prompt suggestions
const getWeatherPrompt = (weather: WeatherData): string => {
  const temp = weather.temperature;
  const condition = weather.condition.toLowerCase();
  
  if (condition.includes('rain') || condition.includes('drizzle')) {
    return 'Rainy day outfit with waterproof layers';
  } else if (condition.includes('snow')) {
    return 'Cozy winter layers for snowy weather';
  } else if (temp > 25) {
    return 'Summer light breathable outfit';
  } else if (temp < 10) {
    return 'Warm winter outfit with layers';
  } else if (condition.includes('cloud')) {
    return 'Transitional weather casual outfit';
  } else {
    return 'Comfortable weather-appropriate outfit';
  }
};

export const useWeather = (location?: string) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedPrompt, setSuggestedPrompt] = useState<string>('');

  useEffect(() => {
    if (location && location.trim()) {
      fetchWeather(location);
    }
  }, [location]);

  const fetchWeather = async (city: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-weather-open-meteo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location: city }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const data = await response.json();
      setWeather(data);
      
      // Generate weather-based prompt suggestion
      const prompt = getWeatherPrompt(data);
      setSuggestedPrompt(prompt);
      
      // Show weather notification with prompt suggestion
      toast.success(
        `Weather in ${city}: ${data.temperature}°C, ${data.condition}`,
        { 
          description: `💡 Suggestion: "${prompt}"`,
          duration: 5000 
        }
      );
    } catch (err) {
      console.error('Weather fetch error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch weather';
      setError(errorMsg);
      setWeather(null);
      toast.error('Could not fetch weather', { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return { 
    weather, 
    loading, 
    error, 
    suggestedPrompt,
    refetch: () => location && fetchWeather(location) 
  };
};
