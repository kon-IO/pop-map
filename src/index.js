import {
  geoJSON,
  map,
  tileLayer,
  LatLng,
  control,
  DomUtil,
  Control,
  DomEvent,
} from "leaflet";

function coordsToLatLngCustom(coords) {
  return new LatLng(coords[1] + 0.00255, coords[0] + 0.0019, coords[2]);
}

let settlements;

function search(text) {
  return settlements
    .entries()
    .filter(([k, v]) => v[1].some((i) => i[1].startsWith(text)));
}

Control.Search = Control.extend({
  onAdd: function (map) {
    const div = DomUtil.create("form", "search-div");
    DomEvent.on(div, "submit", (e) => {
      e.preventDefault();
    });

    const box = DomUtil.create("input", "search-box", div);
    box.setAttribute("type", "text");
    box.setAttribute("list", "search-list");
    box.setAttribute("aria-label", "Αναζήτηση οικισμού");
    box.setAttribute("placeholder", "Αναζήτηση οικισμού...");

    const sel = DomUtil.create("datalist", "search-sel", div);
    sel.id = "search-list";

    for (let [code, place] of settlements) {
      const opt = DomUtil.create("option", undefined, sel);
      opt.value =
        place[1].map((i) => `${i[1]}, ${i[0]}`).join("\n") + ` (${code})`;
    }
    DomEvent.on(box, "input", (e) => {
      const text = e.target.value + " ";
      const parenSplit = text.split("(");
      if (parenSplit.length !== 2) {
        return;
      }
      const parenText = parenSplit[1].trim();
      const rightParenSplit = parenText.split(")");
      if (rightParenSplit.length !== 2) {
        return;
      }
      const code = rightParenSplit[0].trim();
      const place = settlements.get(code);
      if (place === undefined) {
        return;
      }
      theMap.flyTo([place[0][1], place[0][0]], 15, { duration: 1 });
    });
    //sel.setAttribute("size", 3);
    //DomEvent.on(sel, "change", (e) => {
    //  console.log(e.target);
    //  const place = settlements.get(e.target.value);
    //  if (place === undefined) {
    //    return;
    //  }
    //  theMap.flyTo([place[0][1], place[0][0]], 15, { duration: 1 });
    //});

    //DomEvent.on(box, "keyup", (e) => {
    //  sel.replaceChildren();
    //  for (let [code, place] of search(e.target.value.trim())) {
    //    const opt = DomUtil.create("option", undefined, sel);
    //    opt.text = place[1].map((i) => `${i[1]}, ${i[0]}`).join("\n");
    //    opt.value = code;
    //  }
    //});

    this.div = div;
    return div;
  },
  onRemove: function (map) {
    DomEvent.off(this.div);
  },
});

control.search = function (opts) {
  return new Control.Search(opts);
};

const koinPopMap = new Map();

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
    pStr = "<0,001%";
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
    makePopPercentageStr(pop, Math.round((pop / countryPop) * 100000) / 1000),
    makePopPercentageStr(pop, Math.round((pop / dimPop) * 100000) / 1000),
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
      Math.round((koinPop / dimUnitPop) * 100000) / 1000
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
  if (
    !confirm(
      "Η σελίδα αυτή θα κατεβάσει δεδομένα μεγέθους περίπου 21MB εάν ο περιηγητής σας υποστηρίζει συμπίεση gzip ή 55MB εάν όχι. Είστε σίγουρος/η ότι θέλετε να συνεχίσετε;"
    )
  ) {
    return;
  }

  const getGeoDataPromise = Promise.all([
    getAndParseJson("./dimkoin.json"),
    getAndParseJson("./dimenot.json"),
    getAndParseJson("./dim.json"),
    getAndParseJson("./oikismoi-transformed-array.json"),
  ]);
  let koindata;
  try {
    koindata = await getAndParseJson("./koindata-array.json");
  } catch (e) {
    alert("Oops! Something went wrong...1 " + e);
    return;
  }

  countryPop = parseInt(koindata[0][3].replaceAll(".", ""), 10);

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
    let settlementsTemp;
    [koin, enot, dim, settlementsTemp] = await getGeoDataPromise;
    settlements = new Map(settlementsTemp);
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
    const d = koinPopMap.get(layer.feature.properties.CODE);
    const popStr = d[3];
    const pop = parseInt(popStr.replaceAll(".", ""), 10);
    return `<h2>${
      layer.feature.properties.NAME_GR
    }</h2><p class="tooltip-pop">Πληθυσμός 2021: <b>${popStr}</b></p><p><i>${makePopPercentageStr(
      pop,
      Math.round((pop / countryPop) * 100000) / 1000
    )} Επικράτειας</i></p>` /* + d[2] */;
  };
  if (mob) {
    dimLayer.bindPopup(dimContentFunc, { offset: [0, -50] });
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
    return `<h2>${layer.feature.properties.NAME_GR}</h2><h3>${
      koinPopMap.get(code.slice(0, 4))[2]
    }</h3><p class="tooltip-pop-num">Πληθυσμός 2021: <b>${pop}</b></p><p><i>${pCountry} Επικράτειας<br />${pDim} Δήμου</i></p>` /* + d["Περιγραφή"] */;
  };
  if (mob) {
    enotLayer.bindPopup(enotContentFunc, { offset: [0, -50] });
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
    koinLayer.bindPopup(koinContentFunc, { offset: [0, -50] });
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
  control.search({ position: "topright" }).addTo(theMap);
}

initialize();
