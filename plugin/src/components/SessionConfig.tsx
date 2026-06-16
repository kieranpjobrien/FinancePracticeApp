import { useState } from "react";
import type { ExamConfig, SessionConfig } from "../types";
import { QuestionBank } from "../QuestionBank";

interface Props {
  examConfig: ExamConfig;
  questionBank: QuestionBank;
  onStart: (config: SessionConfig) => void;
}

const cardStyle: React.CSSProperties = {
  background: "rgba(30, 41, 59, 0.7)",
  border: "1px solid rgba(148, 163, 184, 0.1)",
  borderRadius: "12px",
  padding: "20px",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 600, textTransform: "uppercase",
  letterSpacing: "0.05em", color: "#94a3b8", marginBottom: "8px",
};

const btnBase: React.CSSProperties = {
  padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 500,
  border: "none", cursor: "pointer", transition: "all 0.15s",
};

export function SessionConfigView({ examConfig, questionBank, onStart }: Props) {
  const [sessionType, setSessionType] = useState("mixed");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [difficulty, setDifficulty] = useState("mixed");
  const [timed, setTimed] = useState(true);
  const [timePerQuestion, setTimePerQuestion] = useState(90);

  const catCounts = questionBank.getCategoryCounts();
  const totalAvailable = Object.values(catCounts).reduce((a, b) => a + b, 0);
  const selectedAvailable = selectedCats.length > 0
    ? selectedCats.reduce((sum, c) => sum + (catCounts[c] || 0), 0) : totalAvailable;

  const catLabel = examConfig.categoryLabel;

  const sessionTypeMap: Record<string, { label: string; desc: string }> = {
    mixed: { label: "Mixed", desc: "All areas" },
    category_drill: { label: `${catLabel} Drill`, desc: "Focus" },
    topic_drill: { label: `${catLabel} Drill`, desc: "Focus" },
    domain_drill: { label: `${catLabel} Drill`, desc: "Focus" },
    weak_areas: { label: "Weak Areas", desc: "Needs work" },
    mock_exam: { label: "Mock Exam", desc: "Timed" },
  };

  const toggleCat = (cat: string) => {
    setSelectedCats((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const handleStart = () => {
    onStart({ sessionType, categories: selectedCats, questionCount, difficulty, timed, timePerQuestion });
  };

  if (totalAvailable === 0) {
    return <div style={cardStyle}><p style={{ color: "#fbbf24" }}>No questions found. Add questions to the Questions folder.</p></div>;
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f1f5f9", marginBottom: "16px" }}>Configure Session</h3>

      {/* Session Type */}
      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Session Type</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {examConfig.sessionTypes.filter(st => sessionTypeMap[st]).map((st) => {
            const info = sessionTypeMap[st];
            const active = sessionType === st;
            return (
              <button key={st} onClick={() => setSessionType(st)} style={{
                ...btnBase,
                background: active ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                color: active ? "#10b981" : "#cbd5e1",
                outline: active ? "1px solid rgba(16,185,129,0.4)" : "none",
              }}>
                {info.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Categories */}
      {sessionType !== "mock_exam" && (
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>{catLabel}s</label>
          <div style={{ maxHeight: "180px", overflowY: "auto", borderRadius: "8px", border: "1px solid rgba(148,163,184,0.08)", padding: "4px" }}>
            {Object.entries(catCounts).sort(([a], [b]) => a.localeCompare(b)).map(([cat, count]) => {
              const active = selectedCats.includes(cat);
              return (
                <label key={cat} style={{
                  display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", borderRadius: "6px", cursor: "pointer",
                  background: active ? "rgba(16,185,129,0.1)" : "transparent", color: active ? "#10b981" : "#cbd5e1",
                }}>
                  <input type="checkbox" checked={active} onChange={() => toggleCat(cat)} style={{ accentColor: "#10b981" }} />
                  <span style={{ flex: 1, fontSize: "13px" }}>{cat}</span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>{count}</span>
                </label>
              );
            })}
          </div>
          {selectedCats.length === 0 && <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>No selection = all {catLabel.toLowerCase()}s</p>}
        </div>
      )}

      {/* Question Count */}
      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Questions</label>
        <div style={{ display: "flex", gap: "6px" }}>
          {[10, 20, 30, 50].map((n) => (
            <button key={n} onClick={() => setQuestionCount(n)} disabled={n > selectedAvailable} style={{
              ...btnBase, minWidth: "44px",
              background: questionCount === n ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
              color: questionCount === n ? "#10b981" : n > selectedAvailable ? "#475569" : "#cbd5e1",
              cursor: n > selectedAvailable ? "not-allowed" : "pointer",
              outline: questionCount === n ? "1px solid rgba(16,185,129,0.4)" : "none",
            }}>{n}</button>
          ))}
        </div>
        <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>{selectedAvailable} available</p>
      </div>

      {/* Difficulty */}
      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Difficulty</label>
        <div style={{ display: "flex", gap: "6px" }}>
          {["easy", "medium", "hard", "mixed"].map((d) => (
            <button key={d} onClick={() => setDifficulty(d)} style={{
              ...btnBase, textTransform: "capitalize",
              background: difficulty === d ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
              color: difficulty === d ? "#10b981" : "#cbd5e1",
              outline: difficulty === d ? "1px solid rgba(16,185,129,0.4)" : "none",
            }}>{d}</button>
          ))}
        </div>
      </div>

      {/* Timer */}
      <div style={{ marginBottom: "20px" }}>
        <label style={labelStyle}>Timer</label>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={() => setTimed(!timed)} style={{
            width: "40px", height: "22px", borderRadius: "11px", border: "none", cursor: "pointer",
            background: timed ? "#10b981" : "#475569", position: "relative",
          }}>
            <span style={{
              position: "absolute", top: "2px", left: timed ? "20px" : "2px", width: "18px", height: "18px",
              borderRadius: "9px", background: "white", transition: "left 0.15s",
            }} />
          </button>
          <span style={{ fontSize: "13px", color: "#cbd5e1" }}>{timed ? `${timePerQuestion}s per question` : "Untimed"}</span>
        </div>
        {timed && (
          <input type="range" min={30} max={180} step={10} value={timePerQuestion}
            onChange={(e) => setTimePerQuestion(parseInt(e.target.value))}
            style={{ width: "100%", marginTop: "8px", accentColor: "#10b981" }} />
        )}
      </div>

      {/* Start */}
      <button onClick={handleStart} disabled={questionCount > selectedAvailable} style={{
        width: "100%", padding: "12px", borderRadius: "10px", border: "none", cursor: "pointer",
        background: "linear-gradient(135deg, #10b981, #14b8a6)", color: "white", fontWeight: 600, fontSize: "15px",
        opacity: questionCount > selectedAvailable ? 0.4 : 1,
      }}>
        Start ({questionCount} questions)
      </button>
    </div>
  );
}
