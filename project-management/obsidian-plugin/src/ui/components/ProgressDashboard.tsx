import { useState, useEffect } from 'react';
import type PMPPracticePlugin from '../../main';
import type { Progress, SessionHistory } from '../../models';

interface Props {
  plugin: PMPPracticePlugin;
  onClose: () => void;
}

export function ProgressDashboard({ plugin, onClose }: Props) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const progressData = plugin.questionBank.getProgress();
        const historyData = await plugin.sessionManager.getProgressHistory();
        setProgress(progressData);
        setHistory(historyData);
      } catch (err) {
        console.error('Failed to load progress:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [plugin]);

  if (loading) return <div className="pmp-card"><p className="pmp-text-muted">Loading progress data...</p></div>;

  if (!progress) {
    return (
      <div className="pmp-card">
        <p className="pmp-text-muted">No progress data available yet.</p>
        <button onClick={onClose} className="pmp-btn pmp-btn-ghost">Close</button>
      </div>
    );
  }

  const domains = Object.entries(progress.by_domain).sort((a, b) => b[1].times_shown - a[1].times_shown);

  return (
    <div className="pmp-card pmp-progress">
      <div className="pmp-progress-header">
        <h2 className="pmp-heading">Progress Dashboard</h2>
        <button onClick={onClose} className="pmp-btn pmp-btn-ghost pmp-btn-sm">Close</button>
      </div>

      {/* Overall */}
      <div className="pmp-overall-stats">
        <h3 className="pmp-section-label">Overall Performance</h3>
        {progress.overall.times_shown === 0 ? (
          <p className="pmp-text-muted">Complete some practice sessions to see your progress!</p>
        ) : (
          <div className="pmp-stats-grid">
            <div className="pmp-stat">
              <div className="pmp-stat-value pmp-text-accent">{progress.overall.accuracy}%</div>
              <div className="pmp-stat-label">Accuracy</div>
            </div>
            <div className="pmp-stat">
              <div className="pmp-stat-value">{progress.overall.times_shown}</div>
              <div className="pmp-stat-label">Attempted</div>
            </div>
            <div className="pmp-stat">
              <div className="pmp-stat-value pmp-text-success">{progress.overall.times_correct}</div>
              <div className="pmp-stat-label">Correct</div>
            </div>
          </div>
        )}
      </div>

      {/* By Domain */}
      <div className="pmp-section">
        <h3 className="pmp-section-label">Performance by Domain</h3>
        <div className="pmp-domain-progress-list">
          {domains.map(([domain, data]) => {
            const barClass = data.accuracy >= 80 ? 'success' : data.accuracy >= 60 ? 'warning' : 'danger';
            return (
              <div key={domain} className="pmp-domain-progress-item">
                <div className="pmp-domain-result-header">
                  <span>{domain}</span>
                  <span className={`pmp-text-${barClass}`}>
                    {data.times_shown > 0 ? `${data.accuracy}%` : '-'}
                  </span>
                </div>
                <div className="pmp-progress-track">
                  <div className={`pmp-progress-bar pmp-progress-${barClass}`} style={{ width: `${data.accuracy}%` }} />
                </div>
                <div className="pmp-domain-meta">
                  <span>{data.questions_seen}/{data.total_questions} seen</span>
                  <span>{data.questions_mastered} mastered</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="pmp-section">
          <h3 className="pmp-section-label">Recent Sessions</h3>
          <div className="pmp-table-wrap">
            <table className="pmp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Score</th>
                  <th>Qs</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(-10).reverse().map((session, idx) => {
                  const scoreClass = session.score_percent >= 80 ? 'success' : session.score_percent >= 60 ? 'warning' : 'danger';
                  return (
                    <tr key={idx}>
                      <td>{session.date} {session.time}</td>
                      <td className="pmp-capitalize">{session.type}</td>
                      <td className={`pmp-text-${scoreClass}`}>{session.score_percent}%</td>
                      <td>{session.questions_count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
