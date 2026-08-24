const fs = require("fs");
let c = fs.readFileSync("src/adapters/mendixDataAdapter.ts", "utf8");
c = c.replace("deserializePlan(planData, scale)", "deserializePlan(planData, scale.widthScale)");
c = c.replace("serializePlan(state, scale)", "serializePlan(state, scale.widthScale)");
fs.writeFileSync("src/adapters/mendixDataAdapter.ts", c);
console.log("fixed3");
