import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const outputDirectory = path.resolve(projectRoot, "dist");

if (path.dirname(outputDirectory) !== projectRoot || path.basename(outputDirectory) !== "dist") {
  throw new Error("Refusing to clean an unexpected directory.");
}

fs.rmSync(outputDirectory, { recursive: true, force: true });

