# Prompt para Claude Design — logros con la moneda de Signa

**Archivos a adjuntar:** `coin-base.svg` (moneda base), `coin-base.png` (referencia visual) y los SVG
de Phosphor que correspondan a cada logro (estilo **fill**, ver `icons/`).

---

## Prompt (copiar y pegar)

Adjunto `coin-base.svg`, la moneda de logros de Signa (app para aprender Lengua de Señas Argentina),
y los iconos de Phosphor (estilo *fill*) de cada logro nuevo.

**Objetivo:** crear una moneda por logro, todas con la misma moneda de base, pero con el icono del
logro **tallado/grabado** en el centro en lugar de la llama.

**Reglas de la moneda (no negociables):**
1. No cambies la forma, el tamaño ni el viewBox (`0 0 300 300`). Conservá los grupos y sus `id`:
   `coin`, `emblem`, `sparkles`, `gloss` y `shine`.
2. Lo único que cambia entre logros es el contenido de `<g id="emblem">` (y, si el logro lo pide,
   los colores del grupo `coin`).
3. El grupo `shine` y su `clip-path="url(#coin-clip)"` quedan **idénticos** y siempre al final del
   SVG. La app anima únicamente ese grupo (un destello diagonal que cruza la moneda), así que no le
   pongas animaciones propias ni lo muevas.
4. No uses `<image>`, fuentes ni filtros raster: solo `path`, `circle`, `rect`, gradientes y
   `clipPath`. Todo vectorial, sin texto.

**Cómo grabar el icono (efecto tallado):**
- Centrado en (150,150), ocupando ~55 % del diámetro de la cara (≈140 unidades de ancho).
- Usá el path del icono de Phosphor tal cual, sin redibujarlo ni deformarlo; solo escalalo y
  centralo.
- Efecto relieve con capas del mismo path: (a) una copia 2 unidades abajo/derecha en tono más
  claro que la cara (luz del borde), (b) el relieve principal en un tono un poco más oscuro que la
  cara (hundido), (c) una copia 1,5 unidades arriba/izquierda más oscura (sombra interior).
  Los tres tonos salen de la paleta de la moneda, no del icono.
- Que se lea bien a 48 px: nada de detalles más finos que 2 unidades.

**Paleta base (dorada):** borde `#FFEBA3`, cara `#FFDA00`, relieve claro `#FFF8BA`,
relieve oscuro `#FBB03B` (llama) y `#FF9800` (sombra). Si un logro pide otro metal (bronce, plata, zafiro, amatista, rubí),
recoloreá solo `coin` y los tonos del relieve manteniendo la misma relación de luz/sombra.

**Entrega:** un SVG por logro, nombrado `coin-<code>.svg`, más una hoja de contacto con todos
juntos sobre fondo oscuro y otro claro para verificar contraste.

**Logros (vienen de `signa-api` → `db/seed/achievements.sql`):**

| code (= nombre del archivo en `icons/`) | Logro | Icono Phosphor | Metal |
|---|---|---|---|
| FIRST_LESSON | Primera lección | `book-open` | bronce |
| LESSONS_25 | Alumno dedicado | `books` | plata |
| LESSONS_50 | Estudiante avanzado | `student` | oro |
| LESSONS_100 | Veterano | `medal` | rubí |
| COURSE_MASTER | Primer curso | `graduation-cap` | plata |
| COURSES_3 | Formación continua | `certificate` | oro |
| XP_GRINDER | Primeros pasos | `lightning` | bronce |
| XP_5000 | Aprendiz | `rocket-launch` | plata |
| XP_25000 | Experto | `star` | oro |
| XP_100000 | Maestro | `crown` | rubí |
| WEEKLY_XP_1000 | Semana productiva | `calendar-check` | plata |
| WEEKLY_XP_3000 | Semana intensa | `target` | oro |
| FIRST_FRIEND | Primer amigo | `user-plus` | bronce |
| FIRST_GIFT | Primer regalo | `gift` | bronce |
| GIFT_GIVER | Usuario solidario | `hand-heart` | plata |
| FIRST_PURCHASE | Primera compra | `shopping-bag` | bronce |
| SHOP_5 | Cliente frecuente | `storefront` | plata |

Las rachas (3–100 días) ya tienen sus medallas con la llama y quedan afuera. Salida: `coin-<code en minúsculas>.svg`.

---

## Notas para quien integre los SVG en la app

- En React Native los SVG se renderizan con `react-native-svg`; las animaciones SMIL/CSS dentro del
  archivo **no** corren. El destello se anima por código sobre `#shine-band` (translateX de -260 a
  +260, ~1,2 s, repetido cada ~4 s) con Reanimated.
- `#emblem` debe quedar siempre como un grupo independiente para poder recolorear o reemplazar.
