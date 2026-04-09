import { useState, useCallback, useEffect } from 'react';
import type PMPPracticePlugin from '../main';
import type {
  SessionConfig as SessionConfigType,
  QuestionResult,
  SessionSummary,
  PausedSession,
  Question,
} from '../models';
import { SessionConfigPanel } from './components/SessionConfig';
import { QuestionView } from './components/QuestionView';
import { SessionResults } from './components/SessionResults';
import { ProgressDashboard } from './components/ProgressDashboard';
import { QuestionBrowser } from './components/QuestionBrowser';

type AppState = 'config' | 'practice' | 'results' | 'progress' | 'browse';

interface ActiveSession {
  sessionId: string;
  questions: string[];
  currentIndex: number;
  config: SessionConfigType;
  results: QuestionResult[];
}

interface Props {
  plugin: PMPPracticePlugin;
}

export function App({ plugin }: Props) {
  const [appState, setAppState] = useState<AppState>('config');
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pausedSessions, setPausedSessions] = useState<PausedSession[]>([]);
  const [activeExam, setActiveExam] = useState<string>(plugin.settings.activeExam || 'PMP');
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    setPausedSessions(plugin.sessionManager.getPausedSessions());
  }, [appState, activeExam]);

  const handleSwitchExam = useCallback(async (examName: string) => {
    if (examName === activeExam || switching) return;
    setSwitching(true);
    try {
      await plugin.switchExam(examName);
      setActiveExam(examName);
      setSession(null);
      setCurrentQuestion(null);
      setSummary(null);
      setError(null);
      setAppState('config');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch exam');
    } finally {
      setSwitching(false);
    }
  }, [activeExam, switching, plugin]);

  const handleStartSession = useCallback((config: SessionConfigType) => {
    try {
      setError(null);
      const sessionState = plugin.sessionManager.createSession(config);
      if (sessionState.questions.length === 0) {
        setError('No questions available for the selected criteria.');
        return;
      }
      const newSession: ActiveSession = {
        sessionId: sessionState.session_id,
        questions: sessionState.questions,
        currentIndex: 0,
        config,
        results: [],
      };
      setSession(newSession);
      const firstQ = plugin.questionBank.getQuestion(sessionState.questions[0]);
      if (firstQ) {
        setCurrentQuestion({
          ...firstQ,
        });
      }
      setAppState('practice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    }
  }, [plugin]);

  const handleAnswer = useCallback((
    selectedAnswer: string, timeSeconds: number, confidence: 'guessing' | 'maybe' | 'sure'
  ): QuestionResult | null => {
    if (!session || !currentQuestion) return null;

    const result = plugin.sessionManager.submitAnswer(session.sessionId, {
      question_id: currentQuestion.id,
      selected_answer: selectedAnswer,
      time_seconds: timeSeconds,
      confidence,
    });

    if (result) {
      setSession(prev => prev ? { ...prev, results: [...prev.results, result] } : null);
    }
    return result;
  }, [session, currentQuestion, plugin]);

  const handleNext = useCallback(async () => {
    if (!session) return;
    const nextIndex = session.currentIndex + 1;
    if (nextIndex >= session.questions.length) {
      try {
        const s = await plugin.sessionManager.completeSession(session.sessionId);
        if (s) {
          setSummary(s);
          setAppState('results');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete session');
      }
    } else {
      const q = plugin.questionBank.getQuestion(session.questions[nextIndex]);
      if (q) {
        setCurrentQuestion({ ...q });
        setSession(prev => prev ? { ...prev, currentIndex: nextIndex } : null);
      }
    }
  }, [session, plugin]);

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
      const data = await plugin.loadData() || {};
      await plugin.sessionManager.pauseSession(session.sessionId, plugin.saveData.bind(plugin), data);
      setSession(null);
      setCurrentQuestion(null);
      setAppState('config');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause session');
    }
  }, [session, plugin]);

  const handleResumeSession = useCallback((ps: PausedSession) => {
    try {
      setError(null);
      const sessionState = plugin.sessionManager.getSession(ps.session_id);
      if (!sessionState) {
        setError('Session not found');
        return;
      }
      setSession({
        sessionId: sessionState.session_id,
        questions: sessionState.questions,
        currentIndex: ps.questions_answered,
        config: sessionState.config,
        results: [],
      });
      const q = plugin.questionBank.getQuestion(sessionState.questions[ps.questions_answered]);
      if (q) {
        setCurrentQuestion({ ...q });
        setAppState('practice');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume session');
    }
  }, [plugin]);

  const handleDeletePausedSession = useCallback(async (id: string) => {
    try {
      const data = await plugin.loadData() || {};
      await plugin.sessionManager.deletePausedSession(id, plugin.saveData.bind(plugin), data);
      setPausedSessions(prev => prev.filter(s => s.session_id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  }, [plugin]);

  return (
    <div className="pmp-app">
      {/* Header */}
      <header className="pmp-header">
        <div className="pmp-header-inner">
          <div className="pmp-header-left">
            {appState !== 'practice' ? (
              <div className="pmp-exam-selector">
                {plugin.getExamNames().map(name => (
                  <button
                    key={name}
                    onClick={() => handleSwitchExam(name)}
                    disabled={switching}
                    className={`pmp-exam-tab ${activeExam === name ? 'pmp-exam-tab-active' : ''}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="pmp-logo">{activeExam[0]}</div>
                <h1 className="pmp-title">{activeExam}</h1>
                <span className="pmp-counter">
                  {session ? `${session.currentIndex + 1} / ${session.questions.length}` : ''}
                </span>
              </>
            )}
          </div>
          <nav className="pmp-nav">
            {appState === 'practice' && session && (
              <button onClick={handlePauseSession} className="pmp-btn pmp-btn-warning">Pause</button>
            )}
            {appState === 'config' && null}
            {false && (
              <button onClick={() => setAppState('config')} className="pmp-btn pmp-btn-ghost">&larr; Back</button>
            )}
          </nav>
        </div>
      </header>

      <main className="pmp-main">
        {error && (
          <div className="pmp-error">
            <p>{error}</p>
            <button onClick={() => setError(null)} className="pmp-error-dismiss">Dismiss</button>
          </div>
        )}

        {appState === 'config' && (
          <div>
            {pausedSessions.length > 0 && (
              <div className="pmp-card pmp-paused-list">
                <h3 className="pmp-section-label pmp-text-warning">Paused Sessions</h3>
                <div className="pmp-paused-items">
                  {pausedSessions.map(ps => (
                    <div key={ps.session_id} className="pmp-paused-item">
                      <div>
                        <span className="pmp-paused-info">{ps.questions_answered}/{ps.questions_total} answered</span>
                        <span className="pmp-paused-domains">{ps.domains.join(', ')}</span>
                      </div>
                      <div className="pmp-paused-actions">
                        <button onClick={() => handleResumeSession(ps)} className="pmp-btn-sm pmp-btn-success">Resume</button>
                        <button onClick={() => handleDeletePausedSession(ps.session_id)} className="pmp-btn-sm pmp-btn-danger">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <SessionConfigPanel onStart={handleStartSession} plugin={plugin} activeExam={activeExam} />
          </div>
        )}

        {appState === 'progress' && <ProgressDashboard plugin={plugin} onClose={() => setAppState('config')} />}
        {appState === 'browse' && <QuestionBrowser plugin={plugin} onClose={() => setAppState('config')} />}
        {appState === 'practice' && session && currentQuestion && (
          <QuestionView
            question={currentQuestion}
            questionNumber={session.currentIndex + 1}
            totalQuestions={session.questions.length}
            onAnswer={handleAnswer}
            onNext={handleNext}
          />
        )}
        {appState === 'results' && summary && (
          <SessionResults summary={summary} onNewSession={handleNewSession} />
        )}
      </main>
    </div>
  );
}
