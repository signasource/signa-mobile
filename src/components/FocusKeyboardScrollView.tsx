import React from "react";
import { useIsFocused } from "@react-navigation/native";
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-aware-scroll-view";

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
