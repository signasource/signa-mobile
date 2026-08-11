import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Ni AuthResponse ni el JWT incluyen el "name" del usuario, y la sesion
 * (AuthContext) se arma decodificando el JWT sin llamar a la API. Por eso
 * el nombre solo se conoce cuando el usuario lo escribe en el registro
 * (RegisterRequest.name).
 *
 * Este cache local (AsyncStorage, no es informacion sensible) guarda ese
 * nombre asociado al email para mostrarlo despues del login en el mismo
 * dispositivo. En un dispositivo nuevo (o tras borrar la app) el greeting
 * cae al email como fallback.
 *
 * Nota: el back SI expone GET /users/me (perfil completo, incl. username);
 * ProfileScreen lo usa. Migrar la sesion a ese endpoint volveria innecesario
 * este cache (ver docs/status.md).
 */
const NAME_CACHE_PREFIX = "signa_name_cache:";

export const profileCache = {
  async setName(email: string, name: string): Promise<void> {
    await AsyncStorage.setItem(`${NAME_CACHE_PREFIX}${email}`, name);
  },
  async getName(email: string): Promise<string | null> {
    return AsyncStorage.getItem(`${NAME_CACHE_PREFIX}${email}`);
  },
};
