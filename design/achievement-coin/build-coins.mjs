// Builds one coin SVG per achievement: coin-base.svg + a Phosphor "fill" icon carved in the centre.
// Run from the repo root: node design/achievement-coin/build-coins.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const base = readFileSync(join(dir, "coin-base.svg"), "utf8");

// Same palettes as scripts/build-streak-medals.mjs, so coins match the streak medals.
// rim = light, face = main. The carved icon uses the rim colour exactly.
const METALS = {
  bronze: { deep: "#8a4b1f", mid: "#b8703a", main: "#d98c4f", light: "#efb88a", lightest: "#f8dcc2" },
  silver: { deep: "#7d8794", mid: "#a3adb9", main: "#c5ced8", light: "#e1e7ee", lightest: "#f3f6f9" },
  gold: { deep: "#ff9800", mid: "#fbb03b", main: "#ffda00", light: "#ffeba3", lightest: "#fff8ba" },
  ruby: { deep: "#b91c1c", mid: "#ef4444", main: "#f87171", light: "#fbb0b0", lightest: "#fee2e2" },
};

const ACHIEVEMENTS = {
  FIRST_LESSON: "bronze", LESSONS_25: "silver", LESSONS_50: "gold", LESSONS_100: "ruby",
  COURSE_MASTER: "silver", COURSES_3: "gold",
  XP_GRINDER: "bronze", XP_5000: "silver", XP_25000: "gold", XP_100000: "ruby",
  WEEKLY_XP_1000: "silver", WEEKLY_XP_3000: "gold",
  FIRST_FRIEND: "bronze", FIRST_GIFT: "bronze", GIFT_GIVER: "silver",
  FIRST_PURCHASE: "bronze", SHOP_5: "silver",
};

const ICON_SIZE = 148; // rendered size of Phosphor's 256 box (content ≈ 130 units ≈ 52% of the 252 face)
const k = ICON_SIZE / 256;
const off = (300 - ICON_SIZE) / 2;
const group = (id, inner) => new RegExp(`<g id="${id}">[\s\S]*?\n  </g>\n`);

// App-ready copies (no #shine, no defs): the app draws the animated shine itself, see
// src/features/achievements/components/AchievementCoin.tsx.
const appDir = join(dir, "../../assets/achievements/coins");
mkdirSync(join(dir, "coins"), { recursive: true });
mkdirSync(appDir, { recursive: true });
for (const [code, metal] of Object.entries(ACHIEVEMENTS)) {
  const p = METALS[metal];
  const d = readFileSync(join(dir, "icons", `${code}.svg`), "utf8").match(/<path d="([^"]+)"/)[1];
  const icon = (dx, dy, fill) =>
    `<path transform="translate(${off + dx} ${off + dy}) scale(${k})" d="${d}" fill="${fill}"/>`;

  let svg = base;
  // Recolour coin group (rim, face). Only those two hexes exist outside the emblem.
  svg = svg.replace(/(<g id="coin">[\s\S]*?<\/g>)/, (m) => m.replaceAll("#FFEBA3", p.light).replaceAll("#FFDA00", p.main));
  // Emblem: shadow below, then the icon in the exact rim colour.
  svg = svg.replace(
    /<g id="emblem">[\s\S]*?\n  <\/g>\n/,
    `<g id="emblem">\n    ${icon(1.5, 2, p.deep)}
    ${icon(3.5, 4.5, p.deep)}\n    ${icon(0, 0, p.light)}\n  </g>\n`,
  );
  // Sparkles were placed around the flame; they would collide with other icons.
  svg = svg.replace(/  <!-- SPARKLES[\s\S]*?<\/g>\n\n/, "");
  svg = svg.replace("Signa achievement coin (base)", `Signa achievement coin — ${code} (${metal})`);
  writeFileSync(join(dir, "coins", `coin-${code.toLowerCase()}.svg`), svg);
  const appSvg = svg
    .replace(/  <defs>[\s\S]*?<\/defs>\n\n/, "")
    .replace(/\n  <!-- SHINE[\s\S]*?<\/g>\n  <\/g>\n/, "\n");
  writeFileSync(join(appDir, `${code}.svg`), appSvg);
}
console.log("wrote", Object.keys(ACHIEVEMENTS).length, "coins");
