import React, { useMemo, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, PanResponder, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { SignAnimation } from "./SignAnimation";

const PIP_W = 104;
const PIP_H = 138;
const MARGIN = 12;
/** Espacio reservado arriba (badge de estado) y abajo (barra de acciones). */
const TOP_INSET = 56;
const BOTTOM_INSET = 52;

interface SignPipProps {
  /** Seña a mostrar. Si no tiene animación cargada, se ve el placeholder. */
  meaning: string;
  label: string;
  /** Pausa la animación del avatar (vuelve a la pose neutra del primer frame). */
  paused?: boolean;
  /** Avisa al padre cuando se agranda, para que pueda pausar la cámara. */
  onExpandedChange?: (expanded: boolean) => void;
}

/**
 * Miniatura con el modelo 3D de la seña, encima de la cámara.
 *
 * Mismo comportamiento que el PiP de `signa-ml/demo/static/nombre.html`: se
 * arrastra, al soltarlo engancha en la esquina más cercana, y con un toque se
 * agranda a pantalla completa para poder girar el avatar con el dedo.
 *
 * El tap y el arrastre comparten gesto: se distinguen por distancia recorrida
 * (un toque siempre tiembla unos pixeles, así que exigir cero movimiento haría
 * que el tap casi nunca funcione).
 */
export function SignPip({ meaning, label, paused, onExpandedChange }: SignPipProps) {
  const [big, setBig] = useState(false);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const pos = useRef(new Animated.ValueXY({ x: 0, y: TOP_INSET })).current;
  // 0 = miniatura, 1 = pantalla completa. Interpola la caja en vez de saltar.
  const grow = useRef(new Animated.Value(0)).current;
  const value = useRef({ x: 0, y: TOP_INSET });
  const bigRef = useRef(false);

  // La posición actual se espeja en un ref: PanResponder se crea una sola vez
  // y sus callbacks no verían el estado nuevo.
  useMemo(() => {
    const id = pos.addListener((v) => (value.current = v));
    return () => pos.removeListener(id);
  }, [pos]);

  const corners = useMemo(() => {
    const { width, height } = area;
    const top = TOP_INSET;
    const bottom = Math.max(top, height - PIP_H - BOTTOM_INSET);
    const right = Math.max(MARGIN, width - PIP_W - MARGIN);
    return [
      { x: MARGIN, y: top },
      { x: right, y: top },
      { x: MARGIN, y: bottom },
      { x: right, y: bottom },
    ];
  }, [area]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !bigRef.current,
        onMoveShouldSetPanResponder: (_e, g) =>
          !bigRef.current && Math.hypot(g.dx, g.dy) > 6,
        onPanResponderGrant: () => {
          pos.setOffset({ ...value.current });
          pos.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_e, g) => {
          pos.flattenOffset();
          if (Math.hypot(g.dx, g.dy) < 6) {
            agrandar();
            return;
          }
          snapCercano();     // engancha en la esquina más cercana, como la demo
        },
      }),
    [corners, pos, onExpandedChange],
  );

  // La caja se interpola entre miniatura y pantalla completa con `grow`, en vez
  // de saltar entre dos estilos: es la animación de agrandar/achicar.
  const chico = grow.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const mezcla = (min: number, max: number) =>
    Animated.add(Animated.multiply(chico, min), Animated.multiply(grow, max));
  const cajaAnimada = {
    left: Animated.add(Animated.multiply(pos.x, chico), Animated.multiply(grow, MARGIN)),
    top: Animated.add(Animated.multiply(pos.y, chico), Animated.multiply(grow, MARGIN)),
    width: mezcla(PIP_W, Math.max(PIP_W, area.width - MARGIN * 2)),
    height: mezcla(PIP_H, Math.max(PIP_H, area.height - MARGIN * 2)),
    borderRadius: mezcla(18, 22),
  };

  function handleLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setArea((prev) => {
      if (prev.width === width && prev.height === height) return prev;
      // Primera medición: arranca arriba a la derecha.
      const x = Math.max(MARGIN, width - PIP_W - MARGIN);
      pos.setValue({ x, y: TOP_INSET });
      value.current = { x, y: TOP_INSET };
      return { width, height };
    });
  }

  function anima(hacia: number, alTerminar?: () => void) {
    Animated.spring(grow, {
      toValue: hacia,
      useNativeDriver: false,     // anima left/top/width/height, no transform
      friction: 9,
      tension: 80,
    }).start(alTerminar);
  }

  function agrandar() {
    setBig(true);
    bigRef.current = true;
    onExpandedChange?.(true);
    anima(1);
  }

  function shrink() {
    setBig(false);
    bigRef.current = false;
    onExpandedChange?.(false);
    // Al volver a la miniatura se reengancha en la esquina más cercana, así
    // queda donde el usuario la había dejado y sigue siendo arrastrable.
    anima(0, () => snapCercano());
  }

  /** Lleva el PiP a la esquina más próxima a su posición actual. */
  function snapCercano() {
    const { x, y } = value.current;
    let best = corners[0];
    let bestD = Infinity;
    for (const c of corners) {
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestD) { bestD = d; best = c; }
    }
    Animated.spring(pos, { toValue: best, useNativeDriver: false, friction: 7, tension: 70 }).start();
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={handleLayout}>
      <Animated.View
        {...pan.panHandlers}
        style={[styles.pip, cajaAnimada]}
      >
        {/* El avatar sólo se puede rotar agrandado. Chico, el WebView no recibe
            toques: el gesto es para arrastrar el PiP, y si el modelo se los
            quedara, arrastrarlo giraría el avatar en vez de moverlo. */}
        <View style={styles.fill} pointerEvents={big ? "auto" : "none"}>
          <SignAnimation
            meaning={meaning}
            label={label}
            cameraControls={big}
            paused={paused}
            style={styles.fill}
          />
        </View>

        {big ? (
          <Pressable style={styles.close} onPress={shrink} hitSlop={8}>
            <Ionicons name="close" size={17} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>tocá para agrandar</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pip: {
    position: "absolute",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.fill,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#241A16",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  fill: { flex: 1, borderRadius: 0, borderWidth: 0 },
  close: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    position: "absolute",
    left: 7,
    right: 7,
    bottom: 7,
    backgroundColor: "rgba(36,26,22,0.72)",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  hintText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    lineHeight: 11,
    color: colors.onDark,
    textAlign: "center",
  },
});
