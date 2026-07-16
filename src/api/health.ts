import axios from "axios";
import { API_URL } from "./client";

/**
 *  no hay un endpoint de health explicito. Este helper pega directo
 * a la raiz de la API para verificar que responde algo
 * 
 */
export async function pingBackend(): Promise<{ reachable: boolean; status?: number; detail: string }> {
  try {
    const response = await axios.get(API_URL, { timeout: 5000, validateStatus: () => true });
    return {
      reachable: true,
      status: response.status,
      detail: `Respuesta HTTP ${response.status} desde ${API_URL}`,
    };
  } catch (err: any) {
    return {
      reachable: false,
      detail: err?.message ?? "No se pudo conectar al backend",
    };
  }
}
