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
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-gray-500">Loading questions...</p>
      </div>
    );
  }

  if (selectedQuestion) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <button
          onClick={() => setSelectedQuestion(null)}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          &larr; Back to list
        </button>

        <div className="mb-4">
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium mr-2 ${
            selectedQuestion.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
            selectedQuestion.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {selectedQuestion.difficulty}
          </span>
          <span className="text-sm text-gray-500">
            {selectedQuestion.topic} &gt; {selectedQuestion.subtopic}
          </span>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">{selectedQuestion.question}</h3>
          <div className="space-y-2">
            {Object.entries(selectedQuestion.options).map(([key, value]) => (
              <div
                key={key}
                className={`p-3 rounded border ${
                  key === selectedQuestion.answer
                    ? 'bg-green-50 border-green-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <span className="font-medium mr-2">{key}:</span>
                {value}
                {key === selectedQuestion.answer && (
                  <span className="ml-2 text-green-600 font-medium">(Correct)</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h4 className="font-medium text-blue-800 mb-2">Explanation</h4>
          <p className="text-sm text-blue-900 whitespace-pre-wrap">
            {selectedQuestion.explanation}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Question Browser</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          Close
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <select
          value={topicFilter}
          onChange={e => setTopicFilter(e.target.value)}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="">All Topics</option>
          {topics.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={difficultyFilter}
          onChange={e => setDifficultyFilter(e.target.value)}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <select
          value={seenFilter}
          onChange={e => setSeenFilter(e.target.value)}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="">All Questions</option>
          <option value="seen">Seen</option>
          <option value="unseen">Unseen</option>
        </select>

        <span className="text-sm text-gray-500 self-center">
          {filteredQuestions.length} questions
        </span>
      </div>

      {/* Question List */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-2 px-3">ID</th>
              <th className="text-left py-2 px-3">Topic</th>
              <th className="text-center py-2 px-3">Difficulty</th>
              <th className="text-center py-2 px-3">Seen</th>
              <th className="text-center py-2 px-3">Accuracy</th>
              <th className="text-center py-2 px-3">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuestions.map(q => (
              <tr
                key={q.id}
                onClick={() => loadQuestion(q.id)}
                className="border-b hover:bg-blue-50 cursor-pointer"
              >
                <td className="py-2 px-3 font-mono text-xs">{q.id}</td>
                <td className="py-2 px-3">{q.topic}</td>
                <td className="py-2 px-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                    q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                    q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {q.difficulty}
                  </span>
                </td>
                <td className="py-2 px-3 text-center">{q.times_shown}</td>
                <td className="py-2 px-3 text-center">
                  {q.accuracy !== null ? (
                    <span className={
                      q.accuracy >= 80 ? 'text-green-600' :
                      q.accuracy >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }>
                      {q.accuracy}%
                    </span>
                  ) : '-'}
                </td>
                <td className="py-2 px-3 text-center text-gray-500">
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
