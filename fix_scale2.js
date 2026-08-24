const fs = require("fs");
let c = fs.readFileSync("src/adapters/mendixDataAdapter.ts", "utf8");
c = c.replace(
  "loadCargoItems = async (ordersGuids: string[], scale: number)",
  "loadCargoItems = async (ordersGuids: string[], scale: { widthScale: number; heightScale: number })"
);
c = c.replace(
  "loadPackingPlan = async (truckGuid: string | null, scale: number)",
  "loadPackingPlan = async (truckGuid: string | null, scale: { widthScale: number; heightScale: number })"
);
c = c.replace("savePackingPlan = async (", "savePackingPlan = async (");
c = c.replace(
  "  truckGuid: string | null,\n  state: CanvasState,\n  scale: number,",
  "  truckGuid: string | null,\n  state: CanvasState,\n  scale: { widthScale: number; heightScale: number },"
);
fs.writeFileSync("src/adapters/mendixDataAdapter.ts", c);
console.log("fixed2");
