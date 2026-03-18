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
        <div className="text-slate-400 animate-fade-in">Loading topics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-6 animate-fade-in">
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
          <p className="font-semibold text-red-400">Error loading topics</p>
          <p className="text-sm text-red-300/80 mt-1">{error}</p>
          <p className="text-sm text-red-300/60 mt-2">Make sure the backend is running on port 8000.</p>
        </div>
      </div>
    );
  }

  if (totalAvailable === 0) {
    return (
      <div className="glass p-6 animate-fade-in">
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
          <h2 className="text-xl font-semibold text-amber-300 mb-2">No Questions Found</h2>
          <p className="text-slate-300">
            The question bank is empty. Add questions to the{' '}
            <code className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300 text-sm">Questions/</code>{' '}
            folder to get started.
          </p>
        </div>
      </div>
    );
  }

  const sessionTypes = [
    { value: 'mixed', label: 'Mixed Practice', desc: 'All topics' },
    { value: 'topic_drill', label: 'Topic Drill', desc: 'Focus areas' },
    { value: 'weak_areas', label: 'Weak Areas', desc: 'Needs work' },
    { value: 'mock_exam', label: 'Mock Exam', desc: 'Timed test' },
  ];

  return (
    <div className="glass p-8 max-w-2xl mx-auto animate-slide-up">
      <h2 className="text-2xl font-bold text-white mb-8">Configure Practice Session</h2>

      {/* Session Type */}
      <div className="mb-8">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Session Type
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {sessionTypes.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => setSessionType(value as SessionConfigType['session_type'])}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                sessionType === value
                  ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div>{label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Topics */}
      {sessionType !== 'mock_exam' && sessionType !== 'diagnostic' && (
        <div className="mb-8">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Topics {selectedTopics.length > 0 && (
              <span className="text-indigo-400 normal-case tracking-normal">
                ({selectedTopics.length} selected)
              </span>
            )}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto p-1 rounded-xl bg-white/[0.02] border border-white/5">
            {Object.entries(topics).map(([topic, info]) => (
              <label
                key={topic}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  selectedTopics.includes(topic)
                    ? 'bg-indigo-500/15 text-indigo-300'
                    : 'hover:bg-white/5 text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedTopics.includes(topic)}
                  onChange={() => handleTopicToggle(topic)}
                  className="rounded border-slate-600 bg-white/10 text-indigo-500 focus:ring-indigo-500/30 focus:ring-offset-0"
                />
                <span className="text-sm flex-1">{topic}</span>
                <span className="text-xs text-slate-500 tabular-nums">{info.question_count}</span>
              </label>
            ))}
          </div>
          {selectedTopics.length === 0 && (
            <p className="text-xs text-slate-500 mt-2">No selection = all topics</p>
          )}
        </div>
      )}

      {/* Question Count */}
      <div className="mb-8">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Questions
        </label>
        <div className="flex gap-2 flex-wrap">
          {[10, 20, 30, 50, 90].map(count => (
            <button
              key={count}
              onClick={() => setQuestionCount(count)}
              disabled={count > selectedAvailable}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all tabular-nums ${
                questionCount === count
                  ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40'
                  : count > selectedAvailable
                  ? 'bg-white/[0.02] text-slate-600 cursor-not-allowed'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">{selectedAvailable} questions available</p>
      </div>

      {/* Difficulty */}
      <div className="mb-8">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Difficulty
        </label>
        <div className="flex gap-2">
          {['easy', 'medium', 'hard', 'mixed'].map(diff => (
            <button
              key={diff}
              onClick={() => setDifficulty(diff as SessionConfigType['difficulty'])}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all capitalize ${
                difficulty === diff
                  ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Timing */}
      <div className="mb-10">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Timer
        </label>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTimed(!timed)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              timed ? 'bg-indigo-500' : 'bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                timed ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-sm text-slate-300">{timed ? 'Timed' : 'Untimed'}</span>
        </div>
        {timed && (
          <div className="mt-4 flex items-center gap-4">
            <input
              type="range"
              min={30}
              max={180}
              step={10}
              value={timePerQuestion}
              onChange={e => setTimePerQuestion(parseInt(e.target.value))}
              className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-sm text-slate-300 tabular-nums w-12 text-right">{timePerQuestion}s</span>
          </div>
        )}
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={questionCount > selectedAvailable}
        className="btn-glow w-full py-4 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-400 hover:to-purple-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:from-indigo-500 disabled:hover:to-purple-600 text-lg"
      >
        Start Session ({questionCount} questions)
      </button>
    </div>
  );
}
