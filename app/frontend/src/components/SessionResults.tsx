import type { SessionSummary } from '../types';

interface Props {
  summary: SessionSummary;
  onNewSession: () => void;
}

export function SessionResults({ summary, onNewSession }: Props) {
  const scoreColor = summary.score_percent >= 70
    ? 'text-green-600'
    : summary.score_percent >= 50
    ? 'text-yellow-600'
    : 'text-red-600';

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center py-8 border-b">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Complete</h2>
        <div className={`text-5xl font-bold ${scoreColor}`}>
          {summary.score_percent.toFixed(0)}%
        </div>
        <div className="text-gray-500 mt-1">
          {summary.score} / {summary.questions_attempted} correct
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 p-6 border-b">
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-800">{summary.time_taken_minutes}</div>
          <div className="text-xs text-gray-500">minutes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-800">
            {(summary.time_taken_minutes * 60 / summary.questions_attempted).toFixed(0)}s
          </div>
          <div className="text-xs text-gray-500">avg per question</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-800">{summary.topics.length}</div>
          <div className="text-xs text-gray-500">topics covered</div>
        </div>
      </div>

      {/* Results by Topic */}
      <div className="p-6 border-b">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">By Topic</h3>
        <div className="space-y-3">
          {Object.entries(summary.results_by_topic).map(([topic, data]) => {
            const barColor = data.percent >= 70
              ? 'bg-green-500'
              : data.percent >= 50
              ? 'bg-yellow-500'
              : 'bg-red-500';

            return (
              <div key={topic}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{topic}</span>
                  <span className="text-gray-500">
                    {data.correct}/{data.total} ({data.percent}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all duration-500`}
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
        <div className="p-6 border-b">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Error Patterns</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(summary.error_summary).map(([type, count]) => {
              if (count === 0) return null;
              return (
                <div key={type} className="flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded-full text-xs font-medium">
                    {count}
                  </span>
                  <span className="text-gray-700 capitalize">{type.replace('_', ' ')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-6 flex gap-3">
        <button
          onClick={onNewSession}
          className="flex-1 py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          New Session
        </button>
      </div>

      {/* Session Info */}
      <div className="px-6 pb-6 text-xs text-gray-400 text-center">
        Session {summary.session_id} • {summary.date} {summary.time}
      </div>
    </div>
  );
}
