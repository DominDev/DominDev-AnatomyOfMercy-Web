import fs from "node:fs";
import path from "node:path";
import * as sass from "sass";

const inputDirectory = "src";
const outputDirectory = "dist";

function compileStyles() {
  const source = path.join(inputDirectory, "assets", "scss", "main.scss");
  const destination = path.join(outputDirectory, "assets", "css", "main.css");
  const result = sass.compile(source, {
    loadPaths: [path.dirname(source)],
    style: "compressed"
  });

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, result.css);
}

export default function configureEleventy(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "assets/js" });
  eleventyConfig.addPassthroughCopy({ "src/static": "." });
  eleventyConfig.addWatchTarget("src/assets/scss");
  eleventyConfig.on("eleventy.before", compileStyles);

  return {
    dir: {
      input: inputDirectory,
      output: outputDirectory,
      includes: "_includes",
      data: "_data"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
}

