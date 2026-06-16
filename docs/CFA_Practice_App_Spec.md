# Finance Practice App — Build Specification

> **Obsidian-Native • Browser UI • Claude-Powered**
>
> *Note: This is a personal study tool for finance certification exam preparation. Not affiliated with or endorsed by any certification organization.*

---

## Current Progress

**Question Bank Generation Status (as of 2025-12-27):**

| Topic | Generated | Target | Status |
|-------|-----------|--------|--------|
| Ethics | 108 | 525 | Paused |
| Quantitative Methods | 225 | 225 | ✓ Complete |
| Economics | 180 | 225 | In Progress (80%) |
| Financial Statement Analysis | 2 | 375 | Pending |
| Corporate Issuers | 2 | 225 | Pending |
| Equity Investments | 2 | 375 | Pending |
| Fixed Income | 2 | 375 | Pending |
| Derivatives | 2 | 195 | Pending |
| Alternative Investments | 2 | 255 | Pending |
| Portfolio Management | 2 | 300 | Pending |

**Total: ~523 / 3,075 questions (~17%)**

### Completed Milestones
- [x] Project scaffolding (FastAPI + React)
- [x] Question file format defined (YAML frontmatter + Markdown)
- [x] Basic app structure with backend/frontend
- [x] Git repository initialized
- [x] README, LICENSE, setup scripts created
- [x] Quantitative Methods questions complete (225/225)
- [ ] Economics questions (180/225 - in progress)
- [ ] Remaining 8 topics pending

---

## 1. Design Philosophy

The core insight: Your Obsidian vault is already your knowledge management system. Don't build a separate app that duplicates it — build a **browser-based interface** that:

- **Generates content into** your vault
- **Reads progress from** your vault
- **Syncs seamlessly** with your existing study workflow

Obsidian becomes the archive and review system. The browser app becomes the practice interface.

### 1.1 Key Principles

1. **Markdown is the database.** Questions, answers, feedback, and progress all live as `.md` files in your vault. No SQLite, no hidden JSON. Everything is human-readable, searchable, and version-controllable.

2. **Browser-based UI.** Clean, distraction-free interface running locally. No electron bloat, no terminal constraints. Works alongside Obsidian and VS Code.

3. **Claude does the heavy lifting.** Question generation, marking, explanations, error analysis, targeted lessons — all via API. The app is just plumbing.

4. **Comprehensive question bank.** Target: **3,000+ questions** weighted by exam topic importance. Generated upfront, reviewed, and refined.

5. **Progressive enhancement.** Start with a working system in a day. Add features as needed. Never over-engineer.

---

## 2. Architecture Decision

### THE CHOICE: Local Web App + Obsidian Vault + Claude API

| Component | Decision & Rationale |
|-----------|---------------------|
| **Backend** | Python FastAPI — lightweight, async, excellent for API proxying |
| **Frontend** | React + Tailwind — clean UI, good component ecosystem |
| **Database** | Markdown files in Obsidian vault — no separate DB to manage |
| **API Client** | anthropic SDK — official, simple, well-documented |
| **Question Storage** | YAML frontmatter + Markdown body in vault |
| **Session Logs** | Markdown files with YAML metadata per session |
| **Progress Tracking** | Dataview queries on session files (Obsidian plugin) |
| **Flashcard Format** | Native Obsidian `[Q]::[A]` format for Spaced Repetition plugin |
| **Config** | Single `config.yaml` in vault root |

### 2.1 Why Browser-Based?

- Better UI/UX than terminal for long practice sessions
- Can display mathematical notation properly (MathJax/KaTeX)
- Progress charts and visualisations
- More accessible during early morning/late evening study
- Runs on `localhost:3000` — no internet required after initial setup

### 2.2 Why Still Obsidian-Native?

- All data lives in your vault as markdown
- Use Dataview for dashboards without custom code
- Link questions to study notes
- Flashcards integrate with SR plugin
- Git version control if desired
- Survives if you abandon the app — data is just text files

---

## 3. Obsidian Vault Structure

