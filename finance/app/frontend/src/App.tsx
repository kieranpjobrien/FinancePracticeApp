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
        sessionId: response.session_id, questions: response.questions,
        currentIndex: 0, config, results: [],
      };
      setSession(newSession);
      const firstQuestion = await getSessionQuestion(response.session_id, response.questions[0]);
      setCurrentQuestion(firstQuestion);
      setAppState('practice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    }
  }, []);

  const handleAnswer = useCallback(async (
    selectedAnswer: string, timeSeconds: number, confidence: 'guessing' | 'maybe' | 'sure'
  ): Promise<QuestionResult> => {
    if (!session || !currentQuestion) throw new Error('No active session');
    const result = await submitAnswer(session.sessionId, currentQuestion.id, selectedAnswer, timeSeconds, confidence);
    setSession(prev => prev ? { ...prev, results: [...prev.results, result] } : null);
    return result;
  }, [session, currentQuestion]);

  const handleNext = useCallback(async () => {
    if (!session) return;
    const nextIndex = session.currentIndex + 1;
    if (nextIndex >= session.questions.length) {
      try {
        const s = await completeSession(session.sessionId);
        setSummary(s);
        setAppState('results');
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to complete session'); }
    } else {
      try {
        const q = await getSessionQuestion(session.sessionId, session.questions[nextIndex]);
        setCurrentQuestion(q);
        setSession(prev => prev ? { ...prev, currentIndex: nextIndex } : null);
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load question'); }
    }
  }, [session]);

  const handleNewSession = useCallback(() => {
    setSession(null); setCurrentQuestion(null); setSummary(null); setError(null); setAppState('config');
  }, []);

  const handlePauseSession = useCallback(async () => {
    if (!session) return;
    try { await pauseSession(session.sessionId); setSession(null); setCurrentQuestion(null); setAppState('config'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to pause session'); }
  }, [session]);

  const handleResumeSession = useCallback(async (ps: PausedSession) => {
    try {
      setError(null);
      const resp = await fetch(`/api/sessions/${ps.session_id}`);
      if (!resp.ok) throw new Error('Session not found');
      const data = await resp.json();
      setSession({
        sessionId: data.session_id, questions: data.questions, currentIndex: ps.questions_answered,
        config: { session_type: 'mixed', topics: ps.topics, question_count: ps.questions_total, difficulty: 'mixed', timed: true, time_per_question: 90 },
        results: [],
      });
      const q = await getSessionQuestion(ps.session_id, data.questions[ps.questions_answered]);
      setCurrentQuestion(q);
      setAppState('practice');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to resume session'); }
  }, []);

  const handleDeletePausedSession = useCallback(async (id: string) => {
    try { await deleteSession(id); setPausedSessions(prev => prev.filter(s => s.session_id !== id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete session'); }
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">C</div>
            <h1 className="text-lg font-semibold text-white tracking-tight">Finance Practice</h1>
            {appState === 'practice' && session && (
              <span className="ml-4 px-2.5 py-0.5 rounded-full bg-white/5 text-xs text-slate-400 font-mono border border-white/5">
                {session.currentIndex + 1} / {session.questions.length}
              </span>
            )}
          </div>
          <nav className="flex items-center gap-2">
            {appState === 'practice' && session && (
              <button onClick={handlePauseSession} className="px-4 py-2 text-sm font-medium text-amber-400 bg-amber-400/10 rounded-lg hover:bg-amber-400/20 border border-amber-400/20">Pause</button>
            )}
            {appState === 'config' && (
              <>
                <button onClick={() => setAppState('browse')} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg">Browse</button>
                <button onClick={() => setAppState('progress')} className="px-4 py-2 text-sm font-medium text-indigo-400 bg-indigo-400/10 rounded-lg hover:bg-indigo-400/20 border border-indigo-400/20">Progress</button>
              </>
            )}
            {(appState === 'progress' || appState === 'browse') && (
              <button onClick={() => setAppState('config')} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg">&larr; Back</button>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400 text-xs ml-4">Dismiss</button>
            </div>
          </div>
        )}

        {appState === 'config' && (
          <div className="animate-slide-up">
            {pausedSessions.length > 0 && (
              <div className="mb-6 glass p-5">
                <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Paused Sessions</h3>
                <div className="space-y-2">
                  {pausedSessions.map(ps => (
                    <div key={ps.session_id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                      <div>
                        <span className="text-sm font-medium text-slate-200">{ps.questions_answered}/{ps.questions_total} answered</span>
                        <span className="text-xs text-slate-500 ml-3">{ps.topics.join(', ')}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleResumeSession(ps)} className="px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 rounded-md hover:bg-emerald-400/20">Resume</button>
                        <button onClick={() => handleDeletePausedSession(ps.session_id)} className="px-3 py-1.5 text-xs font-medium text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-md">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <SessionConfig onStart={handleStartSession} />
          </div>
        )}

        {appState === 'progress' && <div className="animate-slide-up"><ProgressDashboard onClose={() => setAppState('config')} /></div>}
        {appState === 'browse' && <div className="animate-slide-up"><QuestionBrowser onClose={() => setAppState('config')} /></div>}
        {appState === 'practice' && session && currentQuestion && (
          <div className="animate-fade-in">
            <QuestionView question={currentQuestion} questionNumber={session.currentIndex + 1} totalQuestions={session.questions.length}
              timed={session.config.timed} timePerQuestion={session.config.time_per_question} onAnswer={handleAnswer} onNext={handleNext} showResultImmediately={true} />
          </div>
        )}
        {appState === 'results' && summary && <div className="animate-slide-up"><SessionResults summary={summary} onNewSession={handleNewSession} /></div>}
      </main>
    </div>
  );
}

export default App;
