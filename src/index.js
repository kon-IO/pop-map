import {
  geoJSON,
  map,
  tileLayer,
  GeoJSON,
  LatLng,
  control,
  tooltip,
  Point,
  DomUtil,
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
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <span aria-hidden="true">|</span> Πηγή: <a href="https://www.statistics.gr">ΕΛ.ΣΤΑΤ.</a>',
});

const baseMaps = { OpenStreetMap: mapLayer };

let overlayMaps;

let dimLayer;
let enotLayer;
let koinLayer;

let countryPop;

async function getAndParseJson(url) {
  const r = await fetch(url);
  return await r.json();
}

function makePopPercentageStr(pop, percentage) {
  let pStr;
  if (percentage === 0 && pop !== 0) {
    pStr = "<0,01%";
  } else {
    pStr = percentage.toLocaleString("el-GR") + "%";
  }
  return pStr;
}

function calculateCountryAndDimPercentage(pop, code) {
  const dimPop = parseInt(
    koinPopMap.get(code.slice(0, 4))[3].replaceAll(".", ""),
    10
  );
  return [
    makePopPercentageStr(pop, Math.round((pop / countryPop) * 10000) / 100),
    makePopPercentageStr(pop, Math.round((pop / dimPop) * 10000) / 100),
  ];
}

function calculateAllPercentages(koinPop, code) {
  const dimUnitPop = parseInt(
    koinPopMap.get(code.slice(0, 6))[3].replaceAll(".", ""),
    10
  );

  const arr = calculateCountryAndDimPercentage(koinPop, code);
  arr.push(
    makePopPercentageStr(
      koinPop,
      Math.round((koinPop / dimUnitPop) * 10000) / 100
    )
  );

  return arr;
}

function setInteractiveForLayer(layer, interactive) {
  if (!theMap.hasLayer(layer)) return;
  layer.options.interactive = interactive;
  if (interactive) {
    layer.eachLayer((l) => {
      DomUtil.addClass(l.getElement(), "leaflet-interactive");
    });
    return;
  }
  layer.eachLayer((l) => {
    DomUtil.removeClass(l.getElement(), "leaflet-interactive");
  });
}

function handleInteractivity(layer_num) {
  if (theMap === undefined) return;
  const dim = theMap.hasLayer(dimLayer);
  const enot = theMap.hasLayer(enotLayer);
  const koin = theMap.hasLayer(koinLayer);

  console.log(dim, enot, koin);
  if (dim && enot && koin) {
    setInteractiveForLayer(dimLayer, false);
    setInteractiveForLayer(enotLayer, false);
    setInteractiveForLayer(koinLayer, true);
  } else if (!dim && enot && koin) {
    setInteractiveForLayer(enotLayer, false);
    setInteractiveForLayer(koinLayer, true);
  } else if (dim && !enot && koin) {
    setInteractiveForLayer(dimLayer, false);
    setInteractiveForLayer(koinLayer, true);
  } else if (dim && enot && !koin) {
    setInteractiveForLayer(dimLayer, false);
    setInteractiveForLayer(enotLayer, true);
  } else {
    setInteractiveForLayer(dimLayer, true);
    setInteractiveForLayer(enotLayer, true);
    setInteractiveForLayer(koinLayer, true);
  }
}

function isMobile() {
  return !window.matchMedia("(any-pointer:fine)").matches;
}

async function initialize() {
  const getGeoDataPromise = Promise.all([
    getAndParseJson("./dimkoin.json"),
    getAndParseJson("./dimenot.json"),
    getAndParseJson("./dim.json"),
  ]);
  let dimdata, koindata;
  try {
    [dimdata, koindata] = await Promise.all([
      getAndParseJson("./dimdata-array.json"),
      getAndParseJson("./koindata-array.json"),
    ]);
  } catch (e) {
    alert("Oops! Something went wrong...1 " + e);
    return;
  }

  countryPop = parseInt(dimdata[0][4].replaceAll(".", ""), 10);

  dimdata.forEach((d) => {
    dimPopMap.set(d[1], d);
  });
  // Code to detect geographic code mismatch between the two datasets based on the description
  // dim.features.forEach((f) => {
  //   const da = dimPopMap.get(f.properties.CODE);
  //   const desc = da[2];
  //   if (f.properties.NAME_GR !== desc) {
  //     console.log(
  //       f.properties.NAME_GR,
  //       f.properties.CODE,
  //       desc,
  //       da[1]
  //     );
  //   }
  // });
  koindata.forEach((d) => {
    koinPopMap.set(d[0], d);
  });
  // Code to detect geographic code mismatch between the two datasets based on the description
  // koin.features.forEach((f) => {
  //   const da = koinPopMap.get(f.properties.KAL2022);
  //   const desc = da[2];
  //   if (f.properties.LAU_LABEL3 !== desc) {
  //     console.log(
  //       f.properties.LAU_LABEL3,
  //       f.properties.KAL2022,
  //       desc,
  //       da[0]
  //     );
  //   }
  // });

  let koin, enot, dim;
  try {
    [koin, enot, dim] = await getGeoDataPromise;
  } catch (e) {
    alert("Oops! Something went wrong... " + e);
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      createMapAndLayers(dim, enot, koin)
    );
  } else {
    createMapAndLayers(dim, enot, koin);
  }
}