```
Finance-Study/                      # Your Obsidian vault
├── config.yaml                     # App configuration
├── Questions/                      # Question bank (~3000 questions)
│   ├── Level-1/
│   │   ├── Ethics/
│   │   │   ├── ETH-001.md
│   │   │   ├── ETH-002.md
│   │   │   └── ...
│   │   ├── Quantitative-Methods/
│   │   ├── Economics/
│   │   ├── FSA/
│   │   ├── Corporate-Issuers/
│   │   ├── Equity/
│   │   ├── Fixed-Income/
│   │   ├── Derivatives/
│   │   ├── Alternative-Investments/
│   │   └── Portfolio-Management/
│   ├── Level-2/
│   │   └── [Vignette-based item sets]
│   └── Level-3/
│       └── [Essay + item sets]
├── Sessions/                       # Practice session logs
│   ├── 2026-01-15-morning.md
│   ├── 2026-01-15-evening.md
│   └── ...
├── Feedback/                       # Claude's detailed feedback
│   ├── 2026-01-15-morning-feedback.md
│   └── ...
├── Flashcards/                     # Auto-generated from wrong answers
│   ├── Fixed-Income.md
│   ├── Derivatives.md
│   └── ...
├── Lessons/                        # Claude-generated targeted lessons
│   ├── Duration-Explained.md
│   └── ...
├── Progress/                       # Dataview dashboard files
│   ├── Dashboard.md
│   └── Weekly-Review.md
└── Study-Notes/                    # Your existing study notes
    └── ...
```

---

## 4. Question Generation Plan

### 4.1 Target: 3,000 Questions for Level 1

Questions allocated by **exam weighting** to ensure practice reflects actual exam distribution.

| Topic | Exam Weight | Target Questions | Subtopics |
|-------|-------------|------------------|-----------|
| **Ethics & Professional Standards** | 15-20% | 525 | Code of Ethics, Standards I-VII (7 standards), GIPS, Ethics Application |
| **Quantitative Methods** | 6-9% | 225 | Rates & Returns, TVM, Statistics, Probability, Distributions, Hypothesis Testing, Linear Regression, Big Data/ML |
| **Economics** | 6-9% | 225 | Demand/Supply, Firm Theory, Market Structures, GDP/Growth, Business Cycles, Monetary Policy, Fiscal Policy, Trade, FX |
| **Financial Statement Analysis** | 11-14% | 375 | FSA Framework, Income Statements, Balance Sheets, Cash Flows, Inventories, Long-Term Assets, Taxes, Financial Reporting Quality, Ratios |
| **Corporate Issuers** | 6-9% | 225 | Corporate Governance, Stakeholders, Capital Investment, Capital Allocation, Capital Structure, Business Models |
| **Equity Investments** | 11-14% | 375 | Market Organisation, Security Indexes, Market Efficiency, Overview of Equity, Company Analysis, Industry Analysis, Equity Valuation |
| **Fixed Income** | 11-14% | 375 | FI Features, Cash Flows, Issuance/Trading, Bond Valuation, Yield Measures, Duration, Credit Risk, ABS |
| **Derivatives** | 5-8% | 195 | Derivative Features, Forwards/Futures, Options, Swaps, Derivative Pricing, Risk Management |
| **Alternative Investments** | 7-10% | 255 | Alt Investment Features, Performance, Private Capital, Real Estate, Infrastructure, Natural Resources, Hedge Funds |
| **Portfolio Management** | 8-12% | 300 | Risk & Return I, Risk & Return II, Portfolio Overview, Planning & Construction, Behavioural Biases, Risk Management |
| **TOTAL** | 100% | **3,075** | |

### 4.2 Question Difficulty Distribution

Per topic, questions split by difficulty:

| Difficulty | Percentage | Purpose |
|------------|------------|---------|
| **Easy** | 25% | Concept recall, definitions, basic formulas |
| **Medium** | 50% | Application, standard calculations, interpretation |
| **Hard** | 25% | Multi-step problems, edge cases, tricky distractors |

### 4.3 Question Type Distribution

| Type | Percentage | Description |
|------|------------|-------------|
| **Conceptual** | 40% | Tests understanding of theory, definitions, relationships |
| **Calculation** | 35% | Requires numerical computation |
| **Application** | 25% | Scenario-based, requires judgement |

---

## 5. Curriculum Breakdown

### 5.1 Level 1 — Topic & Subtopic Detail

#### Ethics & Professional Standards (525 questions)

