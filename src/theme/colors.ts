/**
 * Paleta provista para las pruebas de conexion front-back.
 * NOTA: "BLANCO #F78FB" tenia un digito hex faltante (no es un color valido de 6 digitos).
 * Se interpreto como un blanco/hueso cercano (#F7F8FB). Ajustar aqui si el valor real era otro.
 */
export const colors = {
  morado: "#7455F7",
  verde: "#34D339",
  amarillo: "#FBBF24",
  rosado: "#F47643",
  azulOscuro: "#1D283C",
  blanco: "#F7F8FB", // ver nota arriba

  // Alias semanticos para usar en componentes
  primary: "#7455F7",
  success: "#34D339",
  warning: "#FBBF24",
  accent: "#F47643",
  background: "#F7F8FB",
  text: "#1D283C",
  textMuted: "#5B6478",
  danger: "#E03131",
  white: "#FFFFFF",
  border: "#E2E4EC",
};

export type ColorKey = keyof typeof colors;
