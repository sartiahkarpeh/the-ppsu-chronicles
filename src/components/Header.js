'use client';

import { useState, useEffect } from 'react';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Cloudy,
  MapPin, // 📍 Location icon
} from 'lucide-react';

export default function Header() {
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [weatherError, setWeatherError] = useState(null);

  const WEATHER_CITY = 'SURAT';
  const WEATHER_API_URL = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${WEATHER_CITY}?unitGroup=metric&key=UZ5V2WZZWFKN2TBWCK68FE2YB&contentType=json`;

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };

    updateDateTime();
    const timerId = setInterval(updateDateTime, 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    const fetchWeatherData = async () => {
      setLoadingWeather(true);
      setWeatherError(null);

      try {
        const response = await fetch(WEATHER_API_URL);

        if (!response.ok) {
          throw new Error(`Failed to fetch weather data: ${response.statusText}`);
        }

        const data = await response.json();
        const today = data.days[0];
        const condition = today.conditions || 'N/A';
        const temperature = `${Math.round(today.temp)}°C`;

        let weatherIconComponent;
        const lowerCondition = condition.toLowerCase();

        if (lowerCondition.includes('thunder')) {
          weatherIconComponent = <CloudLightning className="w-5 h-5 text-gray-700" />;
        } else if (lowerCondition.includes('rain') || lowerCondition.includes('showers')) {
          weatherIconComponent = <CloudRain className="w-5 h-5 text-blue-600" />;
        } else if (lowerCondition.includes('snow')) {
          weatherIconComponent = <CloudSnow className="w-5 h-5 text-blue-300" />;
        } else if (
          lowerCondition.includes('fog') ||
          lowerCondition.includes('haze') ||
          lowerCondition.includes('mist')
        ) {
          weatherIconComponent = <CloudFog className="w-5 h-5 text-gray-500" />;
        } else if (lowerCondition.includes('clear')) {
          weatherIconComponent = <Sun className="w-5 h-5 text-yellow-500" />;
        } else if (lowerCondition.includes('cloud')) {
          weatherIconComponent = <Cloudy className="w-5 h-5 text-gray-500" />;
        } else {
          weatherIconComponent = <Sun className="w-5 h-5 text-yellow-500" />;
        }

        setWeatherData({
          condition,
          temperature,
          icon: weatherIconComponent,
          city: data.resolvedAddress || WEATHER_CITY,
        });
      } catch (error) {
        console.error('Error fetching weather data:', error);
        setWeatherError(error.message);
      } finally {
        setLoadingWeather(false);
      }
    };

    fetchWeatherData();
    const weatherIntervalId = setInterval(fetchWeatherData, 600000);
    return () => clearInterval(weatherIntervalId);
  }, [WEATHER_API_URL]);

  return (
    <header className="bg-gray-100 text-gray-600 border-b border-gray-200 font-inter">
      <div className="container mx-auto px-6 py-2 flex flex-col sm:flex-row justify-between items-center text-sm rounded-lg">
        <div className="flex flex-col sm:flex-row items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-300 mb-2 sm:mb-0">
          <div className="pb-2 sm:pb-0 sm:pr-3 font-medium">{currentDate}</div>
          <div className="py-2 sm:py-0 sm:px-3">{currentTime}</div>
          <div className="pt-2 sm:pt-0 sm:pl-3 flex items-center space-x-2">
            {loadingWeather ? (
              <span className="animate-pulse">Loading weather...</span>
            ) : weatherError ? (
              <span className="text-red-500">Error: {weatherError}</span>
            ) : weatherData ? (
              <>
                {weatherData.icon}
                <span>
                  {weatherData.condition}, {weatherData.temperature}
                </span>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=P+P+Savani+University,+Surat,+Gujarat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center ml-2 text-blue-600 hover:text-blue-800 underline"
                >
                  <MapPin className="w-4 h-4 mr-1" />
                  P P Savani University
                </a>
              </>
            ) : (
              <span>Weather N/A</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <a href="https://www.facebook.com/profile.php?id=61577874447651" aria-label="Facebook" className="hover:text-blue-600 transition-colors duration-300">
            <Facebook size={18} />
          </a>
          <a href="https://x.com/PPSUChronicles" aria-label="Twitter" className="hover:text-blue-400 transition-colors duration-300">
            <Twitter size={18} />
          </a>
          <a href="https://www.instagram.com/theppsuchronicles/" aria-label="Instagram" className="hover:text-pink-500 transition-colors duration-300">
            <Instagram size={18} />
          </a>
          <a href="https://www.linkedin.com/in/the-ppsu-chronicles-213912371/" aria-label="LinkedIn" className="hover:text-blue-700 transition-colors duration-300">
            <Linkedin size={18} />
          </a>
        </div>
      </div>
    </header>
  );
}