| Subtopic | Questions | Key Concepts |
|----------|-----------|--------------|
| Ethics and Trust in Investment Profession | 30 | Ethics definition, role of code, professionalism |
| Code of Ethics & Standards Overview | 45 | 6 components, 7 standards structure |
| Standard I: Professionalism | 75 | Knowledge of law, independence, misrepresentation, misconduct |
| Standard II: Integrity of Capital Markets | 60 | Material nonpublic info, market manipulation |
| Standard III: Duties to Clients | 90 | Loyalty, fair dealing, suitability, performance, confidentiality |
| Standard IV: Duties to Employers | 60 | Loyalty, compensation, supervisor responsibilities |
| Standard V: Investment Analysis | 75 | Diligence, communication, record retention |
| Standard VI: Conflicts of Interest | 45 | Disclosure, priority of transactions, referral fees |
| Standard VII: Responsibilities as Member | 30 | Conduct, professional designation reference |
| GIPS | 15 | Overview, compliance, verification |

#### Quantitative Methods (225 questions) ✓ COMPLETE

| Subtopic | Questions | Key Concepts |
|----------|-----------|--------------|
| Rates and Returns | 25 | HPR, TWR, MWR, geometric vs arithmetic mean, annualisation |
| Time Value of Money | 35 | PV, FV, annuities, perpetuities, loan amortisation |
| Statistical Concepts | 30 | Central tendency, dispersion, skewness, kurtosis |
| Probability Concepts | 30 | Rules, conditional, Bayes, expected value |
| Probability Distributions | 25 | Normal, t, chi-square, F distributions |
| Sampling & Estimation | 20 | Sampling methods, central limit theorem, confidence intervals |
| Hypothesis Testing | 30 | Process, type I/II errors, parametric/non-parametric tests |
| Linear Regression | 20 | Simple regression, assumptions, interpretation |
| Big Data & Machine Learning | 10 | Data types, ML concepts, fintech applications |

#### Economics (225 questions) — 180 COMPLETE

| Subtopic | Questions | Key Concepts |
|----------|-----------|--------------|
| Demand and Supply Analysis | 30 | Elasticity, consumer/producer surplus, market equilibrium |
| The Firm and Market Structures | 35 | Perfect competition, monopoly, oligopoly, monopolistic competition |
| Aggregate Output and Economic Growth | 30 | GDP measurement, growth factors, sustainability |
| Business Cycles | 25 | Phases, indicators, theories |
| Monetary and Fiscal Policy | 35 | Central banks, money supply, policy tools, fiscal multipliers |
| International Trade | 25 | Comparative advantage, trade barriers, trading blocs |
| Currency Exchange Rates | 30 | FX quotations, cross rates, forward rates, parity conditions |
| Geopolitics and Economics | 15 | Political risk, international organisations |

#### Financial Statement Analysis (375 questions)

| Subtopic | Questions | Key Concepts |
|----------|-----------|--------------|
| Introduction to FSA | 25 | Framework, roles, regulatory filings |
| Analyzing Income Statements | 50 | Revenue/expense recognition, EPS, comprehensive income |
| Analyzing Balance Sheets | 50 | Assets, liabilities, equity classification, fair value |
| Analyzing Cash Flows I | 35 | Direct/indirect method, linkages between statements |
| Analyzing Cash Flows II | 35 | Free cash flow, ratios |
| Analysis of Inventories | 30 | FIFO, LIFO, weighted average, LCM |
| Analysis of Long-Term Assets | 35 | Depreciation, impairment, revaluation |
| Topics in Long-Term Liabilities | 35 | Leases, pensions, stock compensation |
| Analysis of Income Taxes | 30 | Deferred tax, effective rate, valuation allowance |
| Financial Reporting Quality | 25 | Earnings quality, manipulation detection |
| Financial Analysis Techniques | 25 | Ratios, DuPont analysis, forecasting |

#### Corporate Issuers (225 questions)

| Subtopic | Questions | Key Concepts |
|----------|-----------|--------------|
| Corporate Governance | 40 | Stakeholder theory, board structure, ESG |
| Stakeholder Management | 25 | Creditor, employee, supplier relationships |
| Capital Investment | 45 | NPV, IRR, payback, project analysis |
| Capital Allocation | 35 | Real options, capital rationing |
| Capital Structure | 45 | MM propositions, optimal structure, WACC |
| Business Models | 35 | Revenue models, value proposition, competitive advantage |

