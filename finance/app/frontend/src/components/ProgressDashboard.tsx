import { useState, useEffect } from 'react';
import type { Progress, SessionHistory } from '../types';
import { getProgress, getProgressHistory } from '../api';

interface Props {
  onClose: () => void;
}

export function ProgressDashboard({ onClose }: Props) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [progressData, historyData] = await Promise.all([
          getProgress(),
          getProgressHistory(),
        ]);
        setProgress(progressData);
        setHistory(historyData);
      } catch (err) {
        console.error('Failed to load progress:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="glass p-6 animate-fade-in">
        <p className="text-slate-400">Loading progress data...</p>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="glass p-6 animate-fade-in">
        <p className="text-slate-400">No progress data available yet.</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 transition-all"
        >
          Close
        </button>
      </div>
    );
  }

  const topics = Object.entries(progress.by_topic).sort((a, b) =>
    b[1].times_shown - a[1].times_shown
  );

  return (
    <div className="glass p-6 animate-slide-up">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold text-white">Progress Dashboard</h2>
        <div className="flex gap-2">
          <a
            href="/api/progress/export"
            download="finance_progress.csv"
            className="px-3.5 py-1.5 text-sm rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            Export CSV
          </a>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-sm rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 transition-all"
          >
            Close
          </button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="mb-8 p-5 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/10">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Overall Performance
        </h3>
        {progress.overall.times_shown === 0 ? (
          <p className="text-slate-400">Complete some practice sessions to see your progress!</p>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tabular-nums">
                {progress.overall.accuracy}%
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">
                Accuracy
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tabular-nums">
                {progress.overall.times_shown}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">
                Attempted
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-400 tabular-nums">
                {progress.overall.times_correct}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">
                Correct
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress by Topic */}
      <div className="mb-8">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Performance by Topic
        </h3>
        <div className="space-y-3">
          {topics.map(([topic, data]) => (
            <div key={topic} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-slate-200">{topic}</span>
                <span className={`font-semibold tabular-nums ${
                  data.accuracy >= 80 ? 'text-emerald-400' :
                  data.accuracy >= 60 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {data.times_shown > 0 ? `${data.accuracy}%` : '-'}
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`progress-bar h-full rounded-full ${
                    data.accuracy >= 80 ? 'bg-emerald-500' :
                    data.accuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${data.accuracy}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-slate-500 flex justify-between">
                <span>{data.questions_seen}/{data.total_questions} seen</span>
                <span>{data.questions_mastered} mastered</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Session History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Recent Sessions
          </h3>
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Score</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Questions</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(-10).reverse().map((session, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-slate-300">{session.date} {session.time}</td>
                    <td className="py-3 px-4 text-slate-400 capitalize">{session.type}</td>
                    <td className="text-center py-3 px-4">
                      <span className={`tabular-nums font-medium ${
                        session.score_percent >= 80 ? 'text-emerald-400' :
                        session.score_percent >= 60 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {session.score_percent}%
                      </span>
                    </td>
                    <td className="text-center py-3 px-4 text-slate-400 tabular-nums">
                      {session.questions_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
