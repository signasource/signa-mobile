import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * El back no devuelve el "name" del usuario en NINGUN lado: ni AuthResponse
 * ni el JWT lo incluyen, y no existe GET /users/me. El unico momento en que
 * el front conoce el nombre es cuando el propio usuario lo escribe en el
 * formulario de registro (RegisterRequest.name).
 *
 * Este cache local (AsyncStorage, no es informacion sensible) guarda ese
 * nombre asociado al email para poder mostrarlo despues del login, en el
 * mismo dispositivo. Si el usuario se loguea en un dispositivo nuevo, o
 * borra la app, no vamos a tener el nombre hasta que el back exponga un
 * endpoint real de perfil - en ese caso la UI cae al email como fallback.
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
