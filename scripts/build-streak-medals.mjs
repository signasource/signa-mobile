// Generates one recoloured copy of the streak medal Lottie per milestone tier.
// Source: assets/animations/streak-medal-base.json (gold, as downloaded).
// Run: node scripts/build-streak-medals.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "assets/animations/streak-medal-base.json");
const outDir = join(root, "assets/animations/medals");

// Source tones → role. White (#ffffff) is the shine and is left untouched.
const ROLES = {
  "#ff9800": "deep",
  "#fbb03b": "mid",
  "#ffda00": "main",
  "#ffeba3": "light",
  "#fff8ba": "lightest",
};

const TIERS = {
  bronze: { deep: "#8a4b1f", mid: "#b8703a", main: "#d98c4f", light: "#efb88a", lightest: "#f8dcc2" },
  silver: { deep: "#7d8794", mid: "#a3adb9", main: "#c5ced8", light: "#e1e7ee", lightest: "#f3f6f9" },
  gold: { deep: "#ff9800", mid: "#fbb03b", main: "#ffda00", light: "#ffeba3", lightest: "#fff8ba" },
  sapphire: { deep: "#1d4ed8", mid: "#3b82f6", main: "#60a5fa", light: "#a8cdfc", lightest: "#dbeafe" },
  amethyst: { deep: "#6d28d9", mid: "#8b5cf6", main: "#a78bfa", light: "#cdbffc", lightest: "#ede9fe" },
  ruby: { deep: "#b91c1c", mid: "#ef4444", main: "#f87171", light: "#fbb0b0", lightest: "#fee2e2" },
};

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const toHex = (c) => "#" + c.slice(0, 3).map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");

function recolor(node, palette) {
  if (Array.isArray(node)) return node.forEach((n) => recolor(n, palette));
  if (node === null || typeof node !== "object") return;
  if ((node.ty === "fl" || node.ty === "st") && Array.isArray(node.c?.k) && typeof node.c.k[0] === "number") {
    const role = ROLES[toHex(node.c.k)];
    if (role) node.c.k = [...toRgb(palette[role]), node.c.k[3] ?? 1];
  }
  Object.values(node).forEach((v) => recolor(v, palette));
}

mkdirSync(outDir, { recursive: true });
for (const [tier, palette] of Object.entries(TIERS)) {
  const json = JSON.parse(readFileSync(src, "utf8"));
  recolor(json, palette);
  writeFileSync(join(outDir, `${tier}.json`), JSON.stringify(json));
  console.log("wrote", tier);
}
