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
  warningLight: "#FEF3D6",
  dangerLight: "#FBE0D8",

  // Gamification / profile palette
  streakOrange: "#FB8B24",
  gemsBlue: "#29B6E8",
  gemsBlueDark: "#1B84AB",
  courseTeal: "#2FA8A0",
  livesRed: "#E03B3B",
  infinitePink: "#E86AA6",
  successDark: "#2E7D45",
  successLight: "#E7F5EA",

  // Neutral grays (profile screen uses a pure-gray palette)
  neutral900: "#111111",
  neutral600: "#86868B",
  neutral200: "#E7E7E9",
  neutral100: "#F2F2F3",

  // Shop / tienda accent (Ámbar)
  shopAmber: "#DE7211",
  shopAmberDark: "#B85806",
  shopAmberLight: "#FBE4C8",

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
