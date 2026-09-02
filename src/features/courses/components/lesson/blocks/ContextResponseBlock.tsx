import React from "react";
import { ContextResponseConfig } from "@/features/courses/lessonContent.types";
import { SignCarouselBlock } from "./SignCarouselBlock";

interface ContextResponseBlockProps {
  config: ContextResponseConfig;
  xp: number;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
}

export function ContextResponseBlock({ config, xp, onAnswer, onContinue }: ContextResponseBlockProps) {
  return (
    <SignCarouselBlock
      question={config.question}
      options={config.options}
      answer={config.answer}
      xp={xp}
      confirmLabel="Elegir esta seña"
      confirmIcon="hand-left"
      correctDetail={`«${config.answer}» es la respuesta correcta.`}
      wrongDetail={(correctIndex, correctValue) => `La correcta es la opción ${correctIndex + 1}: «${correctValue}».`}
      onAnswer={onAnswer}
      onContinue={onContinue}
    />
  );
}
