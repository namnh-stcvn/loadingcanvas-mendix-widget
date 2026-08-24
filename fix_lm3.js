const fs = require("fs");
let c = fs.readFileSync("src/domain/validationRules.ts", "utf8");
c = c.replace(
  "function validateLoadMeters(items: CargoItem[], maxLoadMeters?: number, scale?: number)",
  "function validateLoadMeters(items: CargoItem[], maxLoadMeters?: number, scale?: { widthScale: number; heightScale: number })"
);
fs.writeFileSync("src/domain/validationRules.ts", c);
console.log("fixed lm3");
