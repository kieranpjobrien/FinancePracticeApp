import { useState, useCallback, useEffect } from 'react';
import { SessionConfig } from './components/SessionConfig';
import { QuestionView } from './components/QuestionView';
import { SessionResults } from './components/SessionResults';
import { ProgressDashboard } from './components/ProgressDashboard';
import { QuestionBrowser } from './components/QuestionBrowser';
import type { ExamType, ExamInfo, SessionConfig as SessionConfigType, QuestionResult, SessionSummary, PausedSession } from './types';
import { getExams, createSession, getSessionQuestion, submitAnswer, completeSession, pauseSession, getPausedSessions, deleteSession } from './api';

type AppState = 'exam_select' | 'config' | 'practice' | 'results' | 'progress' | 'browse';

const THEME_COLORS: Record<string, { accent: string; badge: string; gradient: string; letter: string }> = {
  cfa: {
    accent: 'indigo',
    badge: 'from-indigo-500 to-purple-600',
    gradient: 'from-indigo-500 to-purple-600',
    letter: 'C',
  },
  pmp: {
    accent: 'teal',
    badge: 'from-teal-500 to-emerald-600',
    gradient: 'from-teal-500 to-emerald-600',
    letter: 'P',
  },
};

function getTheme(examType: string) {
  return THEME_COLORS[examType] || { accent: 'slate', badge: 'from-slate-500 to-slate-600', gradient: 'from-slate-500 to-slate-600', letter: '?' };
}

interface ActiveSession {
  sessionId: string;
  questions: string[];
  currentIndex: number;
  config: SessionConfigType;
  results: QuestionResult[];
}

