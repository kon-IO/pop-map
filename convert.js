/** Conversion script for Shapefiles */
import shp from "shpjs";

const dim = await shp(await Bun.file("./DHMOI_2021.zip").arrayBuffer());
Bun.write(Bun.file("./dim.json"), JSON.stringify(dim));
const enot = await shp(await Bun.file("./DHM_ENOT_2021.zip").arrayBuffer());
Bun.write(Bun.file("./dimenot.json"), JSON.stringify(enot));
const koin = await shp(await Bun.file("./DHM_KOIN_2021.zip").arrayBuffer());
Bun.write(Bun.file("./dimkoin.json"), JSON.stringify(koin));