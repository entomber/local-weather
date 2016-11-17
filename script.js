(function(global) {

  'use strict';
  const WEATHER_API_KEY = 'e534aa002759960aff20b6b337db8f0b';
  const LOCATION_URL = 'http://ip-api.com/json';
  const WEATHER_URL = 'http://api.openweathermap.org/data/2.5/weather?';
  const WIND_DIRECTION_MAPPING = {
    N: 'north',
    NE: 'northeast',
    E: 'east',
    SE: 'southeast',
    S: 'south',
    SW: 'southwest',
    W: 'west',
    NW: 'northwest' };

  document.addEventListener('DOMContentLoaded', function() {
    // Get position of user as a Promise. Then use that Promise to get weather data.
    getPosition()
      .then(function(position) {
        getWeather(position);
      })
      .catch(function(error) {
        console.error('error: ' + error);
      });
    // getWeatherCodepen();
  });

  /* Return the position of the user as a Promise.
   * @return {Object} A Promise of user's position
   */
  function getPosition() {
    return new Promise(function(resolve, reject) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      }
    });
  }

  /* Workaround for codepen.io because getCurrentPosition requires HTTPS,
   * and openweathermap's free API is only HTTP. So, to use all HTTP, call
   * an API to get location.
   */
  function getWeatherCodepen() {
    var jsonObject = {};
    var xhr = new XMLHttpRequest();
    xhr.open('GET', LOCATION_URL, true); // true makes this call async
    xhr.onreadystatechange = function() { // need event handler since our call is async
      if (xhr.readyState == 4 && xhr.status == 200) { // check for success
        jsonObject = JSON.parse(xhr.responseText);
        const LAT = jsonObject.lat;
        const LON = jsonObject.lon;
        const URL = WEATHER_URL + 'units=imperial&lat=' + LAT + '&lon=' + LON + '&APPID=' + WEATHER_API_KEY + '&callback=updatePage';
        console.log(URL);

        var script = document.createElement('script');
        script.src = URL;
        document.head.appendChild(script);
      }
    };
    xhr.send(null);
  }

  /* Get the data from weather API.
   * @param {Object} position - position of user
   */
  function getWeather(position) {
    const LAT = Math.round(position.coords.latitude * 1000) / 1000;
    const LON = Math.round(position.coords.longitude * 1000) / 1000;
    const URL = WEATHER_URL + 'units=imperial&lat=' + LAT + '&lon=' + LON + '&APPID=' + WEATHER_API_KEY + '&callback=updatePage';
    // console.log('Latitude: '+lat+'\nLongitude: '+lon);
    console.log(URL);

    var script = document.createElement('script');
    script.src = URL;
    document.head.appendChild(script);
  }

  /* Updates the page using data from weather API response. updatePage is bound to the global scope
   * so loaded script can call it. JSONP loaded script is inserted in separate script tag into the head,
   * in a completely different scope and thus you can only share variables with it through the global scope.
   * @param {Object} data - the data from weather API
   */
  var updatePage = global.updatePage = function(data) {
    const LAT = data.coord.lat;
    const LON = data.coord.lon;
    const MAP_URL = 'http://maps.google.com/?output=embed&q=' + LAT + ',' + LON + '&ll=' + LAT + ',' + LON + '&z=13';
    const CITY = data.name;
    const COUNTRY = data.sys.country;
    const DATE = new Date(data.dt * 1000); /* API returns time in seconds since Unix Epoc */
    const SUNRISE = new Date(data.sys.sunrise * 1000);
    const SUNSET = new Date(data.sys.sunset * 1000);
    const TEMPERATURE = data.main.temp;
    const WEATHER_ID = data.weather[0].id;
    const WEATHER_DESCRIPTION = data.weather[0].description;
    const WIND_SPEED = data.wind.speed;
    const WIND_DIRECTION = data.wind.deg;
    var elLocation = document.getElementById('location');
    var elTemperature = document.getElementById('temperature');
    var elUnits = document.getElementById('units');
    var elUpdateTime = document.getElementById('last-update');
    var elWeatherIcon = document.getElementById('weather-icon');
    var elWeather = document.getElementById('weather');
    var elWindDirection = document.getElementById('wind-direction');
    var elWindSpeed = document.getElementById('wind-speed');

    // Set the background color based upon time of day
    setBackgroundColor(SUNRISE, SUNSET);

    console.log(data);

    // Display the city and country
    if (CITY && COUNTRY) {
      elLocation.setAttribute('href', MAP_URL);
      elLocation.innerHTML = CITY + ', ' + COUNTRY;
    } else if (CITY) {
      elLocation.setAttribute('href', MAP_URL);
      elLocation.innerHTML = CITY;
    }

    // Set initial temperature to F, set initial units text
    if (TEMPERATURE) {
      elTemperature.innerHTML = Math.round(TEMPERATURE);
      elUnits.innerHTML = ' ' + String.fromCharCode(176) + 'F';
    }

    // Handle units link click event
    elUnits.addEventListener('click', function() {
      if (elUnits.innerHTML === (' ' + String.fromCharCode(176) + 'F')) { // Want to change to C
        elUnits.innerHTML = ' ' + String.fromCharCode(176) + 'C';
        elTemperature.innerHTML = getCelsius(TEMPERATURE);
      } else { // Want to change to F
        elUnits.innerHTML = ' ' + String.fromCharCode(176) + 'F';
        elTemperature.innerHTML = Math.round(TEMPERATURE);
      }
    });

    // Sets weather icon
    if (WEATHER_ID) {
      setWeatherIcon(WEATHER_ID, isDayTime(SUNRISE, SUNSET));
    }

    // Display weather condition
    if (WEATHER_DESCRIPTION) {
      elWeather.innerHTML = WEATHER_DESCRIPTION;
      // Centers weather description if weather icon is missing
      if (!WEATHER_ID) {
        elWeatherIcon.style.width = 0;
        elWeatherIcon.style.height = 0;
      }
    }

    // Remove weather module if both weather icon and condition are missing
    if (!WEATHER_ID && !WEATHER_DESCRIPTION) {
      let elModuleSection = document.getElementById('module-section');
      elModuleSection.removeChild(document.getElementById('weather-module'));
    }

    // Remove wind module if both wind direction and speed are missing
    if (!WIND_DIRECTION && !WIND_SPEED) {
      let elModuleSection = document.getElementById('module-section');
      elModuleSection.removeChild(document.getElementById('wind-module'));
    }

    // Display wind direction and speed
    if (WIND_DIRECTION) {
      elWindDirection.innerHTML = getWindDirection(WIND_DIRECTION);
      elWindDirection.style['animation-name'] = WIND_DIRECTION_MAPPING[getWindDirection(WIND_DIRECTION)];
    }
    if (WIND_SPEED) {
      elWindSpeed.innerHTML = WIND_SPEED + ' mph';
    }

    // Update the time
    if (!(DATE.valueOf() !== DATE.valueOf())) { // Check that date is valid (not NaN)
      elUpdateTime.innerHTML = 'Last updated: ' + DATE.toLocaleTimeString() + ' ' + DATE.toLocaleDateString();
    } else { // Date is invalid
      elUpdateTime.innerHTML = 'Last updated: Unknown';
    }
  }

  /* Set the background based upon time of day
   * @param {Date} sunRise - the sunrise time
   * @param {Date} sunSet - the sunset time
   */
  function setBackgroundColor(sunRise, sunSet) {
    if (isDayTime(sunRise, sunSet)) {
      document.body.style.backgroundColor = '#99E64D';
      document.body.style.color = '#F2F2F2';
      document.getElementById('units').style.color = '#1E3124';
      document.getElementById('location').style.color = '#1E3124';
      document.getElementById('by').style.color = '#1E3124';
    } else {
      document.body.style.backgroundColor = '#1E3124';
      document.body.style.color = '#E8E8E8';
      document.getElementById('units').style.color = '#99E64D';
      document.getElementById('location').style.color = '#99E64D';
      document.getElementById('by').style.color = '#99E64D';
    }
  }

  /* Converts from celsius to fahrenheit
   * @param {Number} celsius - the temperature in celsius
   * @return {Number} the temperature in fahrenheit rounded to the nearest integer
   */
  function getFahrenheit(celsius) {
    return Math.round(celsius * 9 / 5 + 32);
  }

  /* Converts from fahrenheit to celsius
   * @param {Number} fahrenheit - the temperature in fahrenheit
   * @return {Number} the temperature in celcius rounded to the nearest integer
   */
  function getCelsius(fahrenheit) {
    return Math.round((fahrenheit - 32) * 5 / 9);
  }

  /* Converts from degrees to wind direction
   * @param {Number} degrees - the degrees from 0 to 359
   * @return {String} abbreviation of wind direction
   */
  function getWindDirection(degrees) {
    if ((degrees >= 337.5 && degrees <= 360) || (degrees >= 0 && degrees < 22.5)) {
      return 'N';
    } else if (degrees >= 22.5 && degrees < 67.5) {
      return 'NE';
    } else if (degrees >= 67.5 && degrees < 112.5) {
      return 'E';
    } else if (degrees >= 112.5 && degrees < 157.5) {
      return 'SE';
    } else if (degrees >= 157.5 && degrees < 202.5) {
      return 'S';
    } else if (degrees >= 202.5 && degrees < 247.5) {
      return 'SW';
    } else if (degrees >= 247.5 && degrees < 292.5) {
      return 'W';
    } else if (degrees >= 292.5 && degrees < 337.5) {
      return 'NW';
    }
    return '';
  }

  /* Checks whether it's day or night given sunrise and sunset times.
   * If sunrise/sunset time is missing (invalid) then sunrise is 6AM and sunset is 8PM.
   * @param {Date} sunRise - The sunrise time.
   * @param {Date} sunSet - The sunset time.
   * @return {boolean} true if day time, false if night time.
   */
  function isDayTime(sunRise, sunSet) {
    var currentTime = new Date();
    // If sunRise is NaN, sets it to same day 6AM
    if (sunRise.valueOf() !== sunRise.valueOf()) {
      sunRise = new Date(currentTime);
      sunRise.setHours(6, 0, 0, 0);
      console.log('new sunRise: ' + sunRise);
    }
    // If sunSet is NaN, sets it to same day 8PM
    if (sunSet.valueOf() !== sunSet.valueOf()) {
      sunSet = new Date(currentTime);
      sunSet.setHours(20, 0, 0, 0);
      console.log('new sunSet: ' + sunSet);
    }
    return currentTime.toTimeString() >= sunRise.toTimeString()
      && currentTime.toTimeString() <= sunSet.toTimeString();
  }

  /* Sets the weather icon based upon time of day and weather code
   * received from API.
   * @param {Number} weatherCode - the weather code according to
   * http://openweathermap.org/weather-conditions
   * @param {boolean} isDayTime - true for day, false for night
   */
  function setWeatherIcon(weatherCode, isDaytime) {
    var skycons = skycons = new Skycons({'color': document.body.style.color}),
      icon = 'weather-icon';
    if ((weatherCode >= 300 && weatherCode < 500) || weatherCode == 906 ) {
      skycons.add(icon, Skycons.SLEET);
      skycons.play();
    } else if (weatherCode >= 500 && weatherCode <= 504) {
      skycons.add(icon, Skycons.RAIN);
      skycons.play();
    } else if (weatherCode == 511 || (weatherCode >= 600 && weatherCode < 700)) {
      skycons.add(icon, Skycons.SNOW);
      skycons.play();
    } else if (weatherCode >= 700 && weatherCode < 800) {
      skycons.add(icon, Skycons.FOG);
      skycons.play();
    } else if (weatherCode == 800) {
      if (isDaytime) {
        skycons.add(icon, Skycons.CLEAR_DAY);   
      } else {
        skycons.add(icon, Skycons.CLEAR_NIGHT);
      }
    skycons.play();
    } else if (weatherCode >= 801 && weatherCode < 804) {
      if (isDaytime) {
        skycons.add(icon, Skycons.PARTLY_CLOUDY_DAY);
      } else {
        skycons.add(icon, Skycons.PARTLY_CLOUDY_NIGHT);
      }
    skycons.play();
    } else if (weatherCode == 803 || weatherCode == 804) {
      skycons.add(icon, Skycons.CLOUDY);
      skycons.play();
    } else if (weatherCode == 905 || (weatherCode >= 952 && weatherCode <= 959)) {
      skycons.add(icon, Skycons.WIND);
      skycons.play();
    }
  }
}(window));
