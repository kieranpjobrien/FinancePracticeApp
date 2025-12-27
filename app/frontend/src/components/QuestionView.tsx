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

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <span className="text-sm text-gray-500">Question {questionNumber} of {totalQuestions}</span>
          <div className="text-xs text-gray-400">{question.topic} › {question.subtopic}</div>
        </div>
        <div className={`text-lg font-mono ${isOvertime ? 'text-red-600' : 'text-gray-700'}`}>
          {timed ? (
            <span>⏱️ {formatTime(timeRemaining!)}</span>
          ) : (
            <span className="text-gray-400">{formatTime(timeElapsed)}</span>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="p-6">
        <div className="mb-2">
          <span className={`text-xs px-2 py-1 rounded ${
            question.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
            question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {question.difficulty}
          </span>
        </div>
        <p className="text-lg text-gray-800 leading-relaxed whitespace-pre-wrap">
          {question.question}
        </p>
      </div>

      {/* Options */}
      <div className="px-6 pb-4 space-y-3">
        {Object.entries(question.options).map(([key, text]) => {
          const isSelected = selectedAnswer === key;
          const isCorrect = result?.correct_answer === key;
          const isWrong = result && isSelected && !result.is_correct;

          let bgClass = 'bg-white border-gray-200 hover:border-blue-400';
          if (result) {
            if (isCorrect) bgClass = 'bg-green-50 border-green-500';
            else if (isWrong) bgClass = 'bg-red-50 border-red-500';
          } else if (isSelected) {
            bgClass = 'bg-blue-50 border-blue-500';
          }

          return (
            <button
              key={key}
              onClick={() => !result && setSelectedAnswer(key)}
              disabled={!!result}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${bgClass} ${
                result ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <span className="font-semibold text-gray-600 mr-3">{key}</span>
              <span className="text-gray-800">{text}</span>
              {result && isCorrect && <span className="float-right text-green-600">✓</span>}
              {result && isWrong && <span className="float-right text-red-600">✗</span>}
            </button>
          );
        })}
      </div>

      {/* Confidence selector (before answering) */}
      {!result && (
        <div className="px-6 pb-4">
          <label className="block text-sm text-gray-600 mb-2">How confident are you?</label>
          <div className="flex gap-2">
            {[
              { value: 'guessing', label: '😰 Guessing', color: 'red' },
              { value: 'maybe', label: '😐 Maybe', color: 'yellow' },
              { value: 'sure', label: '😊 Sure', color: 'green' },
            ].map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() => setConfidence(value as typeof confidence)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${
                  confidence === value
                    ? `bg-${color}-100 border-${color}-400 text-${color}-700`
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={{
                  backgroundColor: confidence === value
                    ? color === 'red' ? '#fee2e2'
                    : color === 'yellow' ? '#fef3c7'
                    : '#d1fae5'
                    : undefined,
                  borderColor: confidence === value
                    ? color === 'red' ? '#f87171'
                    : color === 'yellow' ? '#fbbf24'
                    : '#34d399'
                    : undefined,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result / Explanation */}
      {result && showResultImmediately && (
        <div className={`mx-6 mb-4 p-4 rounded-lg ${
          result.is_correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`font-semibold mb-2 ${result.is_correct ? 'text-green-700' : 'text-red-700'}`}>
            {result.is_correct ? '✓ Correct!' : '✗ Incorrect'}
          </p>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{result.explanation}</p>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg flex justify-between">
        <div className="text-sm text-gray-500">
          Time: {formatTime(timeElapsed)}
        </div>
        {!result ? (
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer || submitting}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        ) : (
          <button
            onClick={onNext}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {questionNumber < totalQuestions ? 'Next Question →' : 'Finish Session'}
          </button>
        )}
      </div>
    </div>
  );
}