#### Equity Investments (375 questions)

| Subtopic | Questions | Key Concepts |
|----------|-----------|--------------|
| Market Organisation & Structure | 40 | Order types, market participants, trading systems |
| Security Market Indexes | 35 | Construction, weighting methods, index types |
| Market Efficiency | 35 | Forms of efficiency, anomalies, behavioural finance |
| Overview of Equity Securities | 30 | Types, characteristics, risk/return |
| Company Analysis: Past & Present | 45 | Business model, revenue drivers, profitability |
| Industry & Competitive Analysis | 45 | Porter's five forces, PESTLE, competitive positioning |
| Company Analysis: Forecasting | 40 | Revenue, expense, capital forecasting |
| Equity Valuation | 60 | DDM, multiples, EV, asset-based valuation |
| Introduction to Geopolitics | 15 | Political risk assessment |

#### Fixed Income (375 questions)

| Subtopic | Questions | Key Concepts |
|----------|-----------|--------------|
| Fixed-Income Instrument Features | 35 | Bond characteristics, indentures, covenants |
| Fixed-Income Cash Flows & Types | 40 | Coupon structures, amortising, callable, convertible |
| Fixed-Income Issuance & Trading | 30 | Primary/secondary markets, bond indexes |
| Fixed-Income Valuation | 50 | Pricing, spot rates, yield curve |
| Yield & Yield Spread Measures | 45 | YTM, current yield, spreads, term structure |
| Duration & Convexity | 55 | Macaulay, modified, effective duration, convexity adjustment |
| Credit Risk | 40 | Credit ratings, default probability, loss given default |
| Credit Analysis | 40 | Corporate credit, sovereign credit |
| Asset-Backed Securities | 40 | MBS, CMO, ABS structures |

#### Derivatives (195 questions)

| Subtopic | Questions | Key Concepts |
|----------|-----------|--------------|
| Derivative Features & Markets | 25 | Definition, OTC vs exchange, clearing |
| Forward Commitment Instruments | 40 | Forwards, futures, swaps characteristics |
| Contingent Claims | 40 | Options, calls, puts, payoff diagrams |
| Derivative Pricing | 35 | No-arbitrage, cost of carry, put-call parity |
| Derivative Benefits & Risks | 25 | Hedging, speculation, leverage |
| Derivative Uses | 30 | Risk management applications |

#### Alternative Investments (255 questions)

| Subtopic | Questions | Key Concepts |
|----------|-----------|--------------|
| Alternative Investment Features | 30 | Characteristics, categories, structures |
| Alternative Investment Performance | 25 | Returns, fees, benchmarking |
| Private Capital: Equity & Debt | 45 | PE strategies, venture capital, private debt |
| Real Estate | 45 | Property types, valuation, REITs |
| Infrastructure | 30 | Characteristics, investment structures |
| Natural Resources | 25 | Commodities, timberland, farmland |
| Hedge Funds | 40 | Strategies, fee structures, due diligence |
| Digital Assets | 15 | Cryptocurrencies, blockchain basics |

#### Portfolio Management (300 questions)

| Subtopic | Questions | Key Concepts |
|----------|-----------|--------------|
| Portfolio Risk & Return I | 50 | Mean-variance, correlation, efficient frontier |
| Portfolio Risk & Return II | 50 | CAPM, SML, beta, systematic vs unsystematic risk |
| Portfolio Management Overview | 35 | Investment process, investor types |
| Basics of Portfolio Planning | 40 | IPS, objectives, constraints |
| Behavioural Biases | 40 | Cognitive errors, emotional biases |
| Introduction to Risk Management | 45 | Risk framework, measurement, modification |
| Technical Analysis | 20 | Chart patterns, indicators |
| Fintech in Investment Management | 20 | Robo-advisors, big data applications |

---

## 6. File Formats

### 6.1 Question File Format

**Example:** `Questions/Level-1/Fixed-Income/FI-012.md`

