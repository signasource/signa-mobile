/**
 * Nada de esto esta confirmado
 */
export interface SignRecognitionResult {
  sign: string;
  confidence: number; // 0 a 1
  timestampMs: number;
}

export interface SignRecognitionSessionState {
  isModelLoaded: boolean;
  isCameraActive: boolean;
  lastResult?: SignRecognitionResult;
}
