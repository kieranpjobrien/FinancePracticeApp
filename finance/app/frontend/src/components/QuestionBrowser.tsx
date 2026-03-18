import { useState, useEffect } from 'react';
import { getTopics } from '../api';

interface QuestionSummary {
  id: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  times_shown: number;
  times_correct: number;
  accuracy: number | null;
  last_shown: string | null;
}

interface QuestionDetail {
  id: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  question: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
}

interface Props {
  onClose: () => void;
}

export function QuestionBrowser({ onClose }: Props) {
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionDetail | null>(null);

  // Filters
  const [topicFilter, setTopicFilter] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [seenFilter, setSeenFilter] = useState<string>('');

  useEffect(() => {
    Promise.all([
      fetch('/api/questions').then(r => r.json()),
      getTopics(),
    ]).then(([qs, ts]) => {
      setQuestions(qs);
      setTopics(Object.keys(ts));
      setLoading(false);
    });
  }, []);

  const loadQuestion = async (id: string) => {
    const response = await fetch(`/api/questions/${id}`);
    const data = await response.json();
    setSelectedQuestion(data);
  };

  const filteredQuestions = questions.filter(q => {
    if (topicFilter && q.topic !== topicFilter) return false;
    if (difficultyFilter && q.difficulty.toLowerCase() !== difficultyFilter) return false;
    if (seenFilter === 'seen' && q.times_shown === 0) return false;
    if (seenFilter === 'unseen' && q.times_shown > 0) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="glass p-6 animate-fade-in">
        <p className="text-slate-400">Loading questions...</p>
      </div>
    );
  }

  if (selectedQuestion) {
    const diffBadge = selectedQuestion.difficulty === 'Easy'
      ? 'bg-emerald-500/10 text-emerald-400'
      : selectedQuestion.difficulty === 'Medium'
      ? 'bg-amber-500/10 text-amber-400'
      : 'bg-red-500/10 text-red-400';

    return (
      <div className="glass p-6 animate-fade-in">
        <button
          onClick={() => setSelectedQuestion(null)}
          className="mb-5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
        >
          <span>&larr;</span> Back to list
        </button>

        <div className="mb-4 flex items-center gap-2">
          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${diffBadge}`}>
            {selectedQuestion.difficulty}
          </span>
          <span className="text-sm text-slate-500">
            {selectedQuestion.topic} &rsaquo; {selectedQuestion.subtopic}
          </span>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-4 leading-relaxed">
            {selectedQuestion.question}
          </h3>
          <div className="space-y-2">
            {Object.entries(selectedQuestion.options).map(([key, value]) => (
              <div
                key={key}
                className={`p-3.5 rounded-xl border transition-all ${
                  key === selectedQuestion.answer
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-white/[0.03] border-white/5'
                }`}
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/10 text-xs font-semibold text-slate-300 mr-2.5">
                  {key}
                </span>
                <span className="text-slate-200">{value}</span>
                {key === selectedQuestion.answer && (
                  <span className="ml-2 text-emerald-400 text-sm font-medium">(Correct)</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/15 p-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">
            Explanation
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {selectedQuestion.explanation}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-6 animate-slide-up">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Question Browser</h2>
        <button
          onClick={onClose}
          className="px-3.5 py-1.5 text-sm rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 transition-all"
        >
          Close
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <select
          value={topicFilter}
          onChange={e => setTopicFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 appearance-none cursor-pointer"
        >
          <option value="">All Topics</option>
          {topics.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={difficultyFilter}
          onChange={e => setDifficultyFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 appearance-none cursor-pointer"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <select
          value={seenFilter}
          onChange={e => setSeenFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 appearance-none cursor-pointer"
        >
          <option value="">All Questions</option>
          <option value="seen">Seen</option>
          <option value="unseen">Unseen</option>
        </select>

        <span className="text-sm text-slate-500 tabular-nums">
          {filteredQuestions.length} questions
        </span>
      </div>

      {/* Question List */}
      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Topic</th>
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Difficulty</th>
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Seen</th>
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Accuracy</th>
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuestions.map(q => (
              <tr
                key={q.id}
                onClick={() => loadQuestion(q.id)}
                className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors"
              >
                <td className="py-3 px-4 font-mono text-xs text-slate-400">{q.id}</td>
                <td className="py-3 px-4 text-slate-300">{q.topic}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-medium ${
                    q.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' :
                    q.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {q.difficulty}
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-slate-400 tabular-nums">{q.times_shown}</td>
                <td className="py-3 px-4 text-center">
                  {q.accuracy !== null ? (
                    <span className={`tabular-nums font-medium ${
                      q.accuracy >= 80 ? 'text-emerald-400' :
                      q.accuracy >= 60 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {q.accuracy}%
                    </span>
                  ) : (
                    <span className="text-slate-600">-</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center text-slate-500">
                  {q.last_shown || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