```markdown
---
id: FI-012
level: 1
topic: Fixed Income
subtopic: Duration
difficulty: Medium
type: calculation
tags:
  - duration
  - price-sensitivity
  - bonds
created: 2026-01-10
source: claude-generated
times_shown: 3
times_correct: 1
last_shown: 2026-01-14
---

# Question

A bond has a modified duration of 7.2 years. If interest rates increase by 50 basis points, the bond's price will most likely:

## Options

- **A**: Decrease by approximately 3.6%
- **B**: Decrease by approximately 7.2%
- **C**: Increase by approximately 3.6%

## Answer

A

## Explanation

Modified duration measures the percentage price change for a 1% (100 bp) change in yield. For a 50 bp (0.50%) increase:

$$\text{Price change} \approx -\text{Duration} \times \Delta y = -7.2 \times 0.50\% = -3.6\%$$

The negative sign indicates price decreases when yields rise.

**Common mistakes:**
- Option B: Forgetting to multiply by the yield change (using duration directly)
- Option C: Getting the direction wrong (price moves inversely to yield)
```

### 6.2 Session Log Format

**Example:** `Sessions/2026-01-15-morning.md`

```markdown
---
date: 2026-01-15
time: "05:00"
type: practice
mode: timed
duration_minutes: 45
questions_count: 30
topics:
  - Fixed Income
  - Derivatives
score: 21
score_percent: 70
questions_attempted: 30
time_taken_minutes: 42
---

# Session: 15 Jan 2026 Morning

## Summary

| Metric | Value |
|--------|-------|
| Score | 21/30 (70%) |
| Time | 42 minutes |
| Mode | Timed (90s/question) |
| Topics | Fixed Income, Derivatives |

## Results by Topic

| Topic | Correct | Total | Percent |
|-------|---------|-------|---------|
| Fixed Income | 14 | 20 | 70% |
| Derivatives | 7 | 10 | 70% |

## Questions

### ✅ FI-001
- **Selected:** A
- **Correct:** A
- **Time:** 67s
- **Confidence:** confident

### ❌ FI-012
- **Selected:** B
- **Correct:** A
- **Time:** 89s
- **Confidence:** confident
- **Error Type:** conceptual
- **Note:** Confused duration formula application

### ✅ DER-005
- **Selected:** C
- **Correct:** C
- **Time:** 45s
- **Confidence:** guessing

<!-- ... remaining questions ... -->

## Error Summary

| Error Type | Count |
|------------|-------|
| Conceptual | 5 |
| Calculation | 2 |
| Time Pressure | 2 |

## Weak Areas Identified

- Duration calculations (3 errors)
- Option payoff diagrams (2 errors)

---

**Feedback:** [[Feedback/2026-01-15-morning-feedback]]
```

### 6.3 Flashcard File Format

**Example:** `Flashcards/Fixed-Income.md`

```markdown
---
topic: Fixed Income
updated: 2026-01-15
card_count: 47
---

# Fixed Income Flashcards

## Duration
#flashcards/fixed-income/duration

What is the formula for approximate price change using modified duration?::Price Δ ≈ -ModDur × Δy (where Δy is yield change in %)

If a bond has ModDur of 6.5 and yields rise 25bp, what is the approximate price change?::-1.625% (calculated as -6.5 × 0.25%)

What is the relationship between Macaulay and Modified duration?::ModDur = MacDur / (1 + y/n) where y is YTM and n is compounding periods per year

Why is modified duration only an approximation for large yield changes?::Duration assumes a linear price-yield relationship, but the actual relationship is convex. Convexity adjustment needed for large changes.

## Convexity
#flashcards/fixed-income/convexity

Why do we need convexity adjustment for large yield changes?::Duration assumes linear price-yield relationship, but actual relationship is curved. Convexity corrects for this curvature.

What is the convexity adjustment formula?::Convexity adjustment = ½ × Convexity × (Δy)²
```

---

## 7. Browser UI Design

### 7.1 Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React 18 + TypeScript | Type safety, good ecosystem |
| **Styling** | Tailwind CSS | Rapid UI development, clean defaults |
| **State** | Zustand | Simple, minimal boilerplate |
| **Math Rendering** | KaTeX | Fast LaTeX rendering |
| **Charts** | Recharts | Simple, React-native charts |
| **Backend** | FastAPI (Python) | Async, fast, easy Claude integration |
| **API** | REST + WebSocket | REST for CRUD, WebSocket for timer sync |

### 7.2 Screen Layouts

#### Main Menu

