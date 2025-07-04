// scripts/add-shebang.ts
import fs from "fs";
const filePath = "dist/bin/index.js";
const shebang = "#!/usr/bin/env node\n";

const content = fs.readFileSync(filePath, "utf-8");
if (!content.startsWith(shebang)) {
  fs.writeFileSync(filePath, shebang + content);
}
