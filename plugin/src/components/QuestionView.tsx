import { useState, useEffect, useCallback } from "react";
import type { Question, QuestionResult } from "../types";

interface Props {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  timed: boolean;
  timePerQuestion: number;
  categoryLabel: string;
  onAnswer: (selectedAnswer: string, timeSeconds: number, confidence: string) => Promise<QuestionResult | null>;
  onNext: () => void;
}

const cardStyle: React.CSSProperties = {
  background: "rgba(30, 41, 59, 0.7)",
  border: "1px solid rgba(148, 163, 184, 0.1)",
  borderRadius: "12px",
  overflow: "hidden",
};

export function QuestionView({ question, questionNumber, totalQuestions, timed, timePerQuestion, categoryLabel, onAnswer, onNext }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string>("maybe");
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelected(null);
    setConfidence("maybe");
    setElapsed(0);
    setResult(null);
  }, [question.id]);

  useEffect(() => {
    if (result) return;
    const interval = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [result]);

  const handleSubmit = useCallback(async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const r = await onAnswer(selected, elapsed, confidence);
      setResult(r);
    } finally {
      setSubmitting(false);
    }
  }, [selected, elapsed, confidence, onAnswer, submitting]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const remaining = timed ? Math.max(0, timePerQuestion - elapsed) : null;
  const overtime = timed && elapsed > timePerQuestion;

  const diffColor = question.difficulty === "Easy" ? "#10b981" : question.difficulty === "Medium" ? "#f59e0b" : "#ef4444";

  return (
    <div style={cardStyle}>
      {/* Progress bar */}
      <div style={{ height: "3px", background: "rgba(255,255,255,0.05)" }}>
        <div style={{ height: "100%", width: `${(questionNumber / totalQuestions) * 100}%`, background: "linear-gradient(90deg, #10b981, #14b8a6)", transition: "width 0.5s" }} />
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
        <div>
          <div style={{ fontSize: "13px", color: "#94a3b8" }}>Question {questionNumber} of {totalQuestions}</div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>{question.category} › {question.subcategory}</div>
        </div>
        <div style={{ fontSize: "16px", fontFamily: "monospace", color: overtime ? "#ef4444" : "#cbd5e1" }}>
          {timed ? formatTime(remaining!) : formatTime(elapsed)}
        </div>
      </div>

      {/* Question */}
      <div style={{ padding: "16px" }}>
        <span style={{ display: "inline-block", fontSize: "11px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", background: `${diffColor}15`, color: diffColor, marginBottom: "8px" }}>
          {question.difficulty}
        </span>
        <p style={{ fontSize: "15px", color: "#f1f5f9", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{question.question}</p>
      </div>

      {/* Options */}
      <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {Object.entries(question.options).map(([key, text]) => {
          const isSelected = selected === key;
          const isCorrect = result?.correctAnswer === key;
          const isWrong = result && isSelected && !result.isCorrect;

          let bg = "rgba(255,255,255,0.04)";
          let border = "1px solid rgba(148,163,184,0.08)";
          if (result) {
            if (isCorrect) { bg = "rgba(16,185,129,0.1)"; border = "1px solid rgba(16,185,129,0.3)"; }
            else if (isWrong) { bg = "rgba(239,68,68,0.1)"; border = "1px solid rgba(239,68,68,0.3)"; }
          } else if (isSelected) {
            bg = "rgba(16,185,129,0.1)"; border = "1px solid rgba(16,185,129,0.4)";
          }

          return (
            <button key={key} onClick={() => !result && setSelected(key)} disabled={!!result} style={{
              display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px", borderRadius: "10px", textAlign: "left",
              background: bg, border, cursor: result ? "default" : "pointer", width: "100%",
              opacity: result && !isCorrect && !isWrong ? 0.5 : 1,
            }}>
              <span style={{ minWidth: "24px", height: "24px", borderRadius: "6px", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>{key}</span>
              <span style={{ flex: 1, fontSize: "13px", color: "#e2e8f0" }}>{text}</span>
              {result && isCorrect && <span style={{ fontSize: "12px", fontWeight: 600, color: "#10b981" }}>Correct</span>}
              {result && isWrong && <span style={{ fontSize: "12px", fontWeight: 600, color: "#ef4444" }}>Wrong</span>}
            </button>
          );
        })}
      </div>

      {/* Confidence */}
      {!result && (
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: "6px" }}>Confidence</div>
          <div style={{ display: "flex", gap: "6px" }}>
            {[["guessing", "Guessing", "#ef4444"], ["maybe", "Maybe", "#f59e0b"], ["sure", "Sure", "#10b981"]].map(([val, label, color]) => (
              <button key={val} onClick={() => setConfidence(val)} style={{
                flex: 1, padding: "6px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, border: "none", cursor: "pointer",
                background: confidence === val ? `${color}20` : "rgba(255,255,255,0.04)",
                color: confidence === val ? color : "#94a3b8",
                outline: confidence === val ? `1px solid ${color}50` : "none",
              }}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Explanation */}
      {result && (
        <div style={{ margin: "0 16px 12px", padding: "14px", borderRadius: "10px", background: result.isCorrect ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${result.isCorrect ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}` }}>
          <p style={{ fontWeight: 600, marginBottom: "6px", color: result.isCorrect ? "#10b981" : "#ef4444" }}>{result.isCorrect ? "Correct!" : "Incorrect"}</p>
          <p style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{result.explanation}</p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid rgba(148,163,184,0.08)" }}>
        <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace" }}>{formatTime(elapsed)}</span>
        {!result ? (
          <button onClick={handleSubmit} disabled={!selected || submitting} style={{
            padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #10b981, #14b8a6)", color: "white", fontWeight: 600, fontSize: "13px",
            opacity: !selected || submitting ? 0.4 : 1,
          }}>{submitting ? "Submitting..." : "Submit Answer"}</button>
        ) : (
          <button onClick={onNext} style={{
            padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #10b981, #14b8a6)", color: "white", fontWeight: 600, fontSize: "13px",
          }}>{questionNumber < totalQuestions ? "Next Question" : "Finish Session"}</button>
        )}
      </div>
    </div>
  );
}
