import type { ExamType, ExamInfo, Question, QuestionResult, SessionConfig, SessionSummary, CategoryInfo, PausedSession, Progress, SessionHistory } from './types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function getExams(): Promise<Record<string, ExamInfo>> {
  return fetchJson(`${API_BASE}/exams`);
}

export async function getCategories(examType: ExamType): Promise<Record<string, CategoryInfo>> {
  return fetchJson(`${API_BASE}/${examType}/categories`);
}

export async function createSession(examType: ExamType, config: SessionConfig): Promise<{
  session_id: string;
  question_count: number;
  questions: string[];
}> {
  return fetchJson(`${API_BASE}/${examType}/sessions`, {
    method: 'POST',
    body: JSON.stringify({ config }),
  });
}

export async function getSessionQuestion(examType: ExamType, sessionId: string, questionId: string): Promise<Question> {
  return fetchJson(`${API_BASE}/${examType}/sessions/${sessionId}/question/${questionId}`);
}

export async function submitAnswer(
  examType: ExamType, sessionId: string, questionId: string,
  selectedAnswer: string, timeSeconds: number, confidence: 'guessing' | 'maybe' | 'sure'
): Promise<QuestionResult> {
  return fetchJson(`${API_BASE}/${examType}/sessions/${sessionId}/answer`, {
    method: 'POST',
    body: JSON.stringify({ question_id: questionId, selected_answer: selectedAnswer, time_seconds: timeSeconds, confidence }),
  });
}

export async function completeSession(examType: ExamType, sessionId: string): Promise<SessionSummary> {
  return fetchJson(`${API_BASE}/${examType}/sessions/${sessionId}/complete`, { method: 'POST' });
}

export async function pauseSession(examType: ExamType, sessionId: string): Promise<{ status: string; session_id: string }> {
  return fetchJson(`${API_BASE}/${examType}/sessions/${sessionId}/pause`, { method: 'POST' });
}

export async function getPausedSessions(examType: ExamType): Promise<PausedSession[]> {
  return fetchJson(`${API_BASE}/${examType}/sessions/paused`);
}

export async function deleteSession(examType: ExamType, sessionId: string): Promise<{ status: string; session_id: string }> {
  return fetchJson(`${API_BASE}/${examType}/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function getProgress(examType: ExamType): Promise<Progress> {
  return fetchJson(`${API_BASE}/${examType}/progress`);
}

export async function getProgressHistory(examType: ExamType): Promise<SessionHistory[]> {
  return fetchJson(`${API_BASE}/${examType}/progress/history`);
}
