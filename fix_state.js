const fs = require("fs");
let c = fs.readFileSync("src/widget/LoadingCanvas.container.tsx", "utf8");
c = c.replace(
  "const [scale, setScale] = useState(1);",
  "const [scale, setScale] = useState({widthScale:1,heightScale:1});"
);
fs.writeFileSync("src/widget/LoadingCanvas.container.tsx", c);
console.log("fixed state");
