(function(global) {

  'use strict';
  const WEATHER_API_KEY = '9c131af90334153171c3f715e9228514';
  const LOCATION_URL = 'http://ip-api.com/json';
  const WEATHER_URL = 'https://api.darksky.net/forecast';
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

  /* Get the data from weather API.
   * @param {Object} position - position of user
   */
  function getWeather(position) {
    const LAT = Math.round(position.coords.latitude * 1000) / 1000;
    const LON = Math.round(position.coords.longitude * 1000) / 1000;
    const URL = `${WEATHER_URL}/${WEATHER_API_KEY}/${LAT},${LON}?exclude=[minutely,hourly]&callback=updatePage`;
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
    const LAT = data.latitude;
    const LON = data.longitude;
    const MAP_URL = `http://maps.google.com/?output=embed&q=${LAT},${LON}&ll=${LAT},${LON}&z=13`;
    const DATE = new Date(data.currently.time * 1000); /* API returns time in seconds since Unix Epoc */
    const SUNRISE = new Date(data.daily.data[0].sunriseTime * 1000);
    const SUNSET = new Date(data.daily.data[0].sunsetTime * 1000);
    const TEMPERATURE = data.currently.temperature;
    const WEATHER_ICON = data.currently.icon;
    const WEATHER_SUMMARY = data.currently.summary;
    const WIND_SPEED = data.currently.windSpeed;
    const WIND_DIRECTION = data.currently.windBearing;
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

    // Display the latitude and longitude
    elLocation.setAttribute('href', MAP_URL);
    elLocation.innerHTML = LAT + ', ' + LON;

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
    if (WEATHER_ICON) {
      setWeatherIcon(WEATHER_ICON, isDayTime(SUNRISE, SUNSET));
    }

    // Display weather condition
    if (WEATHER_SUMMARY) {
      elWeather.innerHTML = WEATHER_SUMMARY;
      // Centers weather description if weather icon is missing
      if (!WEATHER_ICON) {
        elWeatherIcon.style.width = 0;
        elWeatherIcon.style.height = 0;
      }
    }

    // Remove weather module if both weather icon and condition are missing
    if (!WEATHER_ICON && !WEATHER_SUMMARY) {
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

  /* Sets the weather icon based upon weather icon received from API.
   * @param {Number} weatherIcon - the weather icon according to
   * https://darksky.net/dev/docs/response
   */
  function setWeatherIcon(weatherIcon) {
    var skycons = new Skycons({'color': document.body.style.color});
    var icon = 'weather-icon';
    switch (weatherIcon) {
      case 'sleet':
        skycons.add(icon, Skycons.SLEET);
        skycons.play();
        break;
      case 'rain':
        skycons.add(icon, Skycons.RAIN);
        skycons.play();
        break;
      case 'snow':
        skycons.add(icon, Skycons.SNOW);
        skycons.play();
        break;
      case 'fog':
        skycons.add(icon, Skycons.FOG);
        skycons.play();
        break;
      case 'clear-day':
        skycons.add(icon, Skycons.CLEAR_DAY);
        skycons.play();
        break;
      case 'clear-night':
        skycons.add(icon, Skycons.CLEAR_NIGHT);
        skycons.play();
        break;
      case 'partly-cloudy-day':
        skycons.add(icon, Skycons.PARTLY_CLOUDY_DAY);
        skycons.play();
        break;
      case 'partly-cloudy-night':
        skycons.add(icon, Skycons.PARTLY_CLOUDY_NIGHT);
        skycons.play();
        break;
      case 'cloudy':
        skycons.add(icon, Skycons.CLOUDY);
        skycons.play();
        break;
      case 'wind':
        skycons.add(icon, Skycons.WIND);
        skycons.play();
        break;
    }
  }
}(window));
