const fs = require("fs");
let c = fs.readFileSync("src/widget/LoadingCanvas.container.tsx", "utf8");
c = c.replace("scale === 1", "scale.widthScale === 1");
fs.writeFileSync("src/widget/LoadingCanvas.container.tsx", c);
console.log("fixed compare");
