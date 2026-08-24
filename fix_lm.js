const fs = require("fs");
let c = fs.readFileSync("src/domain/validationRules.ts", "utf8");
c = c.replace(
  "validateLoadMeters(items, options.maxLoadMeters, options.scale)",
  "validateLoadMeters(items, options.maxLoadMeters, options.scale.widthScale)"
);
fs.writeFileSync("src/domain/validationRules.ts", c);
console.log("fixed lm");