function createMapAndLayers(dim, enot, koin) {
  theMap = map("map", {
    zoom: 7,
    center: [38.5253, 22.3753],
    // preferCanvas: true,
  });
  theMap.createPane("dim").style.zIndex = 403;
  theMap.createPane("enot").style.zIndex = 402;
  theMap.createPane("koin").style.zIndex = 401;

  const mob = isMobile();

  dimLayer = geoJSON(dim, {
    coordsToLatLng: coordsToLatLngCustom,
    style: () => {
      return { color: "#db3609", fillOpacity: 0.1 };
    },
    onEachFeature: (_feature, layer) => {
      layer.on("mouseover", () => {
        layer.setStyle({ color: "#17e81e", fillOpacity: 0.1 });
      });
      layer.on("mouseout", () => {
        layer.setStyle({ color: "#db3609", fillOpacity: 0.1 });
      });
    },
    pane: "dim",
  });
  const dimContentFunc = (layer) => {
    // console.log(layer);
    const d = dimPopMap.get(layer.feature.properties.CODE);
    const popStr = d[4];
    const pop = parseInt(popStr.replaceAll(".", ""), 10);
    return `<h2>${
      layer.feature.properties.NAME_GR
    }</h2><p class="tooltip-pop">Πληθυσμός 2021: <b>${popStr}</b></p><p><i>${makePopPercentageStr(
      pop,
      Math.round((pop / countryPop) * 10000) / 100
    )} Επικράτειας</i></p>` /* + d[2] */;
  };
  if (mob) {
    dimLayer.bindPopup(dimContentFunc);
  } else {
    dimLayer.bindTooltip(dimContentFunc, { sticky: true, offset: [50, 0] });
  }
  dimLayer.on("add", handleInteractivity);
  dimLayer.on("remove", handleInteractivity);

  enotLayer = geoJSON(enot, {
    coordsToLatLng: coordsToLatLngCustom,
    style: () => {
      return { color: "#f08222", fillOpacity: 0.1 };
    },
    onEachFeature: (_feature, layer) => {
      layer.on("mouseover", () => {
        // layer.setStyle({ color: "#8ebbe8" });
        layer.setStyle({ color: "#17e81e", fillOpacity: 0.1 });
      });
      layer.on("mouseout", () => {
        layer.setStyle({ color: "#f08222", fillOpacity: 0.1 });
      });
    },
    pane: "enot",
  });
  const enotContentFunc = (layer) => {
    console.log(layer);
    const code = layer.feature.properties.CODE;
    const d = koinPopMap.get(code);
    const pop = d[3];
    const [pCountry, pDim] = calculateCountryAndDimPercentage(
      parseInt(pop.replaceAll(".", ""), 10),
      code
    );
    let pCountryStr = pCountry;
    if (pCountryStr === 0 && pop !== 0) {
      pCountryStr = "<0.01";
    }
    return `<h2>${layer.feature.properties.NAME_GR}</h2><h3>${
      koinPopMap.get(code.slice(0, 4))[2]
    }</h3><p class="tooltip-pop-num">Πληθυσμός 2021: <b>${pop}</b></p><p><i>${pCountryStr} Επικράτειας<br />${pDim} Δήμου</i></p>` /* + d["Περιγραφή"] */;
  };
  if (mob) {
    enotLayer.bindPopup(enotContentFunc);
  } else {
    enotLayer.bindTooltip(enotContentFunc, {
      sticky: true,
      offset: [50, 0],
      className: "koin-tooltip",
    });
  }
  enotLayer.on("add", handleInteractivity);
  enotLayer.on("remove", handleInteractivity);

  koinLayer = geoJSON(koin, {
    coordsToLatLng: coordsToLatLngCustom,
    style: () => {
      return { color: "#334455", fillOpacity: 0.1 };
    },
    onEachFeature: (_feature, layer) => {
      layer.on("mouseover", () => {
        // layer.setStyle({ color: "#8ebbe8" });
        layer.setStyle({ color: "#17e81e", fillOpacity: 0.1 });
      });
      layer.on("mouseout", () => {
        layer.setStyle({ color: "#334455", fillOpacity: 0.1 });
      });
    },
    pane: "koin",
  });
  const koinContentFunc = (layer) => {
    // console.log(layer);
    const code = layer.feature.properties.KAL2022;
    const d = koinPopMap.get(code);
    const pop = d[3];
    const [pCountry, pDim, pDimUnit] = calculateAllPercentages(
      parseInt(pop.replaceAll(".", ""), 10),
      code
    );
    return `<h2>${layer.feature.properties.LAU_LABEL3}</h2><h3>${
      koinPopMap.get(code.slice(0, 6))[2]
    }</h3><h5>${
      koinPopMap.get(code.slice(0, 4))[2]
    }</h5><p class="tooltip-pop-num">Πληθυσμός 2021: <b>${pop}</b></p><p><i>${pCountry} Επικράτειας<br />${pDim} Δήμου<br />${pDimUnit} Δημοτικής Ενότητας</i></p>` /* + d["Περιγραφή"] */;
  };
  if (mob) {
    koinLayer.bindPopup(koinContentFunc);
  } else {
    koinLayer.bindTooltip(koinContentFunc, {
      sticky: true,
      offset: [50, 0],
      className: "koin-tooltip",
    });
  }
  koinLayer.on("add", handleInteractivity);
  koinLayer.on("remove", handleInteractivity);

  overlayMaps = {
    Δήμοι: dimLayer,
    "Δημοτικές Ενότητες": enotLayer,
    "Δημοτικές Κοινότητες": koinLayer,
  };

  alert(
    "Τα δεδομένα που προβάλλονται στον χάρτη ελήφθησαν από την Ελληνική Στατιστική Αρχή, και τροποποιήθηκαν κατάλληλα από τον δημιουργό της ιστοσελίδας. Η Ελληνική Στατιστική Αρχή δεν φέρει καμία ευθύνη για το αποτέλεσμα της τροποποίησης αυτής."
  );

  theMap.addLayer(mapLayer);
  theMap.addLayer(dimLayer);
  control.layers(baseMaps, overlayMaps).addTo(theMap);
}

initialize();
