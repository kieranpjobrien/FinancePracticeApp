import { useState, useEffect, useCallback } from 'react';
import type { Question, QuestionResult } from '../../models';

interface Props {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
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
  question, questionNumber, totalQuestions, onAnswer, onNext,
}: Props) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelectedAnswer(null);
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
      const res = onAnswer(selectedAnswer, timeElapsed, 'maybe');
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  }, [selectedAnswer, timeElapsed, onAnswer, submitting]);

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
          <span className="pmp-text-muted">Q{questionNumber}/{totalQuestions}</span>
          <div className="pmp-text-small">{question.domain} &rsaquo; {question.task}</div>
        </div>
        <span className={`pmp-badge pmp-badge-${question.difficulty.toLowerCase()}`}>
          {question.difficulty}
        </span>
      </div>

      {/* Question */}
      <div className="pmp-question-body">
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
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {result && (
        <div className={`pmp-explanation ${result.is_correct ? 'pmp-explanation-correct' : 'pmp-explanation-wrong'}`}>
          <p className="pmp-explanation-title">{result.is_correct ? 'Correct!' : 'Incorrect'}</p>
          <p className="pmp-explanation-text">{renderMarkdown(result.explanation)}</p>
        </div>
      )}

      {/* Actions */}
      <div className="pmp-actions">
        <div />
        {!result ? (
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer || submitting}
            className="pmp-btn pmp-btn-primary"
          >
            Submit
          </button>
        ) : (
          <button onClick={onNext} className="pmp-btn pmp-btn-primary">
            {questionNumber < totalQuestions ? 'Next' : 'Finish'}
          </button>
        )}
      </div>
    </div>
  );
}
