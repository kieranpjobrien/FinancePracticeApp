import type { SessionSummary } from "../types";

interface Props {
  summary: SessionSummary;
  categoryLabel: string;
  onNewSession: () => void;
}

function tier(percent: number): "success" | "warning" | "danger" {
  return percent >= 70 ? "success" : percent >= 50 ? "warning" : "danger";
}

export function SessionResults({ summary, categoryLabel, onNewSession }: Props) {
  const t = tier(summary.scorePercent);
  const avgPerQ = summary.questionsAttempted > 0
    ? Math.round((summary.timeTakenMinutes * 60) / summary.questionsAttempted)
    : 0;
  const hasErrors = Object.values(summary.errorSummary).some((v) => v > 0);

  return (
    <div className="pmp-card pmp-results">
      <div className={`pmp-results-header pmp-results-${t}`}>
        <h2>Session Complete</h2>
        <div className="pmp-results-score">{summary.scorePercent.toFixed(0)}%</div>
        <div className="pmp-text-muted">{summary.score} / {summary.questionsAttempted} correct</div>
      </div>

      <div className="pmp-stats-grid">
        <div className="pmp-stat">
          <div className="pmp-stat-value">{summary.timeTakenMinutes}</div>
          <div className="pmp-stat-label">Minutes</div>
        </div>
        <div className="pmp-stat">
          <div className="pmp-stat-value">{avgPerQ}s</div>
          <div className="pmp-stat-label">Avg / Q</div>
        </div>
        <div className="pmp-stat">
          <div className="pmp-stat-value">{summary.categories.length}</div>
          <div className="pmp-stat-label">{categoryLabel}s</div>
        </div>
      </div>

      <div className="pmp-section">
        <span className="pmp-section-label">By {categoryLabel}</span>
        {Object.entries(summary.resultsByCategory).map(([cat, data]) => (
          <div key={cat} className="pmp-domain-result">
            <div className="pmp-domain-result-header">
              <span>{cat}</span>
              <span className="pmp-text-muted">{data.correct}/{data.total} ({data.percent}%)</span>
            </div>
            <div className="pmp-progress-track">
              <div className={`pmp-progress-bar pmp-progress-${tier(data.percent)}`} style={{ width: `${data.percent}%` }} />
            </div>
          </div>
        ))}
      </div>

      {hasErrors && (
        <div className="pmp-section">
          <span className="pmp-section-label">Error Patterns</span>
          <div className="pmp-error-grid">
            {Object.entries(summary.errorSummary).filter(([, c]) => c > 0).map(([type, count]) => (
              <div key={type} className="pmp-error-item">
                <span className="pmp-error-count">{count}</span>
                <span>{type.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pmp-section">
        <button className="pmp-btn pmp-btn-primary pmp-btn-full" onClick={onNewSession}>New Session</button>
      </div>
    </div>
  );
}
