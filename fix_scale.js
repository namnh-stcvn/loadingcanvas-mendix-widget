const fs = require("fs");
let c = fs.readFileSync("src/adapters/mendixDataAdapter.ts", "utf8");
c = c.replace("scale: 1, truckGuid", "scale: { widthScale: 1, heightScale: 1 }, truckGuid");
fs.writeFileSync("src/adapters/mendixDataAdapter.ts", c);
console.log("fixed");
