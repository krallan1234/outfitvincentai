import { useState, useEffect } from 'react';

export interface WeatherData {
  temperature: number;
  condition: string;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

export const useWeather = (location?: string) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (location && location.trim()) {
      fetchWeather(location);
    }
  }, [location]);

  const fetchWeather = async (city: string) => {
    try {
      setLoading(true);
      setError(null);

      // Call our Open-Meteo edge function which handles geocoding and weather fetching
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
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch weather');
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  return { weather, loading, error, refetch: () => location && fetchWeather(location) };
};
