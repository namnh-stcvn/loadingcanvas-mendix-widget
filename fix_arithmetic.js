const fs = require("fs");
let c = fs.readFileSync("src/domain/validationRules.ts", "utf8");
c = c.replace("item.width / scale", "item.width / scale.widthScale");
fs.writeFileSync("src/domain/validationRules.ts", c);
console.log("fixed arithmetic");
