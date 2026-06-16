import type { SessionSummary } from "../types";

interface Props {
  summary: SessionSummary;
  categoryLabel: string;
  onNewSession: () => void;
}

const cardStyle: React.CSSProperties = {
  background: "rgba(30, 41, 59, 0.7)",
  border: "1px solid rgba(148, 163, 184, 0.1)",
  borderRadius: "12px",
  overflow: "hidden",
};

export function SessionResults({ summary, categoryLabel, onNewSession }: Props) {
  const scoreColor = summary.scorePercent >= 70 ? "#10b981" : summary.scorePercent >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div style={cardStyle}>
      {/* Score header */}
      <div style={{ textAlign: "center", padding: "24px 16px", background: `${scoreColor}08` }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px" }}>Session Complete</div>
        <div style={{ fontSize: "48px", fontWeight: 700, color: scoreColor }}>{summary.scorePercent.toFixed(0)}%</div>
        <div style={{ fontSize: "13px", color: "#94a3b8" }}>{summary.score} / {summary.questionsAttempted} correct</div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", padding: "16px", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
        {[
          [String(summary.timeTakenMinutes), "Minutes"],
          [`${(summary.timeTakenMinutes * 60 / summary.questionsAttempted).toFixed(0)}s`, "Avg / Q"],
          [String(summary.categories.length), `${categoryLabel}s`],
        ].map(([val, label], i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: 600, color: "#f1f5f9" }}>{val}</div>
            <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", marginTop: "2px" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* By category */}
      <div style={{ padding: "16px", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: "10px" }}>By {categoryLabel}</div>
        {Object.entries(summary.resultsByCategory).map(([cat, data]) => {
          const barColor = data.percent >= 70 ? "#10b981" : data.percent >= 50 ? "#f59e0b" : "#ef4444";
          return (
            <div key={cat} style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                <span style={{ color: "#e2e8f0" }}>{cat}</span>
                <span style={{ color: "#94a3b8" }}>{data.correct}/{data.total} ({data.percent}%)</span>
              </div>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${data.percent}%`, background: barColor, borderRadius: "2px", transition: "width 0.5s" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Error patterns */}
      {Object.values(summary.errorSummary).some((v) => v > 0) && (
        <div style={{ padding: "16px", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: "10px" }}>Error Patterns</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {Object.entries(summary.errorSummary).filter(([, c]) => c > 0).map(([type, count]) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                <span style={{ minWidth: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: "11px", fontWeight: 600 }}>{count}</span>
                <span style={{ color: "#e2e8f0", textTransform: "capitalize" }}>{type.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: "16px" }}>
        <button onClick={onNewSession} style={{
          width: "100%", padding: "12px", borderRadius: "10px", border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, #10b981, #14b8a6)", color: "white", fontWeight: 600, fontSize: "14px",
        }}>New Session</button>
      </div>
    </div>
  );
}