```
┌─────────────────────────────────────────────────────────────┐
│                    Finance Practice                         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  📝 Start   │  │  📊 Progress │  │  📚 Questions│        │
│  │  Practice   │  │  Dashboard   │  │  Bank       │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  🔄 Review  │  │  🎯 Generate │  │  ⚙️ Settings │        │
│  │  Sessions   │  │  Questions   │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Recent: 70% (Fixed Income) • 65% (Derivatives) • 12 day   │
│          streak                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Session Configuration

```
┌─────────────────────────────────────────────────────────────┐
│  Configure Practice Session                      [Start →] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Questions:  [10] [20] [50] [●90] [180]                    │
│                                                             │
│  Topics:     [Select topics...]                    [All ▼] │
│              ☑ Fixed Income                                │
│              ☑ Derivatives                                 │
│              ☐ Ethics                                      │
│              ☐ ...                                         │
│                                                             │
│  Mode:       [●Timed (90s)] [Untimed] [Exam Sim]          │
│                                                             │
│  Difficulty: [Easy] [●Mixed] [Hard]                        │
│                                                             │
│  Focus:      [●All] [Weak Areas] [Unseen Only]            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Estimated time: 135 minutes                               │
└─────────────────────────────────────────────────────────────┘
```

#### Question Screen

```
┌─────────────────────────────────────────────────────────────┐
│  Question 15 of 50                          ⏱️ 01:23       │
│  Fixed Income › Duration                    [Flag 🚩]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  A bond has a modified duration of 7.2 years. If interest  │
│  rates increase by 50 basis points, the bond's price will  │
│  most likely:                                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ A  Decrease by approximately 3.6%                   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ B  Decrease by approximately 7.2%              ✓    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ C  Increase by approximately 3.6%                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Confidence:  [😐 Maybe]  [😊 Sure]  [😰 Guessing]         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [← Prev]    Question 15 of 50    [Next →]    [Submit All] │
│              ● ● ● ● ○ ○ ○ ○ ○ ○ (progress dots)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Configuration

**config.yaml:**

```yaml
# Finance Practice App Configuration

vault_path: "/path/to/Finance-Study"  # Or auto-detect from cwd

server:
  host: "localhost"
  port: 3000

practice:
  default_questions: 20
  default_time_per_question: 90  # seconds, 0 for untimed
  show_explanation_immediately: false

scoring:
  weak_threshold: 60  # Below this % = weak topic
  strong_threshold: 80  # Above this % = strong topic
  min_questions_for_assessment: 10

generation:
  target_total_questions: 3000
  questions_per_batch: 10
  review_before_adding: true

paths:
  questions: "Questions"
  sessions: "Sessions"
  feedback: "Feedback"
  flashcards: "Flashcards"
  lessons: "Lessons"

topics:
  - name: "Ethics"
    prefix: "ETH"
    weight: 17.5
    target_questions: 525
  - name: "Quantitative Methods"
    prefix: "QM"
    weight: 7.5
    target_questions: 225
  - name: "Economics"
    prefix: "ECO"
    weight: 7.5
    target_questions: 225
  - name: "Financial Statement Analysis"
    prefix: "FSA"
    weight: 12.5
    target_questions: 375
  - name: "Corporate Issuers"
    prefix: "CI"
    weight: 7.5
    target_questions: 225
  - name: "Equity"
    prefix: "EQ"
    weight: 12.5
    target_questions: 375
  - name: "Fixed Income"
    prefix: "FI"
    weight: 12.5
    target_questions: 375
  - name: "Derivatives"
    prefix: "DER"
    weight: 6.5
    target_questions: 195
  - name: "Alternative Investments"
    prefix: "ALT"
    weight: 8.5
    target_questions: 255
  - name: "Portfolio Management"
    prefix: "PM"
    weight: 10.0
    target_questions: 300
```

---

## 9. Summary

| Aspect | Decision |
|--------|----------|
| **UI** | Browser-based (React + Tailwind), runs on localhost |
| **Backend** | Python FastAPI |
| **Database** | Markdown files in Obsidian vault |
| **Questions** | 3,000 target, weighted by exam importance |
| **Feedback** | Claude-powered marking, explanations, flashcard generation |
| **Progress** | Dataview dashboards in Obsidian |
| **Flashcards** | Native Obsidian format for SR plugin |
| **Timeline** | MVP in ~1 week, question bank population ongoing |

---

*Built for personal learning. Not affiliated with any certification organization.*
