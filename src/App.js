import { useCallback, useEffect, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import './App.css';

const api_key = process.env.REACT_APP_OLAMAPS_API_KEY
function App() {
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyPredictions, setNearbyPredictions] = useState([])
  const [loading, setLoading] = useState(false)
  const getUserLocation = useCallback(() => {
    // if geolocation is supported by the users browser
    if (navigator.geolocation) {
      // get the current users location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // save the geolocation coordinates in two variables
          const { latitude, longitude } = position.coords;
          // update the value of userlocation variable
          setUserLocation({ latitude, longitude });
          getNearBy({ latitude, longitude })
        },
        // if there was an error getting the users location
        (error) => {
          console.error('Error getting user location:', error);
        }
      );
    }
    // if geolocation is not supported by the users browser
    else {
      console.error('Geolocation is not supported by this browser.');
    }
  }, []);
  const getNearBy = async ({ latitude, longitude }) => {
    setLoading(true);
    // const res = await fetch(`https://api.olamaps.io/places/v1/nearbysearch?layers=venue,neighbourhood&types=restaurant,cafe,place_of_worship&limit=50&radius=100&strictbounds=true&location=${latitude},${longitude}&api_key=${api_key}`)
    // const res_json = await res.json()
    const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });

    const prompt = "You are an assistant who locates unique and fun activities around the location coordinates. List 15 activities around nearby location: " + latitude + ", " + longitude + ". Answer in the form of comma separated full sentences only without any other extra text. Each option should start with a verb, end with a period and have an exact location name and should be complete sentences within 12 words limit."
    const result = await model.generateContent(prompt);
    let answer_text = result.response.text();
    answer_text = answer_text.split("\n")
    answer_text = answer_text.map(t => t.endsWith(',') ? t.substring(0, t.length - 1) : t)
    answer_text = answer_text.filter(t => t !== '')
    setNearbyPredictions((prev) => [...prev, ...answer_text])
    setLoading(false)
  }
  useEffect(() => {
    if (!userLocation) getUserLocation();
    if (!mapReady || !userLocation) return;

    const map = new MapLibreMap({
      container: "central-map",
      center: [userLocation?.longitude, userLocation?.latitude],
      zoom: 15,
      style:
        "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json",
      transformRequest: (url, resourceType) => {
        // Add the API key to the URL based on existing parameters
        if (url.includes("?")) {
          url = url + "&api_key=" + api_key;
        } else {
          url = url + "?api_key=" + api_key;
        }
        return { url, resourceType };
      },
    });

    const nav = new NavigationControl({
      visualizePitch: false,
      showCompass: true,
    });

    map.addControl(nav, "top-left");

    new Marker().setLngLat([userLocation?.longitude, userLocation?.latitude]).addTo(map);

    map.on("click", "symbols", (e) => {
      map.flyTo({
        center: e.features[0].geometry.coordinates,
      });
    });
  }, [mapReady, userLocation, getUserLocation]);

  if (userLocation)
    return (
      <>
        <div style={{ width: "50vw", height: "50vh", overflow: "hidden", margin: "auto" }}>
          {loading ? <h2 className="loading-text">Curating activities around you...</h2> : <>
            <h2>Activities around you:</h2>
            <div style={{ maxHeight: '35vh', overflowY: "scroll" }}>
              {nearbyPredictions?.map((places, i) => <div className='each-activity' key={i}>{places?.replace(/\\/g, '')}</div>)}
            </div>
          </>}
        </div>
        <div
          style={{ width: "50vw", height: "48vh", overflow: "hidden", margin: "auto" }}
          ref={() => setMapReady(true)}
          id="central-map"
        />
      </>
    );
  return <h3>Geolocation is not supported by this browser.</h3>
}

// const App = () => {
//   const olaMaps = new OlaMaps({
//     apiKey: 'F05ZO2kkYJiGd1fkt57XVQczwogGoufK3CcTubL4',
// })
// const myMap = olaMaps.init({
//   style: "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json",
//   container: 'root',
//   center: [77.61648476788898, 12.931423492103944],
//   zoom: 15,
// })
// myMap.addImage()
//   useEffect(() => {
//     if (!userLocation) getUserLocation()
//   }, [userLocation])
//   if (userLocation)
//     return <div id='map'
//   style={{ width: "100vw", height: "100vh", overflow: "hidden" }}></div>
//   return <h3>Geolocation is not supported by this browser.</h3>
// };

export default App;
