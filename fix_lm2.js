const fs = require("fs");
let c = fs.readFileSync("src/domain/validationRules.ts", "utf8");
c = c.replace(
  "validateLoadMeters(items: CargoItem[], maxLoadMeters?: number, scale?: number)",
  "validateLoadMeters(items: CargoItem[], maxLoadMeters?: number, scale?: { widthScale: number; heightScale: number })"
);
fs.writeFileSync("src/domain/validationRules.ts", c);
console.log("fixed lm2");
