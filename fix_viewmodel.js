const fs = require("fs");
let c = fs.readFileSync("src/viewModels/LoadingCanvasViewModel.ts", "utf8");
c = c.replace("scale: number", "scale: { widthScale: number; heightScale: number }");
fs.writeFileSync("src/viewModels/LoadingCanvasViewModel.ts", c);
console.log("fixed viewmodel");
