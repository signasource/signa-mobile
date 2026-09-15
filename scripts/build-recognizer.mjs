/**
 * Compila el motor de inferencia (TypeScript) al bundle que carga el WebView.
 *
 * El motor vive en `src/features/ml/engine/*.ts` y es la única fuente de
 * verdad: tiene tipos y lo cubre `verify-sign-model.mjs` contra Keras. El
 * WebView no puede importar TS, así que se genera `assets/mediapipe/engine.jsasset`
 * a partir de esos mismos archivos.
 *
 *   node scripts/build-recognizer.mjs
 *
 * (extensión `.jsasset` para que Metro lo copie en vez de transformarlo.)
 *
 * El archivo generado se versiona (lo necesita el bundle de la app), pero NO se
 * edita a mano: cualquier cambio va en el .ts y se regenera acá.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const OUT = "assets/mediapipe/engine.jsasset";

// El HTML del reconocedor vive dentro de un template literal: un backtick
// suelto ahí adentro (hasta en un comentario) corta el string y rompe el
// archivo de formas confusas. Ya pasó dos veces, así que se chequea acá.
// Y como nada compila ese HTML, un error de sintaxis adentro tampoco rompe el
// build: rompe la página en el teléfono y en silencio, porque el módulo entero
// deja de correr. También se valida acá.
let moduloPagina = "", moduloWorker = "";
{
  const src = fs.readFileSync("src/features/ml/engine/recognizerHtml.ts", "utf8");
  const i = src.indexOf("return `<!doctype html>");
  const j = src.lastIndexOf("`;");
  const html = src.slice(i + "return `".length, j);
  if (html.includes("`")) {
    console.error("ERROR: hay un backtick dentro del template HTML de recognizerHtml.ts");
    process.exit(1);
  }
  const modulo = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  if (!modulo) {
    console.error("ERROR: no se encontró el script del módulo en recognizerHtml.ts");
    process.exit(1);
  }
  const f = path.join(os.tmpdir(), "signa-recognizer-check.mjs");
  moduloPagina = modulo[1].replace(/\$\{[^}]*\}/g, "0");
  fs.writeFileSync(f, moduloPagina);
  try {
    execSync(`node --check ${f}`, { stdio: "inherit" });
  } catch {
    console.error("ERROR: el script de recognizerHtml.ts no es JavaScript válido");
    process.exit(1);
  }
}

// El worker es otro archivo escrito a mano dentro de un template literal, con
// el mismo problema: si tiene un error de sintaxis, falla en el teléfono.
{
  const src = fs.readFileSync("src/features/ml/engine/detectorWorker.ts", "utf8");
  const i = src.indexOf("export const DETECTOR_WORKER = `");
  const j = src.lastIndexOf("`;");
  const f = path.join(os.tmpdir(), "signa-worker-check.mjs");
  moduloWorker = src.slice(src.indexOf("`", i) + 1, j);
  fs.writeFileSync(f, moduloWorker);
  try {
    execSync(`node --check ${f}`, { stdio: "inherit" });
  } catch {
    console.error("ERROR: detectorWorker.ts no es JavaScript válido");
    process.exit(1);
  }
}

// Y un paso más: node --check ve la sintaxis pero no si una función existe.
// Ya pasó dos veces que un borrado se llevara puesto algo que seguía en uso y
// el error apareciera recién en el teléfono ("X is not defined"). tsc con
// --checkJs encuentra justamente eso; del resto de sus quejas no hacemos caso,
// porque este archivo no está tipado.
for (const [nombre, codigo] of [["pagina", moduloPagina], ["worker", moduloWorker]]) {
  const f = path.join(os.tmpdir(), `signa-${nombre}-nombres.ts`);
  fs.writeFileSync(f, "declare const tf: any; declare const tflite: any;\n" + codigo);
  let salida = "";
  try {
    execSync(`npx tsc --noEmit --allowJs --checkJs --lib dom,es2020 --target es2020 ${f}`,
      { stdio: "pipe" });
  } catch (e) {
    salida = String(e.stdout || "");
  }
  const noExisten = salida.split("\n").filter((l) => l.includes("TS2304"));
  if (noExisten.length) {
    console.error(`ERROR: en el ${nombre} se usa algo que no existe:`);
    for (const l of noExisten) console.error("  " + l.replace(f, nombre));
    process.exit(1);
  }
}

const tmp = fs.mkdtempSync("/tmp/signa-engine-");

execSync(
  `npx tsc src/features/ml/engine/keypoints.ts ` +
    `--outDir ${tmp} --target es2020 --module es2020 --moduleResolution node --removeComments false --skipLibCheck`,
  { stdio: "inherit" },
);

// Se concatenan en un solo ES module: el WebView carga un archivo, no dos, y
// así no hay que resolver imports relativos desde file://.
//
// La lista de exports se deriva del propio código y no se escribe a mano. Estaba
// a mano y quedó nombrando a `SignModel` después de que el modelo en JS se
// borrara: el módulo dejó de evaluar con "export 'SignModel' is not defined in
// module" y se llevó puestos los dos ejercicios de cámara, porque la página
// importa esto antes de elegir qué modelo usa.
const FUENTES = ["keypoints.js"];
const exportados = [];

const partes = FUENTES.map((f) => {
  const src = fs.readFileSync(path.join(tmp, f), "utf8");
  for (const m of src.matchAll(
    /^export\s+(?:const|let|var|function|class)\s+([A-Za-z0-9_$]+)/gm,
  )) {
    exportados.push(m[1]);
  }
  return src
    // Fuera los import/export entre los propios módulos; quedan en el mismo scope.
    .replace(/^import .*$/gm, "")
    .replace(/^export /gm, "");
});

if (!exportados.length) {
  console.error("ERROR: no se encontró ningún export en " + FUENTES.join(", "));
  process.exit(1);
}

const cabecera = `// GENERADO por scripts/build-recognizer.mjs — no editar a mano.
// Fuente: src/features/ml/engine/${FUENTES.map((f) => f.replace(/\.js$/, ".ts")).join(", ")}
`;
const pie = `
export { ${exportados.join(", ")} };
`;

fs.writeFileSync(OUT, cabecera + partes.join("\n") + pie);

// Evaluar el módulo, no sólo parsearlo.
//
// `node --check` no alcanza: exportar un nombre que no existe es un error de
// enlazado, no de sintaxis, así que pasa el parser y revienta recién cuando el
// WebView instancia el módulo — o sea, en el teléfono, con la cámara abierta.
// keypoints.ts no toca el DOM, así que node puede evaluarlo tal cual.
try {
  execSync(`node --input-type=module --eval "$(cat ${OUT})"`, {
    stdio: "pipe",
    shell: "/bin/bash",
  });
} catch (e) {
  console.error("ERROR: el módulo generado no evalúa.");
  console.error(String(e.stderr || e).split("\n").slice(0, 6).join("\n"));
  process.exit(1);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${OUT} · ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB`);
