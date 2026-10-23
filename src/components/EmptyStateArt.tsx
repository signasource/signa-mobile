import React, { useMemo } from "react";
import { StyleProp, ViewStyle } from "react-native";
import SpiderWeb from "@assets/ilus/spiderweb.svg";
import ManoConSpiderweb1 from "@assets/ilus/mano-con-spiderweb-1.svg";
import ManoConSpiderweb2 from "@assets/ilus/mano-con-spiderweb-2.svg";
import ManoConSpiderwebNegra from "@assets/ilus/mano-con-spiderweb-negra.svg";

/** Pool of "nothing here" illustrations (spiderweb family), one picked at random per mount. */
const EMPTY_STATE_ILLUSTRATIONS = [SpiderWeb, ManoConSpiderweb1, ManoConSpiderweb2, ManoConSpiderwebNegra];

interface Props {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Random spiderweb illustration shown wherever a list/section has no content. */
export function EmptyStateArt({ size = 150, style }: Props) {
  const Illustration = useMemo(
    () => EMPTY_STATE_ILLUSTRATIONS[Math.floor(Math.random() * EMPTY_STATE_ILLUSTRATIONS.length)],
    []
  );
  return <Illustration width={size} height={size} style={style} />;
}
