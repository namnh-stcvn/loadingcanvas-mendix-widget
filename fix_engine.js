const fs = require("fs");
let c = fs.readFileSync("src/engines/ValidationEngine.ts", "utf8");
c = c.replace("scale?: number", "scale?: { widthScale: number; heightScale: number }");
fs.writeFileSync("src/engines/ValidationEngine.ts", c);
console.log("fixed engine");
