// Builds one weekly critique gallery from a manifest, for the LWZ Admin "Critiques" tab.
// Usage (repo root): node tools/critique/build-critique.mjs <manifest.json>
// Manifest: { "slug": "2026-11-17-what-am-i", "title": "...", "start": "2026-11-10", "end": "2026-11-17",
//             "photos": [ { "src": "/path/to/file.jpg", "student": "First Last", "title": "Photo title" } ] }
// Writes critique/<slug>/NN.jpg (max 2400 px, JPG) + data.json and adds the week to critique/index.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";

const m = JSON.parse(readFileSync(process.argv[2], "utf8"));
if (!/^[a-z0-9-]+$/.test(m.slug)) throw new Error("slug: lowercase letters, numbers and dashes only");
const dir = `critique/${m.slug}`;
if (existsSync(dir)) rmSync(dir, { recursive: true });
mkdirSync(dir, { recursive: true });

const photos = m.photos.map((p, i) => {
  const file = String(i + 1).padStart(2, "0") + ".jpg";
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "86", "-Z", "2400", p.src, "--out", `${dir}/${file}`], { stdio: "ignore" });
  const [w, h] = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", `${dir}/${file}`], { encoding: "utf8" })
    .match(/\d+$/gm).map(Number);
  return { file, w, h, student: p.student, title: p.title || "" };
});
const week = { slug: m.slug, title: m.title, start: m.start, end: m.end, count: photos.length,
  students: [...new Set(photos.map(p => p.student))].length, built: new Date().toISOString() };
writeFileSync(`${dir}/data.json`, JSON.stringify({ ...week, photos }, null, 2) + "\n");

const idxPath = "critique/index.json";
const idx = existsSync(idxPath) ? JSON.parse(readFileSync(idxPath, "utf8")) : { weeks: [] };
idx.weeks = [week, ...idx.weeks.filter(w => w.slug !== m.slug)].sort((a, b) => b.end.localeCompare(a.end));
writeFileSync(idxPath, JSON.stringify(idx, null, 2) + "\n");
console.log(`critique/${m.slug}: ${photos.length} photographs from ${week.students} students`);
