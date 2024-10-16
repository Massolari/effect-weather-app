import { z } from "zod";
import { debounce } from "lodash";

const CityResponse = z.object({
  name: z.string(),
  country_code: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

type CityResponse = z.infer<typeof CityResponse>;

const GeocodingResponse = z.object({
  results: z.array(CityResponse),
});

type GeocodingResponse = z.infer<typeof GeocodingResponse>;

type WeatherResult =
  | { tag: "ok"; value: WeatherResponse }
  | { tag: "error"; value: unknown };

const WeatherResponse = z.object({
  current_units: z.object({
    temperature_2m: z.string(),
    relative_humidity_2m: z.string(),
    apparent_temperature: z.string(),
    precipitation: z.string(),
  }),
  current: z.object({
    temperature_2m: z.number(),
    relative_humidity_2m: z.number(),
    apparent_temperature: z.number(),
    precipitation: z.number(),
  }),
});

type WeatherResponse = z.infer<typeof WeatherResponse>;

// The field input
const cityElement = document.querySelector<HTMLInputElement>("#city");
// The list of suggestions
const citiesElement = document.querySelector<HTMLUListElement>("#cities");
// The weather information
const weatherElement = document.querySelector<HTMLDivElement>("#weather");

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

const getCity = async (city: string): Promise<CityResponse[]> => {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=10&language=en&format=json`,
    );

    const geocoding = await response.json();
    const parsedGeocoding = GeocodingResponse.safeParse(geocoding);

    if (!parsedGeocoding.success) {
      return [];
    }

    return parsedGeocoding.data.results;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

const renderCitySuggestions = (cities: CityResponse[]) => {
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

const populateSuggestions = (results: CityResponse[]) =>
  results.forEach((city) => {
    const li = document.createElement("li");
    li.innerText = `${city.name} - ${city.country_code}`;
    li.addEventListener("click", () => selectCity(city));
    citiesElement?.appendChild(li);
  });

const selectCity = async (result: CityResponse) => {
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

const getWeather = async (result: CityResponse): Promise<WeatherResult> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${result.latitude}&longitude=${result.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation&timezone=auto&forecast_days=1`,
    );

    const weather = await response.json();
    const parsedWeather = WeatherResponse.safeParse(weather);

    if (!parsedWeather.success) {
      return { tag: "error", value: parsedWeather.error };
    }

    return { tag: "ok", value: parsedWeather.data };
  } catch (error) {
    return { tag: "error", value: error };
  }
};
