import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useCameraPermissions } from "expo-camera";

import { colors, fonts } from "@/theme";
import { marcar } from "./telemetria";
import { PerformSignBlock } from "@/features/courses/components/lesson/blocks/PerformSignBlock";
import { SpellNameBlock } from "@/features/courses/components/lesson/blocks/SpellNameBlock";
import { SignAnimation } from "@/features/courses/components/lesson/SignAnimation";
import { AvatarNativo, estres, FrameNativo, golden, ReconocedorNativo, ultimaSalida } from "../../../modules/signa-vision";

/**
 * TEMPORAL — etapa 1 de la migración a nativo.
 *
 * Muestra la cámara y el esqueleto dibujados enteramente del lado nativo, para
 * poder comparar contra la versión en WebView con las dos cosas que importan:
 * el número y la sensación. Las medianas que informa se comparan contra lo
 * medido en este mismo teléfono con la versión actual:
 *
 *     estático   manos  57 ms · pose 41 ms · 10 fps
 *     dinámico   manos 147 ms · pose 92 ms ·  6 fps
 *
 * Usa el Text de React Native y no el de la app: esto se monta antes que los
 * proveedores de contexto.
 */
/** Base de los .glb de prueba, servidos desde la máquina de desarrollo. */
const PRUEBA_GLB = process.env.EXPO_PUBLIC_GLB_PRUEBA ?? "";

