// API Key - Replace with your actual OpenWeatherMap API key
const API_KEY = '59b7ef44b63ae2fe52bd9715c8a54f3d';

// DOM Elements
const locationInput = document.getElementById('location-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const currentWeather = document.getElementById('current-weather');
const weatherContent = document.getElementById('weather-content');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const forecastContainer = document.getElementById('forecast-container');
const forecastContent = document.getElementById('forecast-content');
const forecastLoading = document.getElementById('forecast-loading');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const darkModeIcon = document.getElementById('dark-mode-icon');
const themeModeLabel = document.getElementById('theme-mode-label');

const themeModes = ['auto', 'light', 'dark'];
let themeMode = localStorage.getItem('themeMode') || 'auto';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    //alert("hi");
    // First try to get location by IP
    getLocationByIP();

    // Set up event listeners
    searchBtn.addEventListener('click', handleSearch);
    locationBtn.addEventListener('click', getLocationByIP);
    locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // On load, apply saved preference
    if (localStorage.getItem('darkMode') === '1') {
        document.body.classList.add('dark-mode');
    } else if (localStorage.getItem('darkMode') === '0') {
        document.body.classList.remove('dark-mode');
    }
    updateDarkModeIcon();
    applyTheme(themeMode);
});

function handleSearch() {
    const location = locationInput.value.trim();
    if (location) {
        fetchWeather(location);
        fetchForecast(location);
        // Update placeholder to the searched location
        locationInput.placeholder = location;
        locationInput.value = '';
    }
}

// Get approximate location based on IP address
async function getLocationByIP() {
    try {
        showLoading("Detecting your location...");

        // First get approximate location from IP
        const ipResponse = await fetch('https://ipapi.co/json/');
        const ipData = await ipResponse.json();

        if (ipData.city && ipData.country) {
            const location = `${ipData.city},${ipData.country}`;
            fetchWeather(location);
            fetchForecast(location);
            locationInput.placeholder = `${ipData.city}, ${ipData.country_name}`;
        } else {
            // Fallback to London if IP location fails
            console.log("Couldn't detect location by IP, falling back to London");
            fetchWeather('London');
            fetchForecast('London');
            locationInput.placeholder = 'London, UK';
        }
    } catch (error) {
        console.error('Error detecting location by IP:', error);
        // Fallback to London if IP location fails
        fetchWeather('London');
        fetchForecast('London');
        locationInput.placeholder = 'London, UK';
    }
}

function showLoading(message = "Loading...") {
    loading.classList.remove('hidden');
    weatherContent.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loading.querySelector('span').textContent = message;
}

async function fetchWeather(location) {
    try {
        showLoading("Fetching weather data...");

        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&units=metric&appid=${API_KEY}`);
        const data = await response.json();

        if (data.cod === 200) {
            displayWeather(data);
        } else {
            showError();
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        showError();
    }
}

async function fetchForecast(location) {
    try {
        // Show loading state
        forecastContent.classList.add('hidden');
        forecastLoading.classList.remove('hidden');

        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${location}&units=metric&appid=${API_KEY}`);
        const data = await response.json();

        if (data.cod === '200') {
            displayForecast(data);
        }
    } catch (error) {
        console.error('Error fetching forecast data:', error);
    }
}

