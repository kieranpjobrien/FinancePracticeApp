import { useState } from "react";
import type { ExamConfig, SessionConfig } from "../types";
import { QuestionBank } from "../QuestionBank";

interface Props {
  examConfig: ExamConfig;
  questionBank: QuestionBank;
  onStart: (config: SessionConfig) => void;
}

export function SessionConfigView({ examConfig, questionBank, onStart }: Props) {
  const [sessionType, setSessionType] = useState("mixed");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [difficulty, setDifficulty] = useState("mixed");

  const catCounts = questionBank.getCategoryCounts();
  const totalAvailable = Object.values(catCounts).reduce((a, b) => a + b, 0);
  const selectedAvailable = selectedCats.length > 0
    ? selectedCats.reduce((sum, c) => sum + (catCounts[c] || 0), 0) : totalAvailable;

  const catLabel = examConfig.categoryLabel;

  const sessionTypeMap: Record<string, string> = {
    mixed: "Mixed",
    category_drill: `${catLabel} Drill`,
    topic_drill: `${catLabel} Drill`,
    weak_areas: "Weak Areas",
    mock_exam: "Mock Exam",
  };

  const toggleCat = (cat: string) => {
    setSelectedCats((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const handleStart = () => {
    onStart({ sessionType, categories: selectedCats, questionCount, difficulty, timed: false, timePerQuestion: 90 });
  };

  if (totalAvailable === 0) {
    return (
      <div className="pmp-card">
        <p className="pmp-text-warning">No questions found. Add questions to the {examConfig.questionsPath} folder.</p>
      </div>
    );
  }

  return (
    <div className="pmp-card">
      <h2 className="pmp-heading">Configure Session</h2>

      <div className="pmp-field">
        <label className="pmp-section-label">Session Type</label>
        <div className="pmp-btn-group">
          {examConfig.sessionTypes.filter((st) => sessionTypeMap[st]).map((st) => (
            <button
              key={st}
              className={`pmp-option-btn ${sessionType === st ? "pmp-option-active" : ""}`}
              onClick={() => setSessionType(st)}
            >
              {sessionTypeMap[st]}
            </button>
          ))}
        </div>
      </div>

      {sessionType !== "mock_exam" && (
        <div className="pmp-field">
          <label className="pmp-section-label">{catLabel}s</label>
          <div className="pmp-domain-list">
            {Object.entries(catCounts).sort(([a], [b]) => a.localeCompare(b)).map(([cat, count]) => {
              const active = selectedCats.includes(cat);
              return (
                <div
                  key={cat}
                  className={`pmp-domain-item ${active ? "pmp-domain-selected" : ""}`}
                  onClick={() => toggleCat(cat)}
                >
                  <input type="checkbox" checked={active} readOnly />
                  <span className="pmp-domain-name">{cat}</span>
                  <span className="pmp-domain-count">{count}</span>
                </div>
              );
            })}
          </div>
          {selectedCats.length === 0 && <p className="pmp-hint">No selection = all {catLabel.toLowerCase()}s</p>}
        </div>
      )}

      <div className="pmp-field">
        <label className="pmp-section-label">Questions</label>
        <div className="pmp-grid-4">
          {[10, 20, 30, 50].map((n) => (
            <button
              key={n}
              className={`pmp-option-btn pmp-option-compact ${questionCount === n ? "pmp-option-active" : ""} ${n > selectedAvailable ? "pmp-option-disabled" : ""}`}
              disabled={n > selectedAvailable}
              onClick={() => setQuestionCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="pmp-hint">{selectedAvailable} available</p>
      </div>

      <div className="pmp-field">
        <label className="pmp-section-label">Difficulty</label>
        <div className="pmp-grid-4">
          {["easy", "medium", "hard", "mixed"].map((d) => (
            <button
              key={d}
              className={`pmp-option-btn pmp-option-compact pmp-capitalize ${difficulty === d ? "pmp-option-active" : ""}`}
              onClick={() => setDifficulty(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <button
        className="pmp-btn pmp-btn-primary pmp-btn-full"
        disabled={questionCount > selectedAvailable}
        onClick={handleStart}
      >
        Start ({questionCount} questions)
      </button>
    </div>
  );
}
