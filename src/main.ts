import maplibregl from "maplibre-gl";
import ExifReader from "exifreader";
import transformTranslate from "@turf/transform-translate";
import sector from "@turf/sector";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";

const map = new maplibregl.Map({
  container: "map",
  style:
    "https://api.maptiler.com/maps/streets/style.json?key=k2rxMRHW2SewPa5yqNRS",
  center: [-121, 45],
  zoom: 5,
  pitch: 45
});

const processImageButton = document.getElementById(
  "process-image"
) as HTMLButtonElement;

processImageButton.onclick = async () => {
  const inputImageEl = document.getElementById(
    "input-image"
  ) as HTMLInputElement;

  if (!inputImageEl.files) {
    return;
  }

  for (let i = 0; i < inputImageEl.files.length; i++) {
    const image = inputImageEl.files[i];

    const tags = await ExifReader.load(image, { expanded: true });

    console.log(tags);

    if (tags.gps && tags.gps.Longitude && tags.gps.Latitude) {
      if (i === 0) {
        map.setCenter([tags.gps.Longitude, tags.gps.Latitude]);

        map.zoomTo(15);
      }

      const point = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [tags.gps.Longitude, tags.gps.Latitude],
        },
        properties: {
          name: image.name
        }
      };

      map.addSource(`point-${i}`, {
        type: "geojson",
        data: point,
      });

      map.addLayer({
        id: `image-location-${i}`,
        type: "symbol",
        source: `point-${i}`,
        layout: {
          'text-field': ['get', 'name'],
        }
      });

      // @ts-ignore
      const [value, scale] = tags.xmp?.GPSIMUYaw.description.split("/");

      const yaw = parseInt(value, 10) / parseInt(scale, 10);

      const translatedPoint = transformTranslate(point, 0.05, yaw);

      const direction = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [[tags.gps.Longitude, tags.gps.Latitude],[...translatedPoint.geometry.coordinates]]
        },
      };

      map.addSource(`direction-${i}`, {
        type: "geojson",
        data: direction,
      });

      map.addLayer({
        id: `image-direction-${i}`,
        type: "line",
        source: `direction-${i}`,
        paint: {
          "line-width": 2,
          "line-color": "#00f",
        },
      });

      const fov = sector([tags.gps.Longitude, tags.gps.Latitude], 0.05, yaw - 30, yaw + 30);

      map.addSource(`fov-${i}`, {
        type: "geojson",
        data: fov,
      });

      map.addLayer({
        id: `image-fov-${i}`,
        type: "fill",
        source: `fov-${i}`,
        paint: {
          "fill-color": "#00f",
          "fill-opacity": 0.5
        },
      });
    }
  }
};
