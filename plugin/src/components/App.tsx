import { useState, useCallback, useEffect, useRef } from "react";
import type { App as ObsidianApp } from "obsidian";
import type { ExamType, PluginSettings, SessionConfig, QuestionResult, SessionSummary, PausedSession, Question } from "../types";
import { EXAM_CONFIGS } from "../types";
import { QuestionBank } from "../QuestionBank";
import { SessionManager } from "../SessionManager";
import { SessionConfigView } from "./SessionConfig";
import { QuestionView } from "./QuestionView";
import { SessionResults } from "./SessionResults";

type AppState = "loading" | "config" | "practice" | "results";

interface Props {
  app: ObsidianApp;
  settings: PluginSettings;
  saveSettings: () => Promise<void>;
}

interface ExamBank {
  qb: QuestionBank;
  sm: SessionManager;
}

export function App({ app, settings, saveSettings }: Props) {
  const banks = useRef<Map<ExamType, ExamBank>>(new Map());

  const [appState, setAppState] = useState<AppState>("loading");
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [pausedSessions, setPausedSessions] = useState<PausedSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  const examConfig = examType ? EXAM_CONFIGS[examType] : null;
  const entry = examType ? banks.current.get(examType) : undefined;

  const handleSelectExam = useCallback(async (et: ExamType) => {
    setError(null);
    setExamType(et);
    settings.lastExam = et;
    void saveSettings();

    try {
      let bank = banks.current.get(et);
      if (!bank) {
        setAppState("loading");
        const qb = new QuestionBank(app, settings, et);
        await qb.loadIndex();
        const sm = new SessionManager(app, settings, et, qb);
        bank = { qb, sm };
        banks.current.set(et, bank);
      }
      const paused = await bank.sm.loadPausedSessions();
      setPausedSessions(paused);
      setAppState("config");
    } catch (e) {
      setError(`Failed to load questions: ${e}`);
      setAppState("config");
    }
  }, [app, settings, saveSettings]);

  useEffect(() => {
    const initial: ExamType = settings.lastExam ?? "cfa";
    void handleSelectExam(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartSession = useCallback(async (config: SessionConfig) => {
    const bank = examType ? banks.current.get(examType) : undefined;
    if (!bank) return;
    setError(null);
    try {
      const session = bank.sm.createSession(config);
      if (session.questions.length === 0) {
        setError("No questions available for the selected criteria.");
        return;
      }
      setTotalQuestions(session.questions.length);
      setQuestionIndex(0);
      setAppState("loading");
      const q = await bank.qb.loadQuestion(session.questions[0]);
      setCurrentQuestion(q);
      setAppState("practice");
    } catch (e) {
      setError(`Failed to start session: ${e}`);
      setAppState("config");
    }
  }, [examType]);

  const handleAnswer = useCallback(async (
    selectedAnswer: string, timeSeconds: number, confidence: string
  ): Promise<QuestionResult | null> => {
    const bank = examType ? banks.current.get(examType) : undefined;
    if (!bank || !currentQuestion) return null;
    return bank.sm.submitAnswer(currentQuestion.id, selectedAnswer, timeSeconds, confidence);
  }, [examType, currentQuestion]);

  const handleNext = useCallback(async () => {
    const bank = examType ? banks.current.get(examType) : undefined;
    const session = bank?.sm.activeSession;
    if (!bank || !session) return;

    const nextIdx = questionIndex + 1;
    if (nextIdx >= session.questions.length) {
      const s = await bank.sm.completeSession();
      setSummary(s);
      setAppState("results");
    } else {
      session.currentIndex = nextIdx;
      setQuestionIndex(nextIdx);
      const q = await bank.qb.loadQuestion(session.questions[nextIdx]);
      setCurrentQuestion(q);
    }
  }, [examType, questionIndex]);

  const handlePause = useCallback(async () => {
    const bank = examType ? banks.current.get(examType) : undefined;
    if (!bank) return;
    await bank.sm.savePausedSession();
    bank.sm.activeSession = null;
    setCurrentQuestion(null);
    const paused = await bank.sm.loadPausedSessions();
    setPausedSessions(paused);
    setAppState("config");
  }, [examType]);

  const handleResume = useCallback(async (ps: PausedSession) => {
    const bank = examType ? banks.current.get(examType) : undefined;
    if (!bank) return;
    const session = await bank.sm.resumePausedSession(ps.sessionId);
    if (!session) return;
    setTotalQuestions(session.questions.length);
    setQuestionIndex(session.currentIndex);
    setAppState("loading");
    const q = await bank.qb.loadQuestion(session.questions[session.currentIndex]);
    setCurrentQuestion(q);
    setPausedSessions((prev) => prev.filter((s) => s.sessionId !== ps.sessionId));
    setAppState("practice");
  }, [examType]);

  const handleDeletePaused = useCallback(async (sessionId: string) => {
    const bank = examType ? banks.current.get(examType) : undefined;
    if (!bank) return;
    await bank.sm.deletePausedSession(sessionId);
    setPausedSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
  }, [examType]);

  const handleNewSession = useCallback(() => {
    setCurrentQuestion(null);
    setSummary(null);
    setError(null);
    setAppState("config");
  }, []);

  return (
    <div className="pmp-app">
      <header className="pmp-header">
        <div className="pmp-header-inner">
          <div className="pmp-header-left">
            <div className="pmp-logo">{examType === "cfa" ? "C" : examType === "pmp" ? "P" : "P2"}</div>
            {appState === "practice" ? (
              <>
                <h1 className="pmp-title">{examConfig?.name}</h1>
                <span className="pmp-counter">{questionIndex + 1} / {totalQuestions}</span>
              </>
            ) : (
              <div className="pmp-exam-selector">
                {(Object.keys(EXAM_CONFIGS) as ExamType[]).map((et) => (
                  <button
                    key={et}
                    className={`pmp-exam-tab ${examType === et ? "pmp-exam-tab-active" : ""}`}
                    onClick={() => handleSelectExam(et)}
                    disabled={appState === "loading"}
                  >
                    {EXAM_CONFIGS[et].name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="pmp-nav">
            {appState === "practice" && (
              <button className="pmp-btn pmp-btn-sm pmp-btn-warning" onClick={handlePause}>Pause</button>
            )}
          </div>
        </div>
      </header>

      <div className="pmp-main">
        {error && (
          <div className="pmp-error">
            <p>{error}</p>
            <button className="pmp-error-dismiss" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {appState === "loading" && <div className="pmp-center pmp-text-muted">Loading…</div>}

        {appState === "config" && examConfig && entry && (
          <div className="pmp-config">
            {pausedSessions.length > 0 && (
              <div className="pmp-paused-list">
                <span className="pmp-section-label">Paused Sessions</span>
                <div className="pmp-paused-items">
                  {pausedSessions.map((ps) => (
                    <div key={ps.sessionId} className="pmp-paused-item">
                      <span className="pmp-paused-info">{ps.questionsAnswered}/{ps.questionsTotal} answered</span>
                      <div className="pmp-paused-actions">
                        <button className="pmp-btn pmp-btn-sm pmp-btn-success" onClick={() => handleResume(ps)}>Resume</button>
                        <button className="pmp-btn pmp-btn-sm pmp-btn-danger" onClick={() => handleDeletePaused(ps.sessionId)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <SessionConfigView examConfig={examConfig} questionBank={entry.qb} onStart={handleStartSession} />
          </div>
        )}

        {appState === "practice" && currentQuestion && (
          <QuestionView
            question={currentQuestion}
            questionNumber={questionIndex + 1}
            totalQuestions={totalQuestions}
            onAnswer={handleAnswer}
            onNext={handleNext}
          />
        )}

        {appState === "results" && summary && examConfig && (
          <SessionResults summary={summary} categoryLabel={examConfig.categoryLabel} onNewSession={handleNewSession} />
        )}
      </div>
    </div>
  );
}
