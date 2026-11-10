import { GoogleSignin, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";

let configured = false;

function configure() {
  if (configured) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) throw new Error("Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID");
  // webClientId = audience que valida signa-api (GOOGLE_CLIENT_ID); sin él no hay idToken.
  GoogleSignin.configure({ webClientId });
  configured = true;
}

export interface GoogleIdentity {
  idToken: string;
  name: string | null;
}

/**
 * Abre el selector de cuentas de Google y devuelve el ID token que espera `POST /auth/google`.
 * Devuelve `null` si el usuario canceló.
 */
export async function signInWithGoogle(): Promise<GoogleIdentity | null> {
  configure();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Cerrar la sesión previa fuerza el selector de cuentas en vez de reusar la última.
    await GoogleSignin.signOut().catch(() => undefined);
    const res = await GoogleSignin.signIn();
    if (res.type !== "success") return null;
    const idToken = res.data.idToken;
    if (!idToken) throw new Error("Google no devolvió idToken");
    return { idToken, name: res.data.user.givenName ?? res.data.user.name ?? null };
  } catch (err) {
    if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) return null;
    throw err;
  }
}
