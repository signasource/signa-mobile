export const colors = {
  // Brand
  primary: "#7857FF",
  primaryLight: "#EEE8FF",
  primaryDark: "#5E3ED1",
  primaryMedallion: "#E0D5FF",

  // Surfaces
  background: "#FAF6F2",
  surface: "#FFFFFF",
  fill: "#F2ECE6",
  fillDark: "#EBE3DB",

  // Text
  text: "#241A16",
  onPrimary: "#F5F0FF",
  onDark: "#FBF6F2",
  textMuted: "#8C817A",

  // Borders
  border: "#ECE5DE",

  // Semantic
  success: "#4CA65C",
  warning: "#FBBF24",
  danger: "#E14E22",

  // Legacy aliases kept for existing app screens
  accent: "#7857FF",
  white: "#FFFFFF",
  azulOscuro: "#241A16",
  blanco: "#FAF6F2",
  morado: "#7857FF",
  verde: "#34D339",
  amarillo: "#FBBF24",
  rosado: "#7857FF",
};

export type ColorKey = keyof typeof colors;
