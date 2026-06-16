import { useState, useEffect, useRef, useCallback } from "react";
import type { Question, QuestionResult } from "../types";

interface Props {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (selectedAnswer: string, timeSeconds: number, confidence: string) => Promise<QuestionResult | null>;
  onNext: () => void;
}

export function QuestionView({ question, questionNumber, totalQuestions, onAnswer, onNext }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    setSelected(null);
    setResult(null);
    startRef.current = Date.now();
  }, [question.id]);

  const handleSubmit = useCallback(async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const seconds = Math.round((Date.now() - startRef.current) / 1000);
      const r = await onAnswer(selected, seconds, "maybe");
      setResult(r);
    } finally {
      setSubmitting(false);
    }
  }, [selected, onAnswer, submitting]);

  const progress = (questionNumber / totalQuestions) * 100;

  return (
    <div className="pmp-card pmp-question-card">
      <div className="pmp-progress-track">
        <div className="pmp-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="pmp-question-header">
        <div>
          <span className="pmp-text-muted">Q{questionNumber}/{totalQuestions}</span>
          <div className="pmp-text-small">{question.category} › {question.subcategory}</div>
        </div>
        <span className={`pmp-badge pmp-badge-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
      </div>

      <div className="pmp-question-body">
        <p className="pmp-question-text">{question.question}</p>
      </div>

      <div className="pmp-options">
        {Object.entries(question.options).map(([key, text]) => {
          const isSelected = selected === key;
          const isCorrect = result?.correctAnswer === key;
          const isWrong = !!result && isSelected && !result.isCorrect;

          let cls = "pmp-option";
          if (result) {
            if (isCorrect) cls += " pmp-option-correct";
            else if (isWrong) cls += " pmp-option-wrong";
            else cls += " pmp-option-faded";
          } else if (isSelected) {
            cls += " pmp-option-selected";
          }

          return (
            <div
              key={key}
              className={cls}
              role="button"
              tabIndex={result ? -1 : 0}
              onClick={() => !result && setSelected(key)}
              onKeyDown={(e) => {
                if (!result && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setSelected(key);
                }
              }}
            >
              <span className="pmp-option-key">{key}</span>
              <span className="pmp-option-text">{text}</span>
            </div>
          );
        })}
      </div>

      {result && (
        <div className={`pmp-explanation ${result.isCorrect ? "pmp-explanation-correct" : "pmp-explanation-wrong"}`}>
          <p className="pmp-explanation-title">{result.isCorrect ? "Correct!" : "Incorrect"}</p>
          <p className="pmp-explanation-text">{result.explanation}</p>
        </div>
      )}

      <div className="pmp-actions">
        <div />
        {!result ? (
          <button className="pmp-btn pmp-btn-primary" onClick={handleSubmit} disabled={!selected || submitting}>
            {submitting ? "Submitting…" : "Submit Answer"}
          </button>
        ) : (
          <button className="pmp-btn pmp-btn-primary" onClick={onNext}>
            {questionNumber < totalQuestions ? "Next Question" : "Finish Session"}
          </button>
        )}
      </div>
    </div>
  );
}
