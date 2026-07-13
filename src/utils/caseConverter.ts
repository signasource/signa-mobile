/**
 * signa-api serializa TODO en snake_case (confirmado via curl a /auth/login:
 * devuelve "access_token"/"refresh_token", no "accessToken"/"refreshToken").
 * Esto es casi seguro una ObjectMapper/PropertyNamingStrategy global en
 * JacksonConfig.java, asi que aplica a TODOS los endpoints, no solo auth.
 *
 * En vez de escribir cada tipo/DTO en snake_case (feo de usar en TS) y tener
 * que acordarse en cada request/response, se convierte automaticamente en
 * un solo lugar: src/api/client.ts intercepta cada response (snake_case ->
 * camelCase) y cada request (camelCase -> snake_case) usando estas funciones.
 */

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamelCase(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function deepConvertKeys(value: unknown, convertKey: (key: string) => string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => deepConvertKeys(item, convertKey));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [convertKey(key), deepConvertKeys(val, convertKey)])
    );
  }
  return value;
}

export function keysToSnakeCase<T = unknown>(value: unknown): T {
  return deepConvertKeys(value, toSnakeCase) as T;
}

export function keysToCamelCase<T = unknown>(value: unknown): T {
  return deepConvertKeys(value, toCamelCase) as T;
}