export function BancoNativoPantalla({ onSeguir }: { onSeguir: () => void }) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [ultimo, setUltimo] = useState<FrameNativo | null>(null);
  const [estado, setEstado] = useState("arrancando…");
  const [contraste, setContraste] = useState("tocá para contrastar contra Python");
  // Se muestra EN PANTALLA además de mandarse: si la app se cierra en casa del
  // usuario y el colector no está a mano, esto es lo único que queda.
  const [salida, setSalida] = useState("");
  // El ejercicio real, montado suelto: es la única forma de probarlo sin
  // completar cinco lecciones para desbloquear la que lo contiene.
  // "senas" es el ejercicio dinámico y "letras" el del abecedario: son los dos
  // modelos, y hay que poder entrar a cada uno sin completar media app.
  const [ejercicio, setEjercicio] = useState<"" | "senas" | "letras">("");
  // Varias señas juntas: es lo que pasa en el carrusel y en el ejercicio de
  // unir con flechas, y es donde se nota si cada avatar levanta su propio
  // motor de 3D.
  const [varios, setVarios] = useState(false);
  const muestras = useRef<FrameNativo[]>([]);

  // Que la ventana y el modelo nativos den lo mismo que el pipeline con el que
  // se entrenó no es algo que se pueda ver mirando la pantalla: un error de
  // índice devuelve probabilidades igual de plausibles. Ver Golden.kt.
  //
  // A pedido y no al arrancar: son cientos de inferencias seguidas y, mientras
  // corren, los ms por cuadro que muestra esta misma pantalla no valen nada.
  async function medirFugas() {
    setContraste("abriendo y cerrando los modelos…");
    try {
      const partes: string[] = [];
      for (const que of ["senas", "abecedario", "detectores", "detectoresCpu"] as const) {
        const r = await estres(8, que);
        partes.push(`${que} ${r.porVueltaKB}KB`);
      }
      setContraste(`fuga por vuelta: ${partes.join(" · ")}`);
    } catch (e) {
      setContraste(`estrés falló · ${String(e)}`);
    }
  }

  function contrastar() {
    setContraste("contrastando…");
    golden()
      .then((r) => setContraste(`golden ${r.peorDiferencia.toFixed(4)} · confirma ${r.reproduccion}`))
      .catch((e) => setContraste(`golden falló · ${String(e)}`));
  }

  useEffect(() => {
    if (permiso && !permiso.granted) void pedirPermiso();
  }, [permiso, pedirPermiso]);

  // Al arrancar, preguntarle a Android por qué se cerró la vez anterior. Es la
  // diferencia entre saber si la mató el sistema por memoria o si se cayó, que
  // desde afuera se ven igual.
  useEffect(() => {
    ultimaSalida()
      .then((r) => {
        const lista = r.salidas ?? [];
        lista.forEach((s) => marcar("salida-anterior", s));
        const ultima = lista[0];
        if (ultima) {
          const cuando = ultima.cuando ? new Date(ultima.cuando).toLocaleTimeString() : "";
          setSalida(`cierre anterior: ${ultima.motivo} ${cuando} · ${Math.round((ultima.memoriaKB ?? 0) / 1024)} MB`);
        }
      })
      .catch(() => {});
  }, []);

  function onFrame(e: { nativeEvent: FrameNativo }) {
    muestras.current.push(e.nativeEvent);
    setUltimo(e.nativeEvent);
  }

  function seguir() {
    const m = muestras.current;
    const mediana = (campo: keyof FrameNativo) => {
      const v = m.map((x) => Number(x[campo]) || 0).sort((a, b) => a - b);
      return v.length ? v[Math.floor(v.length / 2)] : 0;
    };
    const destino = process.env.EXPO_PUBLIC_METRICS_URL;
    if (destino && m.length) {
      void fetch(destino, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesion: "nativo-etapa2",
          evento: "reconocedor-nativo",
          muestras: [
            {
              t: Date.now(),
              avisos: m.length,
              fps: mediana("fps"),
              manosMs: mediana("manosMs"),
              poseMs: mediana("poseMs"),
              delegado: m[m.length - 1]?.delegado,
          contraste,
              ancho: mediana("ancho"),
            },
          ],
        }),
      }).catch(() => {});
    }
    onSeguir();
  }

  if (ejercicio === "senas") {
    return (
      <PerformSignBlock
        config={{ signs: ["mama", "papa", "hermano", "amigo"] }}
        active
        ultimo
        xp={15}
        onAnswer={() => {}}
        onContinue={() => setEjercicio("")}
      />
    );
  }

  if (ejercicio === "letras") {
    return (
      <SpellNameBlock
        config={{ max_letters: 6 }}
        active
        ultimo
        xp={20}
        onAnswer={() => {}}
        onContinue={() => setEjercicio("")}
      />
    );
  }

  if (varios) {
    return (
      <View style={styles.varios}>
        {/* El mismo avatar con los dos motores, uno al lado del otro: es la
            única forma de comparar tiempos de carga sin cambiar de teléfono. */}
        <SignAnimation meaning="madre" label="madre · nativo" height={150} motor="nativo" />
        <SignAnimation meaning="padre" label="padre · webview" height={150} motor="webview" />

        {/* Tres versiones del MISMO archivo servidas desde la máquina de
            desarrollo: como viene publicado (webp), con las texturas en JPEG y
            con las texturas en KTX2. Sirve para elegir formato con números en
            vez de con la intuición. Ver scripts/arreglar_glb.py en signa-ml. */}
        {PRUEBA_GLB
          ? ["orig", "jpeg", "ktx2"].map((cual) => (
              <AvatarNativo
                key={cual}
                style={{ height: 130, borderRadius: 16, overflow: "hidden" }}
                url={`${PRUEBA_GLB}/${cual}.glb`}
                onCargado={(e) =>
                  marcar("glb", {
                    formato: cual,
                    msArchivo: e.nativeEvent.msArchivo,
                    msMontaje: e.nativeEvent.msMontaje,
                    clips: e.nativeEvent.clips,
                  })
                }
                onFalla={(e) => marcar("glb", { formato: cual, error: e.nativeEvent.error })}
              />
            ))
          : null}
        <Pressable style={styles.boton} onPress={() => setVarios(false)}>
          <Text style={styles.botonTexto}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  if (!permiso?.granted) {
    return (
      <View style={styles.centro}>
        <Text style={styles.titulo}>Necesitamos la cámara</Text>
        <Pressable style={styles.boton} onPress={() => void pedirPermiso()}>
          <Text style={styles.botonTexto}>Permitir</Text>
        </Pressable>
        <Pressable onPress={onSeguir}>
          <Text style={styles.saltar}>Saltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <ReconocedorNativo
        style={styles.camara}
        activo
        mostrarEsqueleto
        usarTrasera={process.env.EXPO_PUBLIC_CAMARA_TRASERA === "1"}
        onFrame={onFrame}
        onListo={(e) => {
          const n = e.nativeEvent;
          setEstado(
            n.fase === "error"
              ? `falló · ${n.error ?? ""}`
              : n.fase === "cuadros"
                ? `cámara entregando ${n.detalle ?? ""}`
                : "detectando",
          );
        }}
      />

      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>Reconocimiento nativo · {estado}</Text>
        <Text style={styles.dato}>
          {ultimo
            ? `${ultimo.fps.toFixed(1)} fps · manos ${ultimo.manosMs.toFixed(0)} ms · pose ${ultimo.poseMs.toFixed(0)} ms · ${ultimo.delegado} · ${ultimo.ancho}px`
            : "esperando el primer cuadro…"}
        </Text>
        <Text style={styles.referencia}>
          En WebView, este teléfono: manos 57-147 ms · 6-10 fps
        </Text>
        <Pressable onPress={contrastar} onLongPress={medirFugas}>
          <Text style={styles.referencia}>{contraste}</Text>
        </Pressable>
        {salida ? <Text style={styles.referencia}>{salida}</Text> : null}
        <Pressable style={styles.boton} onPress={() => setEjercicio("senas")}>
          <Text style={styles.botonTexto}>Probar señas</Text>
        </Pressable>
        <Pressable style={styles.boton} onPress={() => setEjercicio("letras")}>
          <Text style={styles.botonTexto}>Probar abecedario</Text>
        </Pressable>
        <Pressable style={styles.boton} onPress={() => setVarios(true)}>
          <Text style={styles.botonTexto}>Probar tres avatares</Text>
        </Pressable>
        <Pressable style={styles.boton} onPress={seguir}>
          <Text style={styles.botonTexto}>Seguir a la app</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#000" },
  camara: { ...StyleSheet.absoluteFill },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  varios: { flex: 1, gap: 10, padding: 12, justifyContent: "center", backgroundColor: colors.background },
  tarjeta: {
    position: "absolute", left: 14, right: 14, bottom: 28,
    backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 18, padding: 16, gap: 8,
  },
  titulo: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.text },
  dato: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  referencia: { fontFamily: fonts.bodyRegular, fontSize: 12.5, color: colors.textMuted },
  boton: {
    backgroundColor: colors.text, borderRadius: 99, paddingVertical: 12, alignItems: "center",
  },
  botonTexto: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.onPrimary },
  saltar: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textMuted },
});
