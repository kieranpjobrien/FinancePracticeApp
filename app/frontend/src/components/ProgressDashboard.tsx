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
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-gray-500">Loading progress data...</p>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-gray-500">No progress data available yet.</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Progress Dashboard</h2>
        <div className="flex gap-2">
          <a
            href="/api/progress/export"
            download="finance_progress.csv"
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            Export CSV
          </a>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Overall Performance</h3>
        {progress.overall.times_shown === 0 ? (
          <p className="text-gray-600">Complete some practice sessions to see your progress!</p>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {progress.overall.accuracy}%
              </div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {progress.overall.times_shown}
              </div>
              <div className="text-sm text-gray-600">Questions Attempted</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {progress.overall.times_correct}
              </div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
          </div>
        )}
      </div>

      {/* Progress by Topic */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Performance by Topic</h3>
        <div className="space-y-3">
          {topics.map(([topic, data]) => (
            <div key={topic} className="border rounded p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{topic}</span>
                <span className={`font-semibold ${
                  data.accuracy >= 80 ? 'text-green-600' :
                  data.accuracy >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {data.times_shown > 0 ? `${data.accuracy}%` : '-'}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded overflow-hidden">
                <div
                  className={`h-full ${
                    data.accuracy >= 80 ? 'bg-green-500' :
                    data.accuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${data.accuracy}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500 flex justify-between">
                <span>{data.questions_seen}/{data.total_questions} questions seen</span>
                <span>{data.questions_mastered} mastered (80%+)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Session History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-center py-2">Score</th>
                  <th className="text-center py-2">Questions</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(-10).reverse().map((session, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2">{session.date} {session.time}</td>
                    <td className="py-2">{session.type}</td>
                    <td className="text-center py-2">
                      <span className={
                        session.score_percent >= 80 ? 'text-green-600' :
                        session.score_percent >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }>
                        {session.score_percent}%
                      </span>
                    </td>
                    <td className="text-center py-2">{session.questions_count}</td>
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
