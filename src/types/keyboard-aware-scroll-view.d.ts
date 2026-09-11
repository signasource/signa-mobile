declare module "react-native-keyboard-aware-scroll-view" {
  import { Component } from "react";
  import { ScrollViewProps } from "react-native";

  export interface KeyboardAwareScrollViewProps extends ScrollViewProps {
    enableOnAndroid?: boolean;
    enableAutomaticScroll?: boolean;
    enableResetScrollToCoords?: boolean;
    extraScrollHeight?: number;
    extraHeight?: number;
    keyboardOpeningTime?: number;
    viewIsInsideTabBar?: boolean;
    resetScrollToCoords?: { x: number; y: number };
  }

  export class KeyboardAwareScrollView extends Component<KeyboardAwareScrollViewProps> {}
}
