const fs = require("fs");
let c = fs.readFileSync("src/widget/LoadingCanvas.container.tsx", "utf8");
c = c.replace(
  "async (items: CargoItem[], currentScale: number)",
  "async (items: CargoItem[], currentScale: {widthScale:number;heightScale:number})"
);
fs.writeFileSync("src/widget/LoadingCanvas.container.tsx", c);
console.log("fixed save");
