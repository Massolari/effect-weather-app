type GeocodingResponse = {
  results: CityResult[];
};

type CityResult = {
  name: string;
  country_code: string;
  latitude: number;
  longitude: number;
};

type WeatherResult =
  | { tag: "ok"; value: WeatherResponse }
  | { tag: "error"; value: unknown };

type WeatherResponse = {
  current_units: {
    temperature_2m: string;
    relative_humidity_2m: string;
    apparent_temperature: string;
    precipitation: string;
  };
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
  };
};

// The field input
const cityElement = document.querySelector<HTMLInputElement>("#city");
// The list of suggestions
const citiesElement = document.querySelector<HTMLUListElement>("#cities");
// The weather information
const weatherElement = document.querySelector<HTMLDivElement>("#weather");

const debounce = (fn: Function, delay: number) => {
  let timeoutId: number;

  return function (...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

const getCities = debounce(async function (input: HTMLInputElement) {
  const { value } = input;

  // Check if the HTML element exists
  if (citiesElement) {
    // Clear the list of suggestions
    citiesElement.innerHTML = "";
  }

  // Check if the input is empty
  if (!value) {
    return;
  }

  // Fetch the cities
  const results = await getCity(value);

  renderCitySuggestions(results);
}, 500);

cityElement?.addEventListener("input", function (_event) {
  getCities(this);
});

const getCity = async (city: string): Promise<CityResult[]> => {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=10&language=en&format=json`,
    );

    const geocoding: GeocodingResponse = await response.json();

    return geocoding.results;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

const renderCitySuggestions = (cities: CityResult[]) => {
  // If there are multiple cities, populate the suggestions
  if (cities.length > 1) {
    populateSuggestions(cities);
    return;
  }

  // We didn't get into the if statement above, so we have only one city or none
  // Let's try to get the first city
  const cityResult = cities.at(0);

  // If don't have a city, display an error message
  if (!cityResult) {
    if (weatherElement) {
      const search = cityElement?.value || "searched";
      weatherElement.innerHTML = `<p>City ${search} not found</p>`;
    }
    return;
  }

  // Fetch the weather for the selected city
  selectCity(cityResult);
};

const populateSuggestions = (results: CityResult[]) =>
  results.forEach((city) => {
    const li = document.createElement("li");
    li.innerText = `${city.name} - ${city.country_code}`;
    li.addEventListener("click", () => selectCity(city));
    citiesElement?.appendChild(li);
  });

const selectCity = async (result: CityResult) => {
  // If the HTML element doesn't exist, return
  if (!weatherElement) {
    return;
  }

  try {
    const data = await getWeather(result);

    if (data.tag === "error") {
      throw data.value;
    }

    weatherElement.innerHTML = `
 <h2>${result.name}</h2>
 <p>Temperature: ${data.value.current.temperature_2m}°C</p>
 <p>Feels like: ${data.value.current.apparent_temperature}°C</p>
 <p>Humidity: ${data.value.current.relative_humidity_2m}%</p>
 <p>Precipitation: ${data.value.current.precipitation}mm</p>
 `;
  } catch (error) {
    weatherElement.innerHTML = `<p>An error occurred while fetching the weather: ${error}</p>`;
  }
};

const getWeather = async (result: CityResult): Promise<WeatherResult> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${result.latitude}&longitude=${result.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation&timezone=auto&forecast_days=1`,
    );

    const weather = await response.json();

    return { tag: "ok", value: weather };
  } catch (error) {
    return { tag: "error", value: error };
  }
};
