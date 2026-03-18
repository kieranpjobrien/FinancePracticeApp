import { useState, useEffect, useCallback } from 'react';
import type { Question, QuestionResult } from '../types';

interface Props {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  timed: boolean;
  timePerQuestion: number;
  onAnswer: (
    selectedAnswer: string,
    timeSeconds: number,
    confidence: 'guessing' | 'maybe' | 'sure'
  ) => Promise<QuestionResult>;
  onNext: () => void;
  showResultImmediately: boolean;
}

export function QuestionView({
  question,
  questionNumber,
  totalQuestions,
  timed,
  timePerQuestion,
  onAnswer,
  onNext,
  showResultImmediately,
}: Props) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<'guessing' | 'maybe' | 'sure'>('maybe');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [result, setResult] = useState<QuestionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setConfidence('maybe');
    setTimeElapsed(0);
    setResult(null);
  }, [question.id]);

  // Timer
  useEffect(() => {
    if (result) return; // Stop timer after answering

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [result]);

  const handleSubmit = useCallback(async () => {
    if (!selectedAnswer || submitting) return;

    setSubmitting(true);
    try {
      const res = await onAnswer(selectedAnswer, timeElapsed, confidence);
      setResult(res);
    } catch (err) {
      console.error('Failed to submit answer:', err);
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
    <div className="glass max-w-3xl mx-auto animate-fade-in overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-white/5">
        <div
          className="progress-bar h-full bg-gradient-to-r from-teal-500 to-emerald-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div>
          <span className="text-sm text-slate-400">
            Question {questionNumber} of {totalQuestions}
          </span>
          <div className="text-xs text-slate-500 mt-0.5">
            {question.domain} &rsaquo; {question.task}
          </div>
        </div>
        <div className={`text-lg font-mono tabular-nums ${
          isOvertime ? 'text-red-400' : 'text-slate-300'
        }`}>
          {timed ? (
            <span>{formatTime(timeRemaining!)}</span>
          ) : (
            <span className="text-slate-500">{formatTime(timeElapsed)}</span>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="p-6">
        <div className="mb-3">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
            question.difficulty === 'Easy'
              ? 'bg-emerald-500/10 text-emerald-400'
              : question.difficulty === 'Medium'
              ? 'bg-amber-500/10 text-amber-400'
              : 'bg-red-500/10 text-red-400'
          }`}>
            {question.difficulty}
          </span>
        </div>
        <p className="text-lg text-white leading-relaxed whitespace-pre-wrap">
          {question.question}
        </p>
      </div>

      {/* Options */}
      <div className="px-6 pb-4 space-y-2.5">
        {Object.entries(question.options).map(([key, text]) => {
          const isSelected = selectedAnswer === key;
          const isCorrect = result?.correct_answer === key;
          const isWrong = result && isSelected && !result.is_correct;

          let classes = 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10';
          if (result) {
            if (isCorrect) classes = 'bg-emerald-500/10 border-emerald-500/30';
            else if (isWrong) classes = 'bg-red-500/10 border-red-500/30';
            else classes = 'bg-white/[0.02] border-white/5 opacity-60';
          } else if (isSelected) {
            classes = 'bg-teal-500/15 border-teal-500/40 ring-1 ring-teal-500/20';
          }

          return (
            <button
              key={key}
              onClick={() => !result && setSelectedAnswer(key)}
              disabled={!!result}
              className={`w-full text-left p-4 rounded-xl border transition-all ${classes} ${
                result ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 text-sm font-semibold text-slate-300 mr-3">
                {key}
              </span>
              <span className="text-slate-200">{text}</span>
              {result && isCorrect && (
                <span className="float-right text-emerald-400 font-semibold mt-0.5">Correct</span>
              )}
              {result && isWrong && (
                <span className="float-right text-red-400 font-semibold mt-0.5">Wrong</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Confidence selector (before answering) */}
      {!result && (
        <div className="px-6 pb-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Confidence
          </label>
          <div className="flex gap-2">
            {[
              { value: 'guessing', label: 'Guessing' },
              { value: 'maybe', label: 'Maybe' },
              { value: 'sure', label: 'Sure' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setConfidence(value as typeof confidence)}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                  confidence === value
                    ? value === 'guessing'
                      ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30'
                      : value === 'maybe'
                      ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result / Explanation */}
      {result && showResultImmediately && (
        <div className={`mx-6 mb-4 p-5 rounded-xl animate-slide-up ${
          result.is_correct
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          <p className={`font-semibold mb-2 ${
            result.is_correct ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {result.is_correct ? 'Correct!' : 'Incorrect'}
          </p>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
            {result.explanation}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
        <div className="text-sm text-slate-500 tabular-nums">
          {formatTime(timeElapsed)}
        </div>
        {!result ? (
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer || submitting}
            className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-medium rounded-xl hover:from-teal-400 hover:to-emerald-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        ) : (
          <button
            onClick={onNext}
            className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-medium rounded-xl hover:from-teal-400 hover:to-emerald-500 transition-all"
          >
            {questionNumber < totalQuestions ? 'Next Question' : 'Finish Session'}
          </button>
        )}
      </div>
    </div>
  );
}
