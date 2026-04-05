import { useState, useEffect } from 'react';
import type PMPPracticePlugin from '../../main';
import type { Question } from '../../models';
import { questionAccuracy } from '../../models';

interface QuestionSummary {
  id: string;
  domain: string;
  task: string;
  difficulty: string;
  times_shown: number;
  accuracy: number | null;
  last_shown: string | null;
}

interface Props {
  plugin: PMPPracticePlugin;
  onClose: () => void;
}

export function QuestionBrowser({ plugin, onClose }: Props) {
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [domainFilter, setDomainFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [seenFilter, setSeenFilter] = useState('');

  useEffect(() => {
    const allQuestions = Array.from(plugin.questionBank.questions.values());
    const summaries: QuestionSummary[] = allQuestions.map(q => ({
      id: q.id,
      domain: q.domain,
      task: q.task,
      difficulty: q.difficulty,
      times_shown: q.times_shown,
      accuracy: q.times_shown > 0 ? Math.round(questionAccuracy(q) * 1000) / 10 : null,
      last_shown: q.last_shown,
    }));
    setQuestions(summaries);
    setDomains(plugin.questionBank.getAllDomains());
  }, [plugin]);

  const loadQuestion = (id: string) => {
    const q = plugin.questionBank.getQuestion(id);
    if (q) setSelectedQuestion(q);
  };

  const filtered = questions.filter(q => {
    if (domainFilter && q.domain !== domainFilter) return false;
    if (difficultyFilter && q.difficulty.toLowerCase() !== difficultyFilter) return false;
    if (seenFilter === 'seen' && q.times_shown === 0) return false;
    if (seenFilter === 'unseen' && q.times_shown > 0) return false;
    return true;
  });

  if (selectedQuestion) {
    return (
      <div className="pmp-card">
        <button onClick={() => setSelectedQuestion(null)} className="pmp-btn pmp-btn-ghost pmp-btn-sm pmp-mb-4">
          &larr; Back to list
        </button>

        <div className="pmp-question-meta">
          <span className={`pmp-badge pmp-badge-${selectedQuestion.difficulty.toLowerCase()}`}>
            {selectedQuestion.difficulty}
          </span>
          <span className="pmp-text-muted">{selectedQuestion.domain} &rsaquo; {selectedQuestion.task}</span>
        </div>

        <h3 className="pmp-question-text pmp-mb-4">{selectedQuestion.question}</h3>

        <div className="pmp-options">
          {Object.entries(selectedQuestion.options).map(([key, value]) => (
            <div
              key={key}
              className={`pmp-option ${key === selectedQuestion.answer ? 'pmp-option-correct' : 'pmp-option-faded'}`}
            >
              <span className="pmp-option-key">{key}</span>
              <span className="pmp-option-text">{value}</span>
              {key === selectedQuestion.answer && <span className="pmp-option-label pmp-text-success">(Correct)</span>}
            </div>
          ))}
        </div>

        <div className="pmp-explanation pmp-explanation-correct pmp-mt-4">
          <h4 className="pmp-section-label pmp-text-accent">Explanation</h4>
          <p className="pmp-explanation-text">{selectedQuestion.explanation}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pmp-card">
      <div className="pmp-progress-header">
        <h2 className="pmp-heading">Question Browser</h2>
        <button onClick={onClose} className="pmp-btn pmp-btn-ghost pmp-btn-sm">Close</button>
      </div>

      {/* Filters */}
      <div className="pmp-filters">
        <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)} className="pmp-select">
          <option value="">All Domains</option>
          {domains.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)} className="pmp-select">
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select value={seenFilter} onChange={e => setSeenFilter(e.target.value)} className="pmp-select">
          <option value="">All</option>
          <option value="seen">Seen</option>
          <option value="unseen">Unseen</option>
        </select>
        <span className="pmp-text-muted">{filtered.length} questions</span>
      </div>

      {/* Table */}
      <div className="pmp-table-wrap">
        <table className="pmp-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Domain</th>
              <th>Difficulty</th>
              <th>Seen</th>
              <th>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(q => (
              <tr key={q.id} onClick={() => loadQuestion(q.id)} className="pmp-clickable">
                <td className="pmp-mono">{q.id}</td>
                <td>{q.domain}</td>
                <td>
                  <span className={`pmp-badge pmp-badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                </td>
                <td>{q.times_shown}</td>
                <td>
                  {q.accuracy !== null ? (
                    <span className={`pmp-text-${q.accuracy >= 80 ? 'success' : q.accuracy >= 60 ? 'warning' : 'danger'}`}>
                      {q.accuracy}%
                    </span>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
