const oikismoi = await Bun.readableStreamToJSON(
  await Bun.file("./oikismoi.json").stream()
);

const j = JSON.stringify(
  oikismoi.features.map((f) => {
    const o = f.properties.OIKISMOS.split("-");

    const idents = o.map((n) => {
      const comma = n.indexOf(",");

      return {
        name: n.slice(0, comma),
        article: n.slice(comma + 1),
      };
    });
    //let name = o.slice(0, comma);
    //const afterComma = o.slice(comma + 1);
    //const firstSpace = afterComma.indexOf(" ");
    //let article;
    //if (firstSpace !== -1) {
    //  article = afterComma.slice(0, firstSpace);
    //  name += afterComma.slice(firstSpace + 1);
    //} else {
    //  article = afterComma;
    //}

    return [
      f.properties.KALCODE,
      {
        idents,
        coords: f.geometry.coordinates,
      },
    ];
  }),
  undefined,
  4
);
await Bun.write(Bun.file("./oikismoi-transformed.json"), j);
