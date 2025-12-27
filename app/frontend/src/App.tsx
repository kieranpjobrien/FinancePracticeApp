import { useState, useCallback, useEffect } from 'react';
import { SessionConfig } from './components/SessionConfig';
import { QuestionView } from './components/QuestionView';
import { SessionResults } from './components/SessionResults';
import { ProgressDashboard } from './components/ProgressDashboard';
import { QuestionBrowser } from './components/QuestionBrowser';
import type { SessionConfig as SessionConfigType, Question, QuestionResult, SessionSummary, PausedSession } from './types';
import { createSession, getSessionQuestion, submitAnswer, completeSession, pauseSession, getPausedSessions, deleteSession } from './api';

type AppState = 'config' | 'practice' | 'results' | 'progress' | 'browse';

interface ActiveSession {
  sessionId: string;
  questions: string[];
  currentIndex: number;
  config: SessionConfigType;
  results: QuestionResult[];
}

function App() {
  const [appState, setAppState] = useState<AppState>('config');
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pausedSessions, setPausedSessions] = useState<PausedSession[]>([]);

  // Load paused sessions on mount
  useEffect(() => {
    getPausedSessions().then(setPausedSessions).catch(console.error);
  }, [appState]);

  const handleStartSession = useCallback(async (config: SessionConfigType) => {
    try {
      setError(null);
      const response = await createSession(config);

      if (response.questions.length === 0) {
        setError('No questions available for the selected criteria.');
        return;
      }

      const newSession: ActiveSession = {
        sessionId: response.session_id,
        questions: response.questions,
        currentIndex: 0,
        config,
        results: [],
      };

      setSession(newSession);

      // Load first question
      const firstQuestion = await getSessionQuestion(
        response.session_id,
        response.questions[0]
      );
      setCurrentQuestion(firstQuestion);
      setAppState('practice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    }
  }, []);

  const handleAnswer = useCallback(async (
    selectedAnswer: string,
    timeSeconds: number,
    confidence: 'guessing' | 'maybe' | 'sure'
  ): Promise<QuestionResult> => {
    if (!session || !currentQuestion) {
      throw new Error('No active session');
    }

    const result = await submitAnswer(
      session.sessionId,
      currentQuestion.id,
      selectedAnswer,
      timeSeconds,
      confidence
    );

    setSession(prev => prev ? {
      ...prev,
      results: [...prev.results, result],
    } : null);

    return result;
  }, [session, currentQuestion]);

  const handleNext = useCallback(async () => {
    if (!session) return;

    const nextIndex = session.currentIndex + 1;

    if (nextIndex >= session.questions.length) {
      // Session complete
      try {
        const sessionSummary = await completeSession(session.sessionId);
        setSummary(sessionSummary);
        setAppState('results');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete session');
      }
    } else {
      // Load next question
      try {
        const nextQuestion = await getSessionQuestion(
          session.sessionId,
          session.questions[nextIndex]
        );
        setCurrentQuestion(nextQuestion);
        setSession(prev => prev ? { ...prev, currentIndex: nextIndex } : null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load question');
      }
    }
  }, [session]);

  const handleNewSession = useCallback(() => {
    setSession(null);
    setCurrentQuestion(null);
    setSummary(null);
    setError(null);
    setAppState('config');
  }, []);

  const handlePauseSession = useCallback(async () => {
    if (!session) return;
    try {
      await pauseSession(session.sessionId);
      setSession(null);
      setCurrentQuestion(null);
      setAppState('config');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause session');
    }
  }, [session]);

  const handleResumeSession = useCallback(async (pausedSession: PausedSession) => {
    try {
      setError(null);
      // The session is already loaded in memory on the backend
      const questionIndex = pausedSession.questions_answered;
      const sessionId = pausedSession.session_id;

      // Get session info
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Session not found');
      const sessionData = await response.json();

      const resumedSession: ActiveSession = {
        sessionId: sessionData.session_id,
        questions: sessionData.questions,
        currentIndex: questionIndex,
        config: {
          session_type: 'mixed',
          topics: pausedSession.topics,
          question_count: pausedSession.questions_total,
          difficulty: 'mixed',
          timed: true,
          time_per_question: 90,
        },
        results: [],
      };

      setSession(resumedSession);

      // Load current question
      const question = await getSessionQuestion(
        sessionId,
        sessionData.questions[questionIndex]
      );
      setCurrentQuestion(question);
      setAppState('practice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume session');
    }
  }, []);

  const handleDeletePausedSession = useCallback(async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      setPausedSessions(prev => prev.filter(s => s.session_id !== sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Finance Practice</h1>
          <div className="flex items-center gap-4">
            {appState === 'practice' && session && (
              <>
                <div className="text-sm text-gray-500">
                  Question {session.currentIndex + 1} of {session.questions.length}
                </div>
                <button
                  onClick={handlePauseSession}
                  className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                >
                  Pause & Exit
                </button>
              </>
            )}
            {appState === 'config' && (
              <>
                <button
                  onClick={() => setAppState('browse')}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Browse Questions
                </button>
                <button
                  onClick={() => setAppState('progress')}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  View Progress
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {appState === 'config' && (
          <>
            {/* Paused Sessions */}
            {pausedSessions.length > 0 && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-3">Paused Sessions</h3>
                <div className="space-y-2">
                  {pausedSessions.map(ps => (
                    <div key={ps.session_id} className="flex items-center justify-between bg-white p-3 rounded border">
                      <div>
                        <div className="text-sm font-medium">
                          {ps.questions_answered}/{ps.questions_total} questions answered
                        </div>
                        <div className="text-xs text-gray-500">
                          Topics: {ps.topics.join(', ')}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResumeSession(ps)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Resume
                        </button>
                        <button
                          onClick={() => handleDeletePausedSession(ps.session_id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <SessionConfig onStart={handleStartSession} />
          </>
        )}

        {appState === 'progress' && (
          <ProgressDashboard onClose={() => setAppState('config')} />
        )}

        {appState === 'browse' && (
          <QuestionBrowser onClose={() => setAppState('config')} />
        )}

        {appState === 'practice' && session && currentQuestion && (
          <QuestionView
            question={currentQuestion}
            questionNumber={session.currentIndex + 1}
            totalQuestions={session.questions.length}
            timed={session.config.timed}
            timePerQuestion={session.config.time_per_question}
            onAnswer={handleAnswer}
            onNext={handleNext}
            showResultImmediately={true}
          />
        )}

        {appState === 'results' && summary && (
          <SessionResults
            summary={summary}
            onNewSession={handleNewSession}
          />
        )}
      </main>
    </div>
  );
}

export default App;