function App() {
  const [appState, setAppState] = useState<AppState>('exam_select');
  const [exams, setExams] = useState<Record<string, ExamInfo>>({});
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ReturnType<typeof useState<any>>[0]>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pausedSessions, setPausedSessions] = useState<PausedSession[]>([]);

  useEffect(() => {
    getExams().then(setExams).catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    if (examType && appState === 'config') {
      getPausedSessions(examType).then(setPausedSessions).catch(console.error);
    }
  }, [examType, appState]);

  useEffect(() => {
    document.body.className = examType ? `theme-${examType}` : '';
  }, [examType]);

  const theme = examType ? getTheme(examType) : null;
  const examInfo = examType ? exams[examType] : null;

  const handleSelectExam = (et: ExamType) => {
    setExamType(et);
    setAppState('config');
  };

  const handleBackToExams = () => {
    setExamType(null);
    setSession(null);
    setCurrentQuestion(null);
    setSummary(null);
    setError(null);
    setAppState('exam_select');
  };

  const handleStartSession = useCallback(async (config: SessionConfigType) => {
    if (!examType) return;
    try {
      setError(null);
      const response = await createSession(examType, config);
      if (response.questions.length === 0) {
        setError('No questions available for the selected criteria.');
        return;
      }
      setSession({ sessionId: response.session_id, questions: response.questions, currentIndex: 0, config, results: [] });
      const firstQuestion = await getSessionQuestion(examType, response.session_id, response.questions[0]);
      setCurrentQuestion(firstQuestion);
      setAppState('practice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    }
  }, [examType]);

  const handleAnswer = useCallback(async (
    selectedAnswer: string, timeSeconds: number, confidence: 'guessing' | 'maybe' | 'sure'
  ): Promise<QuestionResult> => {
    if (!session || !currentQuestion || !examType) throw new Error('No active session');
    const result = await submitAnswer(examType, session.sessionId, currentQuestion.id, selectedAnswer, timeSeconds, confidence);
    setSession(prev => prev ? { ...prev, results: [...prev.results, result] } : null);
    return result;
  }, [session, currentQuestion, examType]);

  const handleNext = useCallback(async () => {
    if (!session || !examType) return;
    const nextIndex = session.currentIndex + 1;
    if (nextIndex >= session.questions.length) {
      try {
        const s = await completeSession(examType, session.sessionId);
        setSummary(s);
        setAppState('results');
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to complete session'); }
    } else {
      try {
        const q = await getSessionQuestion(examType, session.sessionId, session.questions[nextIndex]);
        setCurrentQuestion(q);
        setSession(prev => prev ? { ...prev, currentIndex: nextIndex } : null);
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load question'); }
    }
  }, [session, examType]);

  const handleNewSession = useCallback(() => {
    setSession(null); setCurrentQuestion(null); setSummary(null); setError(null); setAppState('config');
  }, []);

  const handlePauseSession = useCallback(async () => {
    if (!session || !examType) return;
    try { await pauseSession(examType, session.sessionId); setSession(null); setCurrentQuestion(null); setAppState('config'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to pause session'); }
  }, [session, examType]);

  const handleResumeSession = useCallback(async (ps: PausedSession) => {
    if (!examType) return;
    try {
      setError(null);
      const resp = await fetch(`/api/${examType}/sessions/${ps.session_id}`);
      if (!resp.ok) throw new Error('Session not found');
      const data = await resp.json();
      setSession({
        sessionId: data.session_id, questions: data.questions, currentIndex: ps.questions_answered,
        config: { session_type: 'mixed', categories: ps.categories, question_count: ps.questions_total, difficulty: 'mixed', timed: true, time_per_question: 90 },
        results: [],
      });
      const q = await getSessionQuestion(examType, ps.session_id, data.questions[ps.questions_answered]);
      setCurrentQuestion(q);
      setAppState('practice');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to resume session'); }
  }, [examType]);

  const handleDeletePausedSession = useCallback(async (id: string) => {
    if (!examType) return;
    try { await deleteSession(examType, id); setPausedSessions(prev => prev.filter(s => s.session_id !== id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete session'); }
  }, [examType]);

  // Exam selector screen
  if (appState === 'exam_select') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass p-10 max-w-lg w-full animate-slide-up">
          <h1 className="text-3xl font-bold text-white text-center mb-2">Practice App</h1>
          <p className="text-slate-400 text-center mb-8">Choose an exam to practice</p>
          {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
          <div className="space-y-3">
            {Object.entries(exams).map(([et, info]) => {
              const t = getTheme(et);
              return (
                <button key={et} onClick={() => handleSelectExam(et)}
                  className="w-full flex items-center gap-4 p-5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-left group">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.badge} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {t.letter}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white group-hover:text-white/90">{info.name}</div>
                    <div className="text-sm text-slate-400">{info.total_questions} questions across {info.categories.length} {info.category_label.toLowerCase()}s</div>
                  </div>
                  <span className="text-slate-500 group-hover:text-slate-300 transition-colors">&rarr;</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Main app (exam selected)
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleBackToExams} className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme?.badge} flex items-center justify-center text-white font-bold text-sm shadow-lg hover:opacity-80 transition-opacity`}>
              {theme?.letter}
            </button>
            <h1 className="text-lg font-semibold text-white tracking-tight">{examInfo?.name} Practice</h1>
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
                <button onClick={() => setAppState('progress')} className="px-4 py-2 text-sm font-medium text-emerald-400 bg-emerald-400/10 rounded-lg hover:bg-emerald-400/20 border border-emerald-400/20">Progress</button>
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

        {appState === 'config' && examType && examInfo && (
          <div className="animate-slide-up">
            {pausedSessions.length > 0 && (
              <div className="mb-6 glass p-5">
                <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Paused Sessions</h3>
                <div className="space-y-2">
                  {pausedSessions.map(ps => (
                    <div key={ps.session_id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                      <div>
                        <span className="text-sm font-medium text-slate-200">{ps.questions_answered}/{ps.questions_total} answered</span>
                        <span className="text-xs text-slate-500 ml-3">{ps.categories.join(', ')}</span>
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
            <SessionConfig examType={examType} examInfo={examInfo} onStart={handleStartSession} />
          </div>
        )}

        {appState === 'progress' && examType && <div className="animate-slide-up"><ProgressDashboard examType={examType} examInfo={examInfo!} onClose={() => setAppState('config')} /></div>}
        {appState === 'browse' && examType && <div className="animate-slide-up"><QuestionBrowser examType={examType} examInfo={examInfo!} onClose={() => setAppState('config')} /></div>}
        {appState === 'practice' && session && currentQuestion && examInfo && (
          <div className="animate-fade-in">
            <QuestionView question={currentQuestion} questionNumber={session.currentIndex + 1} totalQuestions={session.questions.length}
              timed={session.config.timed} timePerQuestion={session.config.time_per_question}
              categoryLabel={examInfo.category_label} subcategoryLabel={examInfo.subcategory_label}
              onAnswer={handleAnswer} onNext={handleNext} showResultImmediately={true} />
          </div>
        )}
        {appState === 'results' && summary && examInfo && <div className="animate-slide-up"><SessionResults summary={summary} categoryLabel={examInfo.category_label} onNewSession={handleNewSession} /></div>}
      </main>
    </div>
  );
}

export default App;
