import { jwtDecode } from "jwt-decode";

/**
 * Confirmado contra JwtService.java: el token SOLO lleva
 *   subject   -> user.getUsername() (el username de Spring Security,
 *                que en este back es el email, ya que login es email+password
 *                y CustomUserDetailsService presumiblemente carga por email)
 *   issuedAt
 *   expiration
 *
 * No hay claims de role, id ni name. Por eso el "perfil" que puede sacarse
 * del token es SOLO el email. Ver src/context/AuthContext.tsx y
 * src/utils/profileCache.ts para como se completa el nombre (cache local,
 * no viene del back) mientras no exista un endpoint real de perfil.
 */
interface SignaJwtClaims {
  sub: string; // email
  iat: number;
  exp: number;
}

export function extractEmailFromToken(accessToken: string): string {
  return jwtDecode<SignaJwtClaims>(accessToken).sub;
}

export function isTokenExpired(accessToken: string): boolean {
  try {
    const { exp } = jwtDecode<SignaJwtClaims>(accessToken);
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}
