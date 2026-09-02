import React from "react";
import { SelectSignConfig } from "@/features/courses/lessonContent.types";
import { SignCarouselBlock } from "./SignCarouselBlock";

interface SelectSignBlockProps {
  config: SelectSignConfig;
  xp: number;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
}

export function SelectSignBlock({ config, xp, onAnswer, onContinue }: SelectSignBlockProps) {
  return (
    <SignCarouselBlock
      question={`¿Cuál es la seña de «${config.word}»?`}
      options={config.options}
      answer={config.word}
      xp={xp}
      confirmLabel="Elegir esta seña"
      confirmIcon="hand-left"
      correctDetail={`«${config.word}» es la seña que elegiste.`}
      wrongDetail={(correctIndex, correctValue) => `La correcta es la opción ${correctIndex + 1}: «${correctValue}».`}
      onAnswer={onAnswer}
      onContinue={onContinue}
    />
  );
}
