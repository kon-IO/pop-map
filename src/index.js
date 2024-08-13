import {
  geoJSON,
  map,
  tileLayer,
  GeoJSON,
  LatLng,
  control,
  tooltip,
  Point,
} from "leaflet";

function coordsToLatLngCustom(coords) {
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

async function initialize() {
  const getKoin = async () => {
    const r = await fetch("./dimkoin.json");
    return await r.json();
  };
  const getDim = async () => {
    const r = await fetch("./dim.json");
    return await r.json();
  };
  const getDimData = async () => {
    const r = await fetch("./dimdata.json");
    return await r.json();
  };
  const getKoinData = async () => {
    const r = await fetch("./koindata.json");
    return await r.json();
  };

  const getGeoDataPromise = Promise.all([getKoin(), getDim()]);
  let dimdata, koindata;
  try {
    [dimdata, koindata] = await Promise.all([getDimData(), getKoinData()]);
  } catch (e) {
    alert("Oops! Something went wrong...1 " + e);
    return;
  }

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

  let koin, dim;
  try {
    [koin, dim] = await getGeoDataPromise;
  } catch (e) {
    alert("Oops! Something went wrong... " + e);
    return;
  }

  dimLayer = geoJSON(dim, {
    coordsToLatLng: coordsToLatLngCustom,
    style: () => {
      return { color: "#db3609" };
    },
    onEachFeature: (_feature, layer) => {
      layer.on("mouseover", () => {
        layer.setStyle({ color: "#455d75" });
      });
      layer.on("mouseout", () => {
        layer.setStyle({ color: "#db3609" });
      });
    },
  }).bindTooltip(
    (layer) => {
      // console.log(layer);
      const d = dimPopMap.get(layer.feature.properties.CODE);
      return `<h2>${layer.feature.properties.NAME_GR}</h2><p class="tooltip-pop">Πληθυσμός 2021: <b>${d["Μόνιμος Πληθυσμός 2021"]}</b></p>` /* + d["Περιγραφή"] */;
    },
    { sticky: true, offset: [50, 0] }
  );

  koinLayer = geoJSON(koin, {
    coordsToLatLng: coordsToLatLngCustom,
    style: () => {
      return { color: "#334455" };
    },
    onEachFeature: (_feature, layer) => {
      layer.on("mouseover", () => {
        // layer.setStyle({ color: "#8ebbe8" });
        layer.setStyle({ color: "#8a2307" });
      });
      layer.on("mouseout", () => {
        layer.setStyle({ color: "#334455" });
      });
    },
  }).bindTooltip(
    (layer) => {
      // console.log(layer);
      const code = layer.feature.properties.KAL2022;
      const d = koinPopMap.get(code);
      return `<h2>${layer.feature.properties.LAU_LABEL3}</h2><h3>${
        koinPopMap.get(code.slice(0, 4)).ΠΕΡΙΓΡΑΦΗ
      }</h3><p class="tooltip-pop">Πληθυσμός 2021: <b>${
        d["ΜΟΝΙΜΟΣ ΠΛΗΘΥΣΜΟΣ"]
      }</b></p>` /* + d["Περιγραφή"] */;
    },
    { sticky: true, offset: [50, 0] }
  );

  overlayMaps = { Δήμοι: dimLayer, "Δημοτικές Κοινότητες": koinLayer };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createMap);
  } else {
    createMap();
  }
}

function createMap() {
  theMap = map("map", {
    zoom: 7,
    center: [38.5253, 22.3753],
    // preferCanvas: true,
    layers: [mapLayer, dimLayer],
  });
  control.layers(baseMaps, overlayMaps).addTo(theMap);
}

initialize();
