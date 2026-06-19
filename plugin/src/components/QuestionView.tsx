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
  const [single, setSingle] = useState<string | null>(null);
  const [multi, setMulti] = useState<Record<string, boolean>>({});
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    setSingle(null);
    setMulti({});
    setPairs({});
    setResult(null);
    startRef.current = Date.now();
  }, [question.id]);

  const fmt = question.format;

  const buildAnswer = useCallback(() => {
    if (fmt === "multi") return Object.keys(multi).filter((k) => multi[k]).sort().join(",");
    if (fmt === "matching") {
      return Object.entries(pairs).filter(([, v]) => v).map(([k, v]) => `${k}-${v}`).sort().join(",");
    }
    return single ?? "";
  }, [fmt, single, multi, pairs]);

  const canSubmit =
    fmt === "multi" ? Object.values(multi).some(Boolean)
    : fmt === "matching" ? Object.keys(question.options).every((k) => pairs[k])
    : !!single;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const seconds = Math.round((Date.now() - startRef.current) / 1000);
      const r = await onAnswer(buildAnswer(), seconds, "maybe");
      setResult(r);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, submitting, buildAnswer, onAnswer]);

  const progress = (questionNumber / totalQuestions) * 100;
  const correctSet = result ? new Set(result.correctAnswer.split(",").map((s) => s.trim().toUpperCase())) : null;
  const correctMatchFor = (key: string) =>
    result ? result.correctAnswer.split(",").map((s) => s.trim()).find((p) => p.startsWith(`${key}-`))?.split("-")[1] ?? null : null;
  const hint = fmt === "multi" ? "Select all that apply" : fmt === "matching" ? "Match each item on the left" : null;

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
        {hint && <p className="pmp-text-small" style={{ marginTop: "6px" }}>{hint}</p>}
      </div>

      {fmt !== "matching" && (
        <div className="pmp-options">
          {Object.entries(question.options).map(([key, text]) => {
            const chosen = fmt === "multi" ? !!multi[key] : single === key;
            let cls = "pmp-option";
            if (result) {
              if (correctSet?.has(key)) cls += " pmp-option-correct";
              else if (chosen) cls += " pmp-option-wrong";
              else cls += " pmp-option-faded";
            } else if (chosen) {
              cls += " pmp-option-selected";
            }
            const toggle = () => {
              if (result) return;
              if (fmt === "multi") setMulti((p) => ({ ...p, [key]: !p[key] }));
              else setSingle(key);
            };
            return (
              <div
                key={key}
                className={cls}
                role="button"
                tabIndex={result ? -1 : 0}
                onClick={toggle}
                onKeyDown={(e) => { if (!result && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggle(); } }}
              >
                <span className="pmp-option-key">{key}</span>
                <span className="pmp-option-text">{text}</span>
              </div>
            );
          })}
        </div>
      )}

      {fmt === "matching" && (
        <div className="pmp-options">
          {Object.entries(question.options).map(([key, text]) => {
            const chosen = pairs[key];
            const correct = correctMatchFor(key);
            const ok = !!result && chosen === correct;
            let cls = "pmp-option";
            if (result) cls += ok ? " pmp-option-correct" : " pmp-option-wrong";
            return (
              <div key={key} className={cls} style={{ alignItems: "center", gap: "8px" }}>
                <span className="pmp-option-text"><strong>{key}.</strong> {text}</span>
                {!result ? (
                  <select
                    className="pmp-select"
                    value={chosen ?? ""}
                    onChange={(e) => setPairs((p) => ({ ...p, [key]: e.target.value }))}
                  >
                    <option value="">—</option>
                    {Object.entries(question.matches ?? {}).map(([mk, mtext]) => (
                      <option key={mk} value={mk}>{mk}: {mtext}</option>
                    ))}
                  </select>
                ) : (
                  <span className="pmp-text-small">{chosen ?? "—"}{ok ? "" : ` → ${correct ?? "?"}`}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {result && (
        <div className={`pmp-explanation ${result.isCorrect ? "pmp-explanation-correct" : "pmp-explanation-wrong"}`}>
          <p className="pmp-explanation-title">{result.isCorrect ? "Correct!" : "Incorrect"}</p>
          <p className="pmp-explanation-text">{result.explanation}</p>
        </div>
      )}

      <div className="pmp-actions">
        <div />
        {!result ? (
          <button className="pmp-btn pmp-btn-primary" onClick={handleSubmit} disabled={!canSubmit || submitting}>
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
