import { geoJSON, map, tileLayer, GeoJSON, LatLng, control } from "leaflet";

import koin from "./dimkoin.json";
import dim from "./dim.json";

import dimdata from "./dimdata.json";
import koindata from "./koindata.json";

function coordsToLatLngDim(coords) {
  return new LatLng(coords[1] + 0.00255, coords[0] + 0.0019, coords[2]);
}

const dimPopMap = new Map();
const koinPopMap = new Map();

// Mode: "dim" | "koin"

let mode = "dim";
let theMap;

const mapLayer = tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});

const baseMaps = { OpenStreetMap: mapLayer };

let overlayMaps;

let dimLayer;
let koinLayer;

document.addEventListener("DOMContentLoaded", () => {
  dimdata.forEach((d) => {
    dimPopMap.set(d["Γεωγραφικός κωδικός"], d);
  });
  // code to detect geographic code mismatch between the two datasets based on the description
  // dim.features.forEach((f) => {
  //   const da = dimPopMap.get(f.properties.code);
  //   const desc = da.Περιγραφή;
  //   if (f.properties.NAME_GR !== desc) {
  //     console.log(
  //       f.properties.NAME_GR,
  //       f.properties.CODE,
  //       desc,
  //       da["Γεωγραφικός Κωδικός"]
  //     );
  //   }
  // });
  koindata.forEach((d) => {
    koinPopMap.set(d["Γ.Κ. 2021"], d);
  });
  // code to detect geographic code mismatch between the two datasets based on the description
  // koin.features.forEach((f) => {
  //   const da = koinPopMap.get(f.properties.KAL2022);
  //   const desc = da.ΠΕΡΙΓΡΑΦΗ;
  //   if (f.properties.LAU_LABEL3 !== desc) {
  //     console.log(
  //       f.properties.LAU_LABEL3,
  //       f.properties.KAL2022,
  //       desc,
  //       da["Γ.Κ. 2021"]
  //     );
  //   }
  // });
  dimLayer = geoJSON(dim, {
    coordsToLatLng: coordsToLatLngDim,
    style: (feature) => {
      return { color: "#db3609" };
    },
  }).bindPopup((layer) => {
    console.log(layer);
    const d = dimPopMap.get(layer.feature.properties.CODE);
    return `<h2>${layer.feature.properties.NAME_GR}</h2><p class="tooltip-pop">Πληθυσμός 2021: <b>${d["Μόνιμος Πληθυσμός 2021"]}</b></p>` /* + d["Περιγραφή"] */;
  });

  koinLayer = geoJSON(koin, {
    coordsToLatLng: coordsToLatLngDim,
    style: (feature) => {
      return { color: "#334455" };
    },
  }).bindPopup((layer) => {
    console.log(layer);
    const d = koinPopMap.get(layer.feature.properties.KAL2022);
    return `<h2>${layer.feature.properties.LAU_LABEL3}</h2><p class="tooltip-pop">Πληθυσμός 2021: <b>${d["ΜΟΝΙΜΟΣ ΠΛΗΘΥΣΜΟΣ"]}</b></p>` /* + d["Περιγραφή"] */;
  });

  overlayMaps = { Δήμοι: dimLayer, "Δημοτικές Κοινότητες": koinLayer };

  theMap = map("map", {
    zoom: 7,
    center: [38.5253, 22.3753],
    preferCanvas: true,
    layers: [mapLayer, dimLayer, koinLayer],
  });
  control.layers(baseMaps, overlayMaps).addTo(theMap);
});
