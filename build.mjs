// Builds the site GitHub Pages serves: the viewer in site/, each app's icon, and
// index.json, which LOKI reads too. Any entry LOKI would refuse fails the build,
// so a bad merge never replaces the live list. Run it with `node build.mjs`.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = "_site";
const FIELDS = ["id", "name", "description", "source", "version", "url", "sha256", "size", "sdk", "capabilities"];
const REQUIRED = ["id", "name", "version", "url", "sha256", "size", "sdk"];
const CAPABILITIES = ["database", "uploads", "forms", "storage", "realtime"];
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const HTTPS = /^https:\/\/\S{1,2040}$/;
const MAX_PACKAGE = 536870912, MAX_ICON = 256 * 1024;

function check(dir, entry) {
  const problems = [];
  for (const key of Object.keys(entry)) if (!FIELDS.includes(key)) problems.push(`unknown field "${key}"`);
  for (const key of REQUIRED) if (entry[key] === undefined) problems.push(`missing "${key}"`);
  if (problems.length) return problems;
  if (entry.id !== dir) problems.push(`the folder must be named "${entry.id}"`);
  if (!ID.test(entry.id) || entry.id.startsWith("loki-")) problems.push("invalid id");
  if (typeof entry.name !== "string" || !entry.name || entry.name.length > 100) problems.push("the name must be 1 to 100 characters");
  if (entry.description !== undefined && (typeof entry.description !== "string" || entry.description.length > 2000)) problems.push("the description must be at most 2000 characters");
  if (entry.source && !HTTPS.test(entry.source)) problems.push("the source must be an https:// link");
  if (!SEMVER.test(entry.version)) problems.push("the version is not a semantic version");
  if (!SEMVER.test(entry.sdk)) problems.push("the sdk is not a semantic version");
  if (!HTTPS.test(entry.url)) problems.push("the url must be an https:// link");
  if (!/^[0-9a-f]{64}$/.test(entry.sha256)) problems.push("the sha256 must be 64 lowercase hex digits");
  if (!Number.isInteger(entry.size) || entry.size < 1 || entry.size > MAX_PACKAGE) problems.push("the size must be 1 byte to 512 MiB");
  const caps = entry.capabilities ?? [];
  if (!Array.isArray(caps) || caps.some(c => !CAPABILITIES.includes(c)) || new Set(caps).size !== caps.length) problems.push("unknown or repeated capability");
  return problems;
}

/** A square PNG, 64 to 1024 pixels on a side, up to 256 KiB. */
function checkIcon(path) {
  if (statSync(path).size > MAX_ICON) return "icon.png exceeds 256 KiB";
  const bytes = readFileSync(path);
  const png = bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && bytes.toString("latin1", 12, 16) === "IHDR";
  if (!png) return "icon.png is not a PNG";
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (width !== height || width < 64 || width > 1024) return `icon.png must be square, 64 to 1024 pixels (it is ${width}×${height})`;
  return "";
}

const apps = [], failures = [];
for (const dir of readdirSync("apps").sort()) {
  const folder = join("apps", dir);
  if (!statSync(folder).isDirectory()) { failures.push(`${folder}: apps/ may contain only app folders`); continue; }
  const files = readdirSync(folder);
  const extra = files.filter(f => f !== "app.json" && f !== "icon.png");
  if (extra.length) { failures.push(`${folder}: unexpected ${extra.join(", ")}`); continue; }
  let entry;
  try { entry = JSON.parse(readFileSync(join(folder, "app.json"), "utf8")); }
  catch (error) { failures.push(`${folder}/app.json: ${error.code === "ENOENT" ? "missing" : "not valid JSON"}`); continue; }
  const problems = check(dir, entry);
  const hasIcon = files.includes("icon.png");
  if (hasIcon) { const problem = checkIcon(join(folder, "icon.png")); if (problem) problems.push(problem); }
  if (problems.length) { failures.push(`${folder}: ${problems.join("; ")}`); continue; }
  apps.push({ ...entry, description: entry.description ?? "", source: entry.source ?? "", capabilities: entry.capabilities ?? [], ...(hasIcon ? { icon: `apps/${dir}/icon.png` } : {}) });
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

apps.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
rmSync(OUT, { recursive: true, force: true });
cpSync("site", OUT, { recursive: true });
for (const app of apps) {
  if (!app.icon) continue;
  mkdirSync(join(OUT, "apps", app.id), { recursive: true });
  cpSync(app.icon, join(OUT, app.icon));
}
writeFileSync(join(OUT, "index.json"), JSON.stringify({ registry: 1, generated: new Date().toISOString(), apps }));
if (!existsSync(join(OUT, "index.html"))) throw new Error("site/index.html is missing");
console.log(`${apps.length} app${apps.length === 1 ? "" : "s"} written to ${OUT}/index.json`);
