/** Conversion script for Shapefiles */
import shp from "shpjs";

const g = await shp(await Bun.file("./DHMOI_2021.zip").arrayBuffer());
Bun.write(Bun.file("./dim-1.json"), JSON.stringify(g));