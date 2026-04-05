import type { SessionSummary } from '../../models';

interface Props {
  summary: SessionSummary;
  onNewSession: () => void;
}

export function SessionResults({ summary, onNewSession }: Props) {
  const scoreClass = summary.score_percent >= 70 ? 'success' : summary.score_percent >= 50 ? 'warning' : 'danger';

  return (
    <div className="pmp-card pmp-results">
      {/* Score Header */}
      <div className={`pmp-results-header pmp-results-${scoreClass}`}>
        <h2>Session Complete</h2>
        <div className="pmp-results-score">{summary.score_percent.toFixed(0)}%</div>
        <div className="pmp-text-muted">{summary.score} / {summary.questions_attempted} correct</div>
      </div>

      {/* Stats */}
      <div className="pmp-stats-grid">
        <div className="pmp-stat">
          <div className="pmp-stat-value">{summary.time_taken_minutes}</div>
          <div className="pmp-stat-label">Minutes</div>
        </div>
        <div className="pmp-stat">
          <div className="pmp-stat-value">
            {(summary.time_taken_minutes * 60 / summary.questions_attempted).toFixed(0)}s
          </div>
          <div className="pmp-stat-label">Avg / Question</div>
        </div>
        <div className="pmp-stat">
          <div className="pmp-stat-value">{summary.domains.length}</div>
          <div className="pmp-stat-label">Domains</div>
        </div>
      </div>

      {/* By Domain */}
      <div className="pmp-section">
        <h3 className="pmp-section-label">By Domain</h3>
        <div className="pmp-domain-results">
          {Object.entries(summary.results_by_domain).map(([domain, data]) => {
            const barClass = data.percent >= 70 ? 'success' : data.percent >= 50 ? 'warning' : 'danger';
            return (
              <div key={domain} className="pmp-domain-result">
                <div className="pmp-domain-result-header">
                  <span>{domain}</span>
                  <span className="pmp-text-muted">{data.correct}/{data.total} ({data.percent}%)</span>
                </div>
                <div className="pmp-progress-track">
                  <div className={`pmp-progress-bar pmp-progress-${barClass}`} style={{ width: `${data.percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Summary */}
      {Object.values(summary.error_summary).some(v => v > 0) && (
        <div className="pmp-section">
          <h3 className="pmp-section-label">Error Patterns</h3>
          <div className="pmp-error-grid">
            {Object.entries(summary.error_summary).map(([type, count]) => {
              if (count === 0) return null;
              return (
                <div key={type} className="pmp-error-item">
                  <span className="pmp-error-count">{count}</span>
                  <span>{type.replace('_', ' ')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="pmp-section">
        <button onClick={onNewSession} className="pmp-btn pmp-btn-primary pmp-btn-full">
          New Session
        </button>
      </div>

      <div className="pmp-session-info">
        Session {summary.session_id} &middot; {summary.date} {summary.time}
      </div>
    </div>
  );
}
