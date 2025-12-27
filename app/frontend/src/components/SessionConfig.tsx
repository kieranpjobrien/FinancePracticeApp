import { useState, useEffect } from 'react';
import type { SessionConfig as SessionConfigType, TopicInfo } from '../types';
import { getTopics } from '../api';

interface Props {
  onStart: (config: SessionConfigType) => void;
}

export function SessionConfig({ onStart }: Props) {
  const [topics, setTopics] = useState<Record<string, TopicInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sessionType, setSessionType] = useState<SessionConfigType['session_type']>('mixed');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [difficulty, setDifficulty] = useState<SessionConfigType['difficulty']>('mixed');
  const [timed, setTimed] = useState(true);
  const [timePerQuestion, setTimePerQuestion] = useState(90);

  useEffect(() => {
    getTopics()
      .then(setTopics)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleTopicToggle = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const handleStart = () => {
    const config: SessionConfigType = {
      session_type: sessionType,
      topics: selectedTopics,
      question_count: questionCount,
      difficulty,
      timed,
      time_per_question: timePerQuestion,
    };
    onStart(config);
  };

  const totalAvailable = Object.values(topics).reduce((sum, t) => sum + t.question_count, 0);
  const selectedAvailable = selectedTopics.length > 0
    ? selectedTopics.reduce((sum, t) => sum + (topics[t]?.question_count || 0), 0)
    : totalAvailable;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading topics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-semibold">Error loading topics</p>
        <p className="text-sm">{error}</p>
        <p className="text-sm mt-2">Make sure the backend is running on port 8000.</p>
      </div>
    );
  }

  if (totalAvailable === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-yellow-800">
        <h2 className="text-xl font-semibold mb-2">No Questions Found</h2>
        <p>The question bank is empty. Add questions to the <code className="bg-yellow-100 px-1 rounded">Questions/</code> folder to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Configure Practice Session</h2>

      {/* Session Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Session Type</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { value: 'mixed', label: 'Mixed Practice' },
            { value: 'topic_drill', label: 'Topic Drill' },
            { value: 'weak_areas', label: 'Weak Areas' },
            { value: 'mock_exam', label: 'Mock Exam' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSessionType(value as SessionConfigType['session_type'])}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                sessionType === value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Topics */}
      {sessionType !== 'mock_exam' && sessionType !== 'diagnostic' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Topics {selectedTopics.length > 0 && `(${selectedTopics.length} selected)`}
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
            {Object.entries(topics).map(([topic, info]) => (
              <label
                key={topic}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                  selectedTopics.includes(topic) ? 'bg-blue-50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedTopics.includes(topic)}
                  onChange={() => handleTopicToggle(topic)}
                  className="rounded text-blue-600"
                />
                <span className="text-sm">{topic}</span>
                <span className="text-xs text-gray-400 ml-auto">{info.question_count}</span>
              </label>
            ))}
          </div>
          {selectedTopics.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">No selection = all topics</p>
          )}
        </div>
      )}

      {/* Question Count */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Questions</label>
        <div className="flex gap-2 flex-wrap">
          {[10, 20, 30, 50, 90].map(count => (
            <button
              key={count}
              onClick={() => setQuestionCount(count)}
              disabled={count > selectedAvailable}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                questionCount === count
                  ? 'bg-blue-600 text-white border-blue-600'
                  : count > selectedAvailable
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">{selectedAvailable} questions available</p>
      </div>

      {/* Difficulty */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
        <div className="flex gap-2">
          {['easy', 'medium', 'hard', 'mixed'].map(diff => (
            <button
              key={diff}
              onClick={() => setDifficulty(diff as SessionConfigType['difficulty'])}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                difficulty === diff
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Timing */}
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={timed}
            onChange={e => setTimed(e.target.checked)}
            className="rounded text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">Timed</span>
        </label>
        {timed && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              value={timePerQuestion}
              onChange={e => setTimePerQuestion(parseInt(e.target.value) || 90)}
              className="w-20 px-3 py-1 border rounded text-sm"
              min={30}
              max={300}
            />
            <span className="text-sm text-gray-600">seconds per question</span>
          </div>
        )}
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={questionCount > selectedAvailable}
        className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Start Session ({questionCount} questions)
      </button>
    </div>
  );
}
