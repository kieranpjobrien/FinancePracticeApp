import type { Question, QuestionResult, SessionConfig, SessionSummary, DomainInfo, Stats, PausedSession, Progress, SessionHistory } from './types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function getStats(): Promise<Stats> {
  return fetchJson(`${API_BASE}/stats`);
}

export async function getDomains(): Promise<Record<string, DomainInfo>> {
  return fetchJson(`${API_BASE}/domains`);
}

export async function createSession(config: SessionConfig): Promise<{
  session_id: string;
  question_count: number;
  questions: string[];
}> {
  return fetchJson(`${API_BASE}/sessions`, {
    method: 'POST',
    body: JSON.stringify({ config }),
  });
}

export async function getSessionQuestion(sessionId: string, questionId: string): Promise<Question> {
  return fetchJson(`${API_BASE}/sessions/${sessionId}/question/${questionId}`);
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  selectedAnswer: string,
  timeSeconds: number,
  confidence: 'guessing' | 'maybe' | 'sure'
): Promise<QuestionResult> {
  return fetchJson(`${API_BASE}/sessions/${sessionId}/answer`, {
    method: 'POST',
    body: JSON.stringify({
      question_id: questionId,
      selected_answer: selectedAnswer,
      time_seconds: timeSeconds,
      confidence,
    }),
  });
}

export async function completeSession(sessionId: string): Promise<SessionSummary> {
  return fetchJson(`${API_BASE}/sessions/${sessionId}/complete`, {
    method: 'POST',
  });
}

export async function pauseSession(sessionId: string): Promise<{ status: string; session_id: string }> {
  return fetchJson(`${API_BASE}/sessions/${sessionId}/pause`, {
    method: 'POST',
  });
}

export async function getPausedSessions(): Promise<PausedSession[]> {
  return fetchJson(`${API_BASE}/sessions/paused`);
}

export async function deleteSession(sessionId: string): Promise<{ status: string; session_id: string }> {
  return fetchJson(`${API_BASE}/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

export async function getProgress(): Promise<Progress> {
  return fetchJson(`${API_BASE}/progress`);
}

export async function getProgressHistory(): Promise<SessionHistory[]> {
  return fetchJson(`${API_BASE}/progress/history`);
}
