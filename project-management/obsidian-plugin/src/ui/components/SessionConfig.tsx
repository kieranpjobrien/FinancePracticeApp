import { useState, useEffect } from 'react';
import type PMPPracticePlugin from '../../main';
import type { SessionConfig as SessionConfigType, DomainInfo } from '../../models';

interface Props {
  onStart: (config: SessionConfigType) => void;
  plugin: PMPPracticePlugin;
  activeExam: string;
}

export function SessionConfigPanel({ onStart, plugin, activeExam }: Props) {
  const [domains, setDomains] = useState<Record<string, DomainInfo>>({});
  const [loading, setLoading] = useState(true);

  const [sessionType, setSessionType] = useState<SessionConfigType['session_type']>('domain_drill');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(plugin.settings.defaultQuestions);

  useEffect(() => {
    const domainData = plugin.questionBank.getDomains();
    setDomains(domainData);
    setSelectedDomains([]);
    setLoading(false);
  }, [plugin, activeExam]);

  const handleDomainToggle = (domain: string) => {
    setSelectedDomains(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );
  };

  const handleStart = () => {
    onStart({
      session_type: sessionType,
      domains: selectedDomains,
      question_count: sessionType === 'mock_exam' ? getMockCount() : questionCount,
      difficulty: 'mixed',
      timed: false,
      time_per_question: 90,
    });
  };

  const getMockCount = (): number => {
    // PMP: 180 questions, CFA: scale to available
    if (activeExam === 'PMP') return Math.min(180, totalAvailable);
    return Math.min(120, totalAvailable);
  };

  const totalAvailable = Object.values(domains).reduce((sum, d) => sum + d.question_count, 0);
  const selectedAvailable = selectedDomains.length > 0
    ? selectedDomains.reduce((sum, d) => sum + (domains[d]?.question_count || 0), 0)
    : totalAvailable;

  if (loading) {
    return <div className="pmp-card pmp-center"><p className="pmp-text-muted">Loading...</p></div>;
  }

  if (totalAvailable === 0) {
    return (
      <div className="pmp-card">
        <div className="pmp-alert pmp-alert-warning">
          <h2>No Questions Found</h2>
          <p>Add questions to <code>{plugin.settings.exams?.[activeExam]?.questionsPath || plugin.settings.questionsPath}</code></p>
        </div>
      </div>
    );
  }

  const sessionTypes = [
    { value: 'domain_drill', label: 'Practice' },
    { value: 'weak_areas', label: 'Weak Areas' },
    { value: 'mock_exam', label: 'Mock Exam' },
  ];

  const isMock = sessionType === 'mock_exam';

  return (
    <div className="pmp-card pmp-config">
      {/* Session Type */}
      <div className="pmp-field">
        <label className="pmp-section-label">Session Type</label>
        <div className="pmp-grid-3">
          {sessionTypes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSessionType(value as SessionConfigType['session_type'])}
              className={`pmp-option-btn pmp-option-compact ${sessionType === value ? 'pmp-option-active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Domains — hidden for mock */}
      {!isMock && (
        <div className="pmp-field">
          <label className="pmp-section-label">Domains</label>
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

      {/* Question Count — hidden for mock */}
      {!isMock && (
        <div className="pmp-field">
          <label className="pmp-section-label">Questions</label>
          <div className="pmp-grid-4">
            {[10, 20, 30, 50].map(count => (
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
          <p className="pmp-hint">{selectedAvailable} available</p>
        </div>
      )}

      {/* Mock info */}
      {isMock && (
        <div className="pmp-field">
          <p className="pmp-text-muted">
            {activeExam === 'PMP' ? 'Weighted by ECO: People 42%, Process 50%, Business 8%' : 'All domains, weighted by question count'}
            {' — '}{getMockCount()} questions
          </p>
        </div>
      )}

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={!isMock && questionCount > selectedAvailable}
        className="pmp-btn pmp-btn-primary pmp-btn-full"
      >
        {isMock ? `Start Mock (${getMockCount()} questions)` : `Start (${questionCount} questions)`}
      </button>
    </div>
  );
}
