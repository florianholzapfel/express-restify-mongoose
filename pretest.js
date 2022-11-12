import { readFile, writeFile } from "fs/promises";

const packageJSON = await readFile("./package.json", "utf8");

await writeFile(
  "./package.json",
  packageJSON.replace('"type": "module",', ""),
  "utf8"
);
