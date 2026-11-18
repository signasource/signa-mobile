/** Lo que el reconocedor informa en cada cuadro procesado (lo arma `ReconocedorSenasNativo`). */
export interface LiveFrame {
  sign: string | null;
  confidence: number;
  progress: number;
  body: boolean;
  resting: boolean;
  /** Manos detectadas (0, 1 o 2). Sin manos no hay seña posible. */
  hands: number;
  fps: number;
  /** Tamaño real del canvas del esqueleto; "0x0" delata un problema de layout. */
  canvas: string;
  /** Milisegundos por inferencia, promediados. Para comparar motores. */
  inferMs: number;
  /** Confianza de la seña pedida: es la que se compara contra el umbral. */
  targetConfidence: number;
  /** Reparto del frame, en ms. Se ve tocando el badge de estado. */
  poseMs: number;
  handsMs: number;
  drawFps: number;
  drawMs: number;
  delegado: string;
  /** Memoria nativa en uso, en KB. Sólo la informa el reconocedor nativo. */
  memoriaKB?: number;
}