function displayWeather(data) {
    // Hide loading and show content
    loading.classList.add('hidden');
    weatherContent.classList.remove('hidden');

    // Update location
    document.getElementById('location').textContent = `${data.name}, ${data.sys.country}`;

    // Update date
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', options);

    // Update temperature
    document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°`;

    // Update weather description
    const weatherDescription = data.weather[0].description;
    document.getElementById('weather-description').textContent = weatherDescription;

    // Update feels like
    document.getElementById('feels-like').textContent = `Feels like ${Math.round(data.main.feels_like)}°`;

    // Update weather icon
    const iconElement = document.getElementById('current-icon');
    iconElement.innerHTML = getWeatherIcon(data.weather[0].id, data.weather[0].icon);

    // Update additional info
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('wind').textContent = `${Math.round(data.wind.speed)} m/s`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;

    // New: Update extra units
    document.getElementById('minmax').textContent = `${Math.round(data.main.temp_min)}° / ${Math.round(data.main.temp_max)}°`;
    document.getElementById('visibility').textContent = data.visibility ? `${data.visibility / 1000} km` : 'N/A';
    document.getElementById('clouds').textContent = data.clouds ? `${data.clouds.all}%` : 'N/A';
    document.getElementById('wind-gust').textContent = data.wind.gust ? `${data.wind.gust} m/s` : 'N/A';
    document.getElementById('sea-level').textContent = data.main.sea_level ? `${data.main.sea_level} hPa` : 'N/A';
    document.getElementById('grnd-level').textContent = data.main.grnd_level ? `${data.main.grnd_level} hPa` : 'N/A';

    setAutoDarkMode(data);
    updateDarkModeIcon();
    window._lastWeatherData = data; // Save for theme switching
    applyTheme(themeMode, data);
}

function displayForecast(data) {
    // Hide loading and show content
    forecastLoading.classList.add('hidden');
    forecastContent.classList.remove('hidden');

    // Clear previous forecast
    forecastContent.innerHTML = '';

    // Group forecasts by day (we get 40 forecasts, 8 per day for 5 days)
    const dailyForecasts = {};

    data.list.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });

        // Get noon forecast for each day (or closest to noon)
        const hour = date.getHours();
        if (!dailyForecasts[day] || Math.abs(12 - hour) < Math.abs(12 - new Date(dailyForecasts[day].dt * 1000).getHours())) {
            dailyForecasts[day] = forecast;
        }
    });

    // Display one forecast per day
    Object.entries(dailyForecasts).forEach(([day, forecast]) => {
        const forecastElement = document.createElement('div');
        forecastElement.className = 'forecast-item bg-white bg-opacity-10 rounded-xl p-3 flex items-center justify-between';

        forecastElement.innerHTML = `
            <div class="text-left">
                <p class="font-medium">${day}</p>
                <p class="text-sm text-white text-opacity-80">${forecast.weather[0].description}</p>
            </div>
            <div class="flex items-center">
                <span class="text-xl font-medium mr-2">${Math.round(forecast.main.temp)}°</span>
                <span class="text-2xl">${getWeatherIcon(forecast.weather[0].id, forecast.weather[0].icon)}</span>
            </div>
        `;

        forecastContent.appendChild(forecastElement);
    });
}

function showError() {
    loading.classList.add('hidden');
    weatherContent.classList.add('hidden');
    errorMessage.classList.remove('hidden');
}

function getWeatherIcon(weatherId, iconCode) {
    // Map weather codes to icons
    const isDay = iconCode.includes('d');

    switch (true) {
        // Thunderstorm
        case weatherId >= 200 && weatherId < 300:
            return isDay ? '<i class="fas fa-bolt"></i>' : '<i class="fas fa-bolt"></i>';
        // Drizzle
        case weatherId >= 300 && weatherId < 400:
            return '<i class="fas fa-cloud-rain"></i>';
        // Rain
        case weatherId >= 500 && weatherId < 600:
            return isDay ? '<i class="fas fa-cloud-showers-heavy"></i>' : '<i class="fas fa-cloud-moon-rain"></i>';
        // Snow
        case weatherId >= 600 && weatherId < 700:
            return '<i class="far fa-snowflake"></i>';
        // Atmosphere (mist, fog, etc.)
        case weatherId >= 700 && weatherId < 800:
            return '<i class="fas fa-smog"></i>';
        // Clear
        case weatherId === 800:
            return isDay ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        // Clouds
        case weatherId > 800 && weatherId < 900:
            return isDay ? '<i class="fas fa-cloud-sun"></i>' : '<i class="fas fa-cloud-moon"></i>';
        // Default
        default:
            return '<i class="fas fa-cloud"></i>';
    }
}

// Manual toggle
darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    updateDarkModeIcon();
    // Save preference
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? '1' : '0');
    let idx = themeModes.indexOf(themeMode);
    themeMode = themeModes[(idx + 1) % themeModes.length];
    localStorage.setItem('themeMode', themeMode);
    // Use last weather data if available for auto mode
    applyTheme(themeMode, window._lastWeatherData);
});

function updateDarkModeIcon() {
    if (document.body.classList.contains('dark-mode')) {
        darkModeIcon.classList.remove('fa-moon');
        darkModeIcon.classList.add('fa-sun');
    } else {
        darkModeIcon.classList.remove('fa-sun');
        darkModeIcon.classList.add('fa-moon');
    }
}

// Auto dark mode based on day/night
function setAutoDarkMode(data) {
    // Use OpenWeatherMap icon code to detect day/night
    const iconCode = data.weather[0].icon;
    const isNight = iconCode.endsWith('n');
    // Only auto-switch if user hasn't set a preference
    if (localStorage.getItem('darkMode') === null) {
        if (isNight) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        updateDarkModeIcon();
    }
}

function applyTheme(mode, weatherData = null) {
    if (mode === 'light') {
        document.body.classList.remove('dark-mode');
        darkModeIcon.classList.remove('fa-sun');
        darkModeIcon.classList.add('fa-moon');
        themeModeLabel.textContent = 'Light';
    } else if (mode === 'dark') {
        document.body.classList.add('dark-mode');
        darkModeIcon.classList.remove('fa-moon');
        darkModeIcon.classList.add('fa-sun');
        themeModeLabel.textContent = 'Dark';
    } else if (mode === 'auto') {
        let isNight = false;
        if (weatherData && weatherData.weather && weatherData.weather[0] && weatherData.weather[0].icon) {
            isNight = weatherData.weather[0].icon.endsWith('n');
        }
        if (isNight) {
            document.body.classList.add('dark-mode');
            darkModeIcon.classList.remove('fa-moon');
            darkModeIcon.classList.add('fa-sun');
        } else {
            document.body.classList.remove('dark-mode');
            darkModeIcon.classList.remove('fa-sun');
            darkModeIcon.classList.add('fa-moon');
        }
        themeModeLabel.textContent = 'Auto';
    }
}
