import type { SessionSummary } from '../types';

interface Props {
  summary: SessionSummary;
  onNewSession: () => void;
}

export function SessionResults({ summary, onNewSession }: Props) {
  const scoreColor = summary.score_percent >= 70
    ? 'from-emerald-400 to-emerald-500'
    : summary.score_percent >= 50
    ? 'from-amber-400 to-amber-500'
    : 'from-red-400 to-red-500';

  const scoreBg = summary.score_percent >= 70
    ? 'bg-emerald-500/10'
    : summary.score_percent >= 50
    ? 'bg-amber-500/10'
    : 'bg-red-500/10';

  return (
    <div className="glass max-w-2xl mx-auto animate-slide-up overflow-hidden">
      {/* Header */}
      <div className={`text-center py-10 ${scoreBg}`}>
        <h2 className="text-lg font-semibold text-slate-300 mb-3">Session Complete</h2>
        <div className={`text-6xl font-bold bg-gradient-to-r ${scoreColor} bg-clip-text text-transparent`}>
          {summary.score_percent.toFixed(0)}%
        </div>
        <div className="text-slate-400 mt-2">
          {summary.score} / {summary.questions_attempted} correct
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 p-6 border-b border-white/5">
        <div className="text-center">
          <div className="text-2xl font-semibold text-white tabular-nums">
            {summary.time_taken_minutes}
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">
            Minutes
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-white tabular-nums">
            {(summary.time_taken_minutes * 60 / summary.questions_attempted).toFixed(0)}s
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">
            Avg / Question
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-white tabular-nums">
            {summary.topics.length}
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">
            Topics
          </div>
        </div>
      </div>

      {/* Results by Topic */}
      <div className="p-6 border-b border-white/5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          By Topic
        </h3>
        <div className="space-y-4">
          {Object.entries(summary.results_by_topic).map(([topic, data]) => {
            const barColor = data.percent >= 70
              ? 'bg-emerald-500'
              : data.percent >= 50
              ? 'bg-amber-500'
              : 'bg-red-500';

            return (
              <div key={topic}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-300">{topic}</span>
                  <span className="text-slate-400 tabular-nums">
                    {data.correct}/{data.total} ({data.percent}%)
                  </span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`progress-bar h-full ${barColor} rounded-full`}
                    style={{ width: `${data.percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Summary */}
      {Object.values(summary.error_summary).some(v => v > 0) && (
        <div className="p-6 border-b border-white/5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Error Patterns
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(summary.error_summary).map(([type, count]) => {
              if (count === 0) return null;
              return (
                <div key={type} className="flex items-center gap-3 text-sm">
                  <span className="w-7 h-7 flex items-center justify-center bg-red-500/10 text-red-400 rounded-lg text-xs font-semibold tabular-nums">
                    {count}
                  </span>
                  <span className="text-slate-300 capitalize">{type.replace('_', ' ')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-6">
        <button
          onClick={onNewSession}
          className="btn-glow w-full py-3.5 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-400 hover:to-purple-500 transition-all"
        >
          New Session
        </button>
      </div>

      {/* Session Info */}
      <div className="px-6 pb-6 text-xs text-slate-500 text-center">
        Session {summary.session_id} &middot; {summary.date} {summary.time}
      </div>
    </div>
  );
}
