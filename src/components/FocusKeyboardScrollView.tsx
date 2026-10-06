import React from "react";
import { UIManager } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-aware-scroll-view";

interface FabricUIManagerLike {
  findShadowNodeByTag_DEPRECATED?: (tag: number) => unknown;
}

/**
 * Último recurso contra "viewIsDescendantOf() noop: Cannot find view with reactTag N".
 *
 * En Fabric, `viewIsDescendantOf` loguea con `console.error` y retorna sin hacer nada cuando
 * el tag no existe: un input que se desmontó con el teclado abierto, o que vive en otro root
 * (un `<Modal>`). Es el mismo resultado, sin el error. Se parchea una sola vez, al cargar el módulo.
 */
const fabric = (globalThis as { nativeFabricUIManager?: FabricUIManagerLike }).nativeFabricUIManager;
const findShadowNode = fabric?.findShadowNodeByTag_DEPRECATED;
if (fabric && findShadowNode) {
  type ViewIsDescendantOf = (reactTag: number, ancestorReactTag: number, callback: (result: boolean) => void) => void;
  const manager = UIManager as unknown as { viewIsDescendantOf: ViewIsDescendantOf };
  const original = manager.viewIsDescendantOf.bind(manager);
  manager.viewIsDescendantOf = (reactTag, ancestorReactTag, callback) => {
    if (!findShadowNode.call(fabric, reactTag) || !findShadowNode.call(fabric, ancestorReactTag)) return;
    original(reactTag, ancestorReactTag, callback);
  };
}

/**
 * KeyboardAwareScrollView que sólo reacciona al teclado cuando su pantalla está a la vista.
 *
 * La librería escucha el teclado en CADA instancia montada, y las pantallas de las
 * pestañas y del stack siguen montadas por debajo de la que se ve. Cuando el input
 * enfocado está en otra pantalla o dentro de un `<Modal>` —el reporte de una seña,
 * por ejemplo—, cada instancia de abajo llama a `UIManager.viewIsDescendantOf` con un
 * tag que no es de su árbol y React Native tira
 * "viewIsDescendantOf() noop: Cannot find view with reactTag N".
 */
export function FocusKeyboardScrollView({
  enableAutomaticScroll = true,
  ...props
}: KeyboardAwareScrollViewProps) {
  const focused = useIsFocused();
  return <KeyboardAwareScrollView {...props} enableAutomaticScroll={enableAutomaticScroll && focused} />;
}
