import { useState, useEffect, useCallback } from 'react';
import type { Question, QuestionResult } from '../../models';

interface Props {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  timed: boolean;
  timePerQuestion: number;
  onAnswer: (selectedAnswer: string, timeSeconds: number, confidence: 'guessing' | 'maybe' | 'sure') => QuestionResult | null;
  onNext: () => void;
}

function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return <span key={j}>{part}</span>;
    });
    return <span key={i}>{rendered}{i < text.split('\n').length - 1 && '\n'}</span>;
  });
}

export function QuestionView({
  question, questionNumber, totalQuestions, timed, timePerQuestion, onAnswer, onNext,
}: Props) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<'guessing' | 'maybe' | 'sure'>('maybe');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelectedAnswer(null);
    setConfidence('maybe');
    setTimeElapsed(0);
    setResult(null);
  }, [question.id]);

  useEffect(() => {
    if (result) return;
    const interval = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [result]);

  const handleSubmit = useCallback(() => {
    if (!selectedAnswer || submitting) return;
    setSubmitting(true);
    try {
      const res = onAnswer(selectedAnswer, timeElapsed, confidence);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  }, [selectedAnswer, timeElapsed, confidence, onAnswer, submitting]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeRemaining = timed ? Math.max(0, timePerQuestion - timeElapsed) : null;
  const isOvertime = timed && timeElapsed > timePerQuestion;
  const progressPercent = (questionNumber / totalQuestions) * 100;

  return (
    <div className="pmp-card pmp-question-card">
      {/* Progress bar */}
      <div className="pmp-progress-track">
        <div className="pmp-progress-bar" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Header */}
      <div className="pmp-question-header">
        <div>
          <span className="pmp-text-muted">Question {questionNumber} of {totalQuestions}</span>
          <div className="pmp-text-small">{question.domain} &rsaquo; {question.task}</div>
        </div>
        <div className={`pmp-timer ${isOvertime ? 'pmp-timer-overtime' : ''}`}>
          {timed ? formatTime(timeRemaining!) : <span className="pmp-text-muted">{formatTime(timeElapsed)}</span>}
        </div>
      </div>

      {/* Question */}
      <div className="pmp-question-body">
        <span className={`pmp-badge pmp-badge-${question.difficulty.toLowerCase()}`}>
          {question.difficulty}
        </span>
        <p className="pmp-question-text">{question.question}</p>
      </div>

      {/* Options */}
      <div className="pmp-options">
        {Object.entries(question.options).map(([key, text]) => {
          const isSelected = selectedAnswer === key;
          const isCorrect = result?.correct_answer === key;
          const isWrong = result && isSelected && !result.is_correct;

          let cls = 'pmp-option';
          if (result) {
            if (isCorrect) cls += ' pmp-option-correct';
            else if (isWrong) cls += ' pmp-option-wrong';
            else cls += ' pmp-option-faded';
          } else if (isSelected) {
            cls += ' pmp-option-selected';
          }

          return (
            <button
              key={key}
              onClick={() => !result && setSelectedAnswer(key)}
              disabled={!!result}
              className={cls}
            >
              <span className="pmp-option-key">{key}</span>
              <span className="pmp-option-text">{text}</span>
              {result && isCorrect && <span className="pmp-option-label pmp-text-success">Correct</span>}
              {result && isWrong && <span className="pmp-option-label pmp-text-danger">Wrong</span>}
            </button>
          );
        })}
      </div>

      {/* Confidence */}
      {!result && (
        <div className="pmp-confidence">
          <label className="pmp-section-label">Confidence</label>
          <div className="pmp-btn-group">
            {([
              { value: 'guessing' as const, label: 'Guessing' },
              { value: 'maybe' as const, label: 'Maybe' },
              { value: 'sure' as const, label: 'Sure' },
            ]).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setConfidence(value)}
                className={`pmp-confidence-btn ${confidence === value ? `pmp-confidence-${value}` : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Explanation */}
      {result && (
        <div className={`pmp-explanation ${result.is_correct ? 'pmp-explanation-correct' : 'pmp-explanation-wrong'}`}>
          <p className="pmp-explanation-title">{result.is_correct ? 'Correct!' : 'Incorrect'}</p>
          <p className="pmp-explanation-text">{renderMarkdown(result.explanation)}</p>
        </div>
      )}

      {/* Actions */}
      <div className="pmp-actions">
        <span className="pmp-text-muted pmp-timer-small">{formatTime(timeElapsed)}</span>
        {!result ? (
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer || submitting}
            className="pmp-btn pmp-btn-primary"
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        ) : (
          <button onClick={onNext} className="pmp-btn pmp-btn-primary">
            {questionNumber < totalQuestions ? 'Next Question' : 'Finish Session'}
          </button>
        )}
      </div>
    </div>
  );
}
