import { useState, useCallback, useEffect } from "react";
import type { App as ObsidianApp } from "obsidian";
import type { ExamType, ExamConfig, PluginSettings, SessionConfig, QuestionResult, SessionSummary, PausedSession, Question } from "../types";
import { EXAM_CONFIGS } from "../types";
import { QuestionBank } from "../QuestionBank";
import { SessionManager } from "../SessionManager";
import { SessionConfigView } from "./SessionConfig";
import { QuestionView } from "./QuestionView";
import { SessionResults } from "./SessionResults";
import { ProgressDashboard } from "./ProgressDashboard";

type AppState = "exam_select" | "loading" | "config" | "practice" | "results" | "progress";

interface Props {
  app: ObsidianApp;
  settings: PluginSettings;
}

export function App({ app, settings }: Props) {
  const [appState, setAppState] = useState<AppState>("exam_select");
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [questionBank, setQuestionBank] = useState<QuestionBank | null>(null);
  const [sessionManager, setSessionManager] = useState<SessionManager | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [pausedSessions, setPausedSessions] = useState<PausedSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSelectExam = useCallback(async (et: ExamType) => {
    setExamType(et);
    setExamConfig(EXAM_CONFIGS[et]);
    setAppState("loading");
    setError(null);

    try {
      const qb = new QuestionBank(app, settings, et);
      await qb.loadAll();
      const sm = new SessionManager(app, settings, et, qb);
      setQuestionBank(qb);
      setSessionManager(sm);

      const paused = await sm.loadPausedSessions();
      setPausedSessions(paused);
      setAppState("config");
    } catch (e) {
      setError(`Failed to load questions: ${e}`);
      setAppState("exam_select");
    }
  }, [app, settings]);

  const handleBackToExams = useCallback(() => {
    setExamType(null);
    setExamConfig(null);
    setQuestionBank(null);
    setSessionManager(null);
    setCurrentQuestion(null);
    setSummary(null);
    setError(null);
    setAppState("exam_select");
  }, []);

  const handleStartSession = useCallback((config: SessionConfig) => {
    if (!sessionManager || !questionBank) return;
    setError(null);
    try {
      const session = sessionManager.createSession(config);
      if (session.questions.length === 0) {
        setError("No questions available for the selected criteria.");
        return;
      }
      setSessionConfig(config);
      setTotalQuestions(session.questions.length);
      setQuestionIndex(0);
      const q = questionBank.getQuestion(session.questions[0]);
      setCurrentQuestion(q || null);
      setAppState("practice");
    } catch (e) {
      setError(`Failed to start session: ${e}`);
    }
  }, [sessionManager, questionBank]);

  const handleAnswer = useCallback(async (
    selectedAnswer: string, timeSeconds: number, confidence: string
  ): Promise<QuestionResult | null> => {
    if (!sessionManager || !currentQuestion) return null;
    return sessionManager.submitAnswer(currentQuestion.id, selectedAnswer, timeSeconds, confidence);
  }, [sessionManager, currentQuestion]);

  const handleNext = useCallback(async () => {
    if (!sessionManager?.activeSession || !questionBank) return;
    const session = sessionManager.activeSession;
    const nextIdx = questionIndex + 1;

    if (nextIdx >= session.questions.length) {
      const s = await sessionManager.completeSession();
      setSummary(s);
      setAppState("results");
    } else {
      setQuestionIndex(nextIdx);
      setCurrentQuestion(questionBank.getQuestion(session.questions[nextIdx]) || null);
    }
  }, [sessionManager, questionBank, questionIndex]);

  const handlePause = useCallback(async () => {
    if (!sessionManager) return;
    await sessionManager.savePausedSession();
    setCurrentQuestion(null);
    const paused = await sessionManager.loadPausedSessions();
    setPausedSessions(paused);
    setAppState("config");
  }, [sessionManager]);

  const handleResume = useCallback(async (ps: PausedSession) => {
    if (!sessionManager || !questionBank) return;
    const session = await sessionManager.resumePausedSession(ps.sessionId);
    if (!session) return;
    setTotalQuestions(session.questions.length);
    setQuestionIndex(session.currentIndex);
    setCurrentQuestion(questionBank.getQuestion(session.questions[session.currentIndex]) || null);
    setPausedSessions((prev) => prev.filter((s) => s.sessionId !== ps.sessionId));
    setAppState("practice");
  }, [sessionManager, questionBank]);

  const handleDeletePaused = useCallback(async (sessionId: string) => {
    if (!sessionManager) return;
    await sessionManager.deletePausedSession(sessionId);
    setPausedSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
  }, [sessionManager]);

  const handleNewSession = useCallback(() => {
    setCurrentQuestion(null);
    setSummary(null);
    setError(null);
    setAppState("config");
  }, []);

  // Styles
  const containerStyle: React.CSSProperties = {
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#e2e8f0",
    minHeight: "100%",
    padding: "16px",
    fontSize: "14px",
    lineHeight: "1.6",
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(30, 41, 59, 0.7)",
    border: "1px solid rgba(148, 163, 184, 0.1)",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "12px",
  };

  if (appState === "loading") {
    return <div style={containerStyle}><div style={cardStyle}>Loading questions...</div></div>;
  }

  if (appState === "exam_select") {
    return (
      <div style={containerStyle}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px" }}>Practice App</h2>
        {error && <div style={{ ...cardStyle, borderColor: "rgba(239,68,68,0.3)", color: "#f87171", marginBottom: "12px" }}>{error}</div>}
        {(Object.entries(EXAM_CONFIGS) as [ExamType, ExamConfig][]).map(([et, config]) => (
          <button key={et} onClick={() => handleSelectExam(et)} style={{
            ...cardStyle, display: "flex", alignItems: "center", gap: "12px", cursor: "pointer",
            width: "100%", textAlign: "left", border: "1px solid rgba(148,163,184,0.1)",
          }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
              background: et === "cfa" ? "linear-gradient(135deg, #6366f1, #a855f7)" : "linear-gradient(135deg, #14b8a6, #10b981)",
              color: "white", fontWeight: 700, fontSize: "16px",
            }}>{et === "cfa" ? "C" : "P"}</div>
            <div>
              <div style={{ fontWeight: 600, color: "#f1f5f9" }}>{config.name}</div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>{config.categories.length} {config.categoryLabel.toLowerCase()}s</div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  if (!examConfig || !questionBank || !sessionManager || !examType) return null;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={handleBackToExams} style={{
            width: "28px", height: "28px", borderRadius: "6px", border: "none", cursor: "pointer", color: "white", fontWeight: 700, fontSize: "12px",
            background: examType === "cfa" ? "linear-gradient(135deg, #6366f1, #a855f7)" : "linear-gradient(135deg, #14b8a6, #10b981)",
          }}>{examType === "cfa" ? "C" : "P"}</button>
          <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{examConfig.name}</span>
          {appState === "practice" && <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "8px" }}>{questionIndex + 1}/{totalQuestions}</span>}
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {appState === "practice" && (
            <button onClick={handlePause} style={{ padding: "4px 12px", fontSize: "12px", borderRadius: "6px", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.1)", color: "#fbbf24", cursor: "pointer" }}>Pause</button>
          )}
          {appState === "config" && (
            <button onClick={() => setAppState("progress")} style={{ padding: "4px 12px", fontSize: "12px", borderRadius: "6px", border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.1)", color: "#10b981", cursor: "pointer" }}>Progress</button>
          )}
          {appState === "progress" && (
            <button onClick={() => setAppState("config")} style={{ padding: "4px 12px", fontSize: "12px", borderRadius: "6px", border: "1px solid rgba(148,163,184,0.2)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer" }}>Back</button>
          )}
        </div>
      </div>

      {error && <div style={{ ...cardStyle, borderColor: "rgba(239,68,68,0.3)", color: "#f87171" }}>{error}<button onClick={() => setError(null)} style={{ marginLeft: "8px", color: "#94a3b8", background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>Dismiss</button></div>}

      {appState === "config" && (
        <>
          {pausedSessions.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#fbbf24", marginBottom: "8px" }}>Paused Sessions</div>
              {pausedSessions.map((ps) => (
                <div key={ps.sessionId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", marginBottom: "4px" }}>
                  <span style={{ fontSize: "13px", color: "#e2e8f0" }}>{ps.questionsAnswered}/{ps.questionsTotal} answered</span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button onClick={() => handleResume(ps)} style={{ padding: "2px 10px", fontSize: "11px", borderRadius: "4px", border: "none", background: "rgba(16,185,129,0.15)", color: "#10b981", cursor: "pointer" }}>Resume</button>
                    <button onClick={() => handleDeletePaused(ps.sessionId)} style={{ padding: "2px 10px", fontSize: "11px", borderRadius: "4px", border: "none", background: "rgba(239,68,68,0.1)", color: "#f87171", cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <SessionConfigView examConfig={examConfig} questionBank={questionBank} onStart={handleStartSession} />
        </>
      )}

      {appState === "practice" && currentQuestion && (
        <QuestionView
          question={currentQuestion}
          questionNumber={questionIndex + 1}
          totalQuestions={totalQuestions}
          timed={sessionConfig?.timed ?? true}
          timePerQuestion={sessionConfig?.timePerQuestion ?? 90}
          categoryLabel={examConfig.categoryLabel}
          onAnswer={handleAnswer}
          onNext={handleNext}
        />
      )}

      {appState === "results" && summary && (
        <SessionResults summary={summary} categoryLabel={examConfig.categoryLabel} onNewSession={handleNewSession} />
      )}

      {appState === "progress" && (
        <ProgressDashboard questionBank={questionBank} examConfig={examConfig} onClose={() => setAppState("config")} />
      )}
    </div>
  );
}
