import { useState, useEffect } from 'react';
import type PMPPracticePlugin from '../../main';
import type { SessionConfig as SessionConfigType, DomainInfo } from '../../models';

interface Props {
  onStart: (config: SessionConfigType) => void;
  plugin: PMPPracticePlugin;
}

export function SessionConfigPanel({ onStart, plugin }: Props) {
  const [domains, setDomains] = useState<Record<string, DomainInfo>>({});
  const [loading, setLoading] = useState(true);

  const [sessionType, setSessionType] = useState<SessionConfigType['session_type']>('mixed');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(plugin.settings.defaultQuestions);
  const [difficulty, setDifficulty] = useState<SessionConfigType['difficulty']>('mixed');
  const [timed, setTimed] = useState(true);
  const [timePerQuestion, setTimePerQuestion] = useState(plugin.settings.defaultTimePerQuestion);

  useEffect(() => {
    const domainData = plugin.questionBank.getDomains();
    setDomains(domainData);
    setLoading(false);
  }, [plugin]);

  const handleDomainToggle = (domain: string) => {
    setSelectedDomains(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );
  };

  const handleStart = () => {
    onStart({
      session_type: sessionType,
      domains: selectedDomains,
      question_count: questionCount,
      difficulty,
      timed,
      time_per_question: timePerQuestion,
    });
  };

  const totalAvailable = Object.values(domains).reduce((sum, d) => sum + d.question_count, 0);
  const selectedAvailable = selectedDomains.length > 0
    ? selectedDomains.reduce((sum, d) => sum + (domains[d]?.question_count || 0), 0)
    : totalAvailable;

  if (loading) {
    return <div className="pmp-card pmp-center"><p className="pmp-text-muted">Loading domains...</p></div>;
  }

  if (totalAvailable === 0) {
    return (
      <div className="pmp-card">
        <div className="pmp-alert pmp-alert-warning">
          <h2>No Questions Found</h2>
          <p>The question bank is empty. Add questions to the <code>Questions/</code> folder to get started.</p>
        </div>
      </div>
    );
  }

  const sessionTypes = [
    { value: 'mixed', label: 'Mixed Practice', desc: 'All domains' },
    { value: 'domain_drill', label: 'Domain Drill', desc: 'Focus areas' },
    { value: 'weak_areas', label: 'Weak Areas', desc: 'Needs work' },
    { value: 'mock_exam', label: 'Mock Exam', desc: 'Timed test' },
  ];

  return (
    <div className="pmp-card pmp-config">
      <h2 className="pmp-heading">Configure Practice Session</h2>

      {/* Session Type */}
      <div className="pmp-field">
        <label className="pmp-section-label">Session Type</label>
        <div className="pmp-grid-4">
          {sessionTypes.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => setSessionType(value as SessionConfigType['session_type'])}
              className={`pmp-option-btn ${sessionType === value ? 'pmp-option-active' : ''}`}
            >
              <div>{label}</div>
              <div className="pmp-option-desc">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Domains */}
      {sessionType !== 'mock_exam' && (
        <div className="pmp-field">
          <label className="pmp-section-label">
            Domains {selectedDomains.length > 0 && (
              <span className="pmp-text-accent">({selectedDomains.length} selected)</span>
            )}
          </label>
          <div className="pmp-domain-list">
            {Object.entries(domains).map(([domain, info]) => (
              <label
                key={domain}
                className={`pmp-domain-item ${selectedDomains.includes(domain) ? 'pmp-domain-selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedDomains.includes(domain)}
                  onChange={() => handleDomainToggle(domain)}
                />
                <span className="pmp-domain-name">{domain}</span>
                <span className="pmp-domain-count">{info.question_count}</span>
              </label>
            ))}
          </div>
          {selectedDomains.length === 0 && (
            <p className="pmp-hint">No selection = all domains</p>
          )}
        </div>
      )}

      {/* Question Count */}
      <div className="pmp-field">
        <label className="pmp-section-label">Questions</label>
        <div className="pmp-btn-group">
          {[10, 20, 30, 50, 90].map(count => (
            <button
              key={count}
              onClick={() => setQuestionCount(count)}
              disabled={count > selectedAvailable}
              className={`pmp-option-btn pmp-option-compact ${questionCount === count ? 'pmp-option-active' : ''} ${count > selectedAvailable ? 'pmp-option-disabled' : ''}`}
            >
              {count}
            </button>
          ))}
        </div>
        <p className="pmp-hint">{selectedAvailable} questions available</p>
      </div>

      {/* Difficulty */}
      <div className="pmp-field">
        <label className="pmp-section-label">Difficulty</label>
        <div className="pmp-btn-group">
          {['easy', 'medium', 'hard', 'mixed'].map(diff => (
            <button
              key={diff}
              onClick={() => setDifficulty(diff as SessionConfigType['difficulty'])}
              className={`pmp-option-btn pmp-option-compact ${difficulty === diff ? 'pmp-option-active' : ''}`}
            >
              {diff.charAt(0).toUpperCase() + diff.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Timer */}
      <div className="pmp-field">
        <label className="pmp-section-label">Timer</label>
        <div className="pmp-toggle-row">
          <button
            onClick={() => setTimed(!timed)}
            className={`pmp-toggle ${timed ? 'pmp-toggle-on' : ''}`}
          >
            <span className="pmp-toggle-knob" />
          </button>
          <span className="pmp-text-muted">{timed ? 'Timed' : 'Untimed'}</span>
        </div>
        {timed && (
          <div className="pmp-slider-row">
            <input
              type="range"
              min={30}
              max={180}
              step={10}
              value={timePerQuestion}
              onChange={e => setTimePerQuestion(parseInt(e.target.value))}
              className="pmp-slider"
            />
            <span className="pmp-slider-value">{timePerQuestion}s</span>
          </div>
        )}
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={questionCount > selectedAvailable}
        className="pmp-btn pmp-btn-primary pmp-btn-full"
      >
        Start Session ({questionCount} questions)
      </button>
    </div>
  );
}
