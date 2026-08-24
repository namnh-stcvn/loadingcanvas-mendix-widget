const fs = require("fs");
let c = fs.readFileSync("src/domain/validationRules.ts", "utf8");
c = c.replace("scale.widthScale.widthScale", "scale.widthScale");
fs.writeFileSync("src/domain/validationRules.ts", c);
console.log("fixed arithmetic2");
