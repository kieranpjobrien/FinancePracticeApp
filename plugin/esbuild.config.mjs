import esbuild from "esbuild";
import { existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Output directly to .obsidian/plugins/practice-app/
const outdir = resolve(__dirname, "../../.obsidian/plugins/practice-app");
if (!existsSync(outdir)) mkdirSync(outdir, { recursive: true });

const isWatch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: [resolve(__dirname, "src/main.ts")],
  bundle: true,
  outfile: resolve(outdir, "main.js"),
  format: "cjs",
  platform: "browser",
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  minify: !isWatch,
  sourcemap: isWatch ? "inline" : false,
  logLevel: "info",
});

if (isWatch) {
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
