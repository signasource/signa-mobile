<!--
última actualización: 2026-07-29
mantener al: agregar/cambiar un color, fuente, tamaño tipográfico o una primitiva de UI.
-->

# Design system

Doc pensado también para **Claude Design**. Regla base: **todo valor visual sale de un token de
`@/theme`**; no hardcodear hex ni nombres de fuente en las pantallas. Estilos con
`StyleSheet.create()` (no styled-components).

## Paleta (`src/theme/colors.ts`)

Importar: `import { colors } from "@/theme"`.

### Tokens vigentes (usar estos)

| Token | Hex | Uso |
|---|---|---|
| `colors.primary` | `#7857FF` | primario (violeta de marca) |
| `colors.primaryLight` | `#EEE8FF` | fondos suaves sobre primario |
| `colors.primaryDark` | `#5E3ED1` | primario presionado/énfasis |
| `colors.primaryMedallion` | `#E0D5FF` | fondo del `AuthIconBadge` |
| `colors.background` | `#FAF6F2` | fondo de pantalla |
| `colors.surface` | `#FFFFFF` | cards / superficies |
| `colors.fill` | `#F2ECE6` | relleno de campos y botones secundarios |
| `colors.fillDark` | `#EBE3DB` | relleno más marcado |
| `colors.text` | `#241A16` | texto principal (y fondo de `PrimaryButton`) |
| `colors.textMuted` | `#8C817A` | texto atenuado / subtítulos |
| `colors.onPrimary` | `#F5F0FF` | texto sobre primario |
| `colors.onDark` | `#FBF6F2` | texto sobre superficies oscuras |
| `colors.border` | `#ECE5DE` | bordes |
| `colors.success` | `#4CA65C` | éxito |
| `colors.warning` | `#FBBF24` | advertencia |
| `colors.danger` | `#E14E22` | error |

### Tokens legacy (NO usar en pantallas nuevas)

`accent`, `white`, `azulOscuro`, `blanco`, `morado`, `verde`, `amarillo`, `rosado`. Existen solo
para pantallas viejas (y `AppNavigator` usa `azulOscuro`/`white` en su header). Diseño nuevo →
usar los vigentes de arriba.

## Tipografía (`src/theme/typography.ts`)

Importar: `import { fonts, fontSizes } from "@/theme"`.

**Familias:**
- **Bricolage Grotesque** (títulos/display): `fonts.displaySemiBold`, `fonts.displayBold`,
  `fonts.displayExtraBold`.
- **Figtree** (cuerpo, labels, botones): `fonts.bodyRegular`, `fonts.bodyMedium`,
  `fonts.bodySemiBold`, `fonts.bodyBold`.
- Alias legacy (`headingRegular/Medium/SemiBold` → Figtree, `headingBold` → Bricolage Bold): solo
  para código existente.

**Tamaños (`fontSizes`):** `xs:12`, `sm:13`, `md:16`, `lg:20`, `xl:24`, `xxl:32`, `display:40`.

Las fuentes se cargan en `App.tsx` con `useFonts` (la app bloquea con loader hasta que estén
listas). Si agregás un peso nuevo, hay que registrarlo también ahí.

**Spacing:** no hay escala centralizada; los paddings/margins se definen por componente en su
`StyleSheet` (valores típicos 4–32). Padding horizontal de pantalla ~30px; el de las cards ~18px.

## Cómo se consume un token

```tsx
import { StyleSheet } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";

const styles = StyleSheet.create({
  title: { fontFamily: fonts.displaySemiBold, fontSize: fontSizes.xxl, color: colors.text },
  card: { backgroundColor: colors.surface, borderColor: colors.border },
});
```

## Catálogo de primitivas

### Genéricas (`src/components/`)

| Componente | Props principales | Uso |
|---|---|---|
| `Button` | `label, onPress, variant?("primary"\|"secondary"\|"outline"), loading?, disabled?, style?` | CTA genérico (fuera de auth) |
| `Input` | `label, error?` + `TextInputProps` | campo de formulario genérico |
| `Card` | `style?` + `ViewProps` | contenedor con sombra suave, radius 16 |
| `BackButton` | `onPress, visible?` | botón circular de volver |
| `FieldIcon` | `name(FieldIconName), size?, color?` | icono Ionicons outline usado en campos/badges |
| `SignaLogo` | `size?, barColor?, bgColor?` | logo (3 barras) |
| `OnboardingProgress` | `progress(0-1), onBack?` | barra de progreso de onboarding |

### De auth/onboarding (`src/components/auth/`, barrel `index.ts`)

| Componente | Props principales | Uso |
|---|---|---|
| `AuthScreen` | `children, onBack?, canGoBack?, contentStyle?` | **shell obligatorio** de pantallas de auth/onboarding: safe area, teclado, scroll, back |
| `AuthField` | `icon(FieldIconName), secure?, invalid?, error?, hint?, hintTone?, trailing?` + `TextInputProps` | input tipo píldora con icono, toggle de password y slot `trailing` (ej. ✓/✕ de disponibilidad) |
| `PrimaryButton` / `SecondaryButton` | `label, onPress, loading?, disabled?, style?` | CTA de auth (primario oscuro / secundario claro) |
| `AuthHeading` | `title, subtitle?, style?` | encabezado (Bricolage + subtítulo Figtree) |
| `AuthIconBadge` | `icon(FieldIconName)` | medallón con icono (Verify/Forgot/Reset) |
| `PasswordChecklist` | `rules(PasswordRules)` | checklist en vivo de reglas de password |
| `AuthDivider` / `AuthFooter` / `StatusText` | ver archivo | separador "o", footer con link, mensaje de estado/error |

**Iconos disponibles (`FieldIconName`):** `name, user, email, password, token, key, eye, eyeOff`
(mapeados a Ionicons outline en `FieldIcon`).

## Convenciones visuales

- Inputs con forma de **píldora** (radius ~16), fondo `colors.fill`; en error pasan a blanco con
  sombra + borde `danger`.
- **Cards** blancas con sombra sutil y radius 16.
- Botones con `minHeight` ~58, radius ~18; muestran `ActivityIndicator` con `loading`, opacidad
  reducida en `disabled`/press.
- Antes de crear un componente nuevo, revisá si una primitiva de esta tabla ya cubre el caso.
