import type { ExamConfig } from "../types";
import { QuestionBank } from "../QuestionBank";

interface Props {
  questionBank: QuestionBank;
  examConfig: ExamConfig;
  onClose: () => void;
}

const cardStyle: React.CSSProperties = {
  background: "rgba(30, 41, 59, 0.7)",
  border: "1px solid rgba(148, 163, 184, 0.1)",
  borderRadius: "12px",
  padding: "16px",
};

export function ProgressDashboard({ questionBank, examConfig, onClose }: Props) {
  const catLabel = examConfig.categoryLabel;

  // Compute progress from in-memory question data
  const byCategory: Record<string, {
    total: number; shown: number; correct: number; accuracy: number; seen: number; mastered: number;
  }> = {};
  let overallShown = 0;
  let overallCorrect = 0;

  for (const q of questionBank.questions.values()) {
    if (!byCategory[q.category]) {
      byCategory[q.category] = { total: 0, shown: 0, correct: 0, accuracy: 0, seen: 0, mastered: 0 };
    }
    const c = byCategory[q.category];
    c.total++;
    if (q.timesShown > 0) {
      c.shown += q.timesShown;
      c.correct += q.timesCorrect;
      c.seen++;
      overallShown += q.timesShown;
      overallCorrect += q.timesCorrect;
      const acc = q.timesCorrect / q.timesShown;
      if (acc >= 0.8) c.mastered++;
    }
  }

  for (const c of Object.values(byCategory)) {
    c.accuracy = c.shown > 0 ? Math.round((c.correct / c.shown) * 1000) / 10 : 0;
  }

  const overallAccuracy = overallShown > 0 ? Math.round((overallCorrect / overallShown) * 1000) / 10 : 0;
  const cats = Object.entries(byCategory).sort((a, b) => b[1].shown - a[1].shown);

  return (
    <div>
      {/* Overall */}
      <div style={{ ...cardStyle, marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: "10px" }}>Overall</div>
        {overallShown === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "13px" }}>Complete some sessions to see progress.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
            <div><div style={{ fontSize: "24px", fontWeight: 700, color: "#10b981" }}>{overallAccuracy}%</div><div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "#64748b" }}>Accuracy</div></div>
            <div><div style={{ fontSize: "24px", fontWeight: 700, color: "#f1f5f9" }}>{overallShown}</div><div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "#64748b" }}>Attempted</div></div>
            <div><div style={{ fontSize: "24px", fontWeight: 700, color: "#10b981" }}>{overallCorrect}</div><div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "#64748b" }}>Correct</div></div>
          </div>
        )}
      </div>

      {/* By Category */}
      <div style={cardStyle}>
        <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: "10px" }}>By {catLabel}</div>
        {cats.map(([cat, data]) => {
          const barColor = data.accuracy >= 80 ? "#10b981" : data.accuracy >= 60 ? "#f59e0b" : "#ef4444";
          return (
            <div key={cat} style={{ padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(148,163,184,0.06)", marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>{cat}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: data.shown > 0 ? barColor : "#475569" }}>
                  {data.shown > 0 ? `${data.accuracy}%` : "-"}
                </span>
              </div>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${data.accuracy}%`, background: barColor, borderRadius: "2px" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                <span>{data.seen}/{data.total} seen</span>
                <span>{data.mastered} mastered</span>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onClose} style={{
        width: "100%", padding: "10px", marginTop: "12px", borderRadius: "8px", border: "1px solid rgba(148,163,184,0.15)",
        background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer", fontSize: "13px",
      }}>Back</button>
    </div>
  );
}
