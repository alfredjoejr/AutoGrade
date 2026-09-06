# AutoGrade

An intelligent, AI-powered multiple-choice question (MCQ) grading interface built with **Next.js 15**, **React 19**, **Tailwind CSS**, **Google Gemini 2.5 Flash**, and **PostgreSQL (Aiven)**.

AutoGrade streamlines the entire test evaluation workflow: from uploading student answer sheet scans to automated OCR grading, teacher-moderated verification of ambiguous bubbles, actionable class-wide performance analytics, and persistent storage of batch results.

---

## Key Features

- **Setup & Upload View**:
  - Configure question count and master answer key (A/B/C/D/E/F).
  - AI-powered master key extraction from scanned answer sheets.
  - Set confidence thresholds for automated flag detection.
  - **Multi-file batch upload** — grade entire classrooms at once.
  - Each file name is used as the **Student ID** (e.g., `STU001.jpg` → Student `STU001`).
- **AI-Powered OCR Grading**:
  - Server-side analysis powered by Google Gemini (`gemini-3.5-flash`).
  - Detects marked bubbles, faint marks, crossed-out errors, and multi-bubble ambiguities.
  - Real-time progress tracking during batch grading.
- **Human-in-the-Loop Moderation**:
  - Side-by-side view of student answer sheets and detected marks.
  - Navigate through all students with **Approve & Next** workflow.
  - Quick manual override and verification for ambiguous or low-confidence marks.
  - Live score recalculation as overrides are applied.
- **Class Analytics & Database Persistence**:
  - Real-time score distributions, most-missed questions, and class averages computed from actual batch data.
  - **Export to CSV** for offline analysis.
  - **Save to PostgreSQL** (Aiven) for permanent records.

---

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **UI & Components**: [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Charts & Visualizations**: [Recharts](https://recharts.org/)
- **Animations**: [Motion](https://motion.dev/)
- **AI / LLM Integration**: [@google/genai](https://www.npmjs.com/package/@google/genai)
- **Database**: [PostgreSQL](https://www.postgresql.org/) via [Aiven](https://aiven.io/) + [node-postgres (pg)](https://node-postgres.com/)

---

## Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: `v20` or higher (Recommended: LTS)
- **npm**: `v10` or higher (comes bundled with Node.js)
- **Google Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/)
- **PostgreSQL Database** (optional): An [Aiven](https://aiven.io/) PostgreSQL service for persisting batch results

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/alfredjoejr/AutoGrade.git
cd AutoGrade
```

### 2. Install Dependencies

Install all required project dependencies using npm:

```bash
npm install
```

> **Note for Windows PowerShell Users**:
> If you encounter an `UnauthorizedAccess` or script execution policy warning when running `npm`, run `npm.cmd install` instead or update your PowerShell execution policy:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

### 3. Configure Environment Variables

Create a `.env.local` file by copying `.env.example`:

```bash
cp .env.example .env.local
```

Open `.env.local` and configure your keys:

```env
# Required: Your Gemini API key from Google AI Studio
GEMINI_API_KEY="your_gemini_api_key_here"

# Optional: Application URL for local development
APP_URL="http://localhost:3000"

# Optional: PostgreSQL Database (Aiven)
# Get your connection string from Aiven Console → Your Service → Overview → Connection Information → URI
# Format: postgresql://avnadmin:PASSWORD@HOST:PORT/defaultdb?sslmode=require
DATABASE_URL="postgresql://avnadmin:PASSWORD@HOST:PORT/defaultdb?sslmode=require"
```

#### Setting up Aiven PostgreSQL (Optional)

1. Create a free account at [aiven.io](https://aiven.io/)
2. Create a new **PostgreSQL** service (the free tier works)
3. Go to **Overview** → **Connection Information** → Copy the **URI**
4. Paste the URI as `DATABASE_URL` in your `.env.local`
5. The database tables are auto-created on first use

### 4. Run the Development Server

Start the Next.js local development server:

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## Usage Workflow

1. **Setup Master Key**: Define the number of MCQs, options per question, and set the correct answers (manually or via AI scan).
2. **Upload Student Sheets**: Select multiple scanned answer sheet images. File names become Student IDs.
3. **Batch Grading**: AutoGrade processes each sheet through Gemini Vision AI with a live progress bar.
4. **Moderation**: Review each student's results side-by-side with their scanned sheet. Override ambiguous detections.
5. **Analytics**: View class statistics, export CSV, and optionally save results to your PostgreSQL database.

---

## Available Scripts

In the project root, you can run:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Launches the Next.js development server with Turbopack / HMR |
| `npm run build` | Creates an optimized production build in `.next` |
| `npm start` | Runs the production build server |
| `npm run lint` | Runs ESLint to check for code quality and syntax issues |
| `npm run clean` | Cross-platform cleanup script to remove temporary `.next`, `out`, and `.turbo` folders |

---

## Project Structure

```text
AutoGrade/
├── app/
│   ├── api/
│   │   ├── extract-key/
│   │   │   └── route.ts       # AI master key extraction endpoint
│   │   ├── grade/
│   │   │   └── route.ts       # Backend Gemini OCR grading endpoint
│   │   └── results/
│   │       └── route.ts       # Batch results save/retrieve (PostgreSQL)
│   ├── globals.css            # Global Tailwind CSS styles
│   ├── layout.tsx             # Root layout and metadata configuration
│   └── page.tsx               # Main multi-view container (Setup, Moderate, Analyze)
├── components/
│   ├── upload-view.tsx        # Answer key setup, batch upload & progress tracking
│   ├── moderation-view.tsx    # Per-student review & manual override interface
│   └── analytics-view.tsx     # Class statistics, charts, CSV export & DB save
├── hooks/
│   └── use-mobile.ts          # Responsive layout breakpoint detection hook
├── lib/
│   ├── db.ts                  # PostgreSQL connection pool & query helpers
│   ├── types.ts               # Shared TypeScript types (StudentGradingResult, etc.)
│   └── utils.ts               # Tailwind class merging and common utilities
├── .env.example               # Example environment variables template
├── eslint.config.mjs          # Flat ESLint configuration
├── next.config.ts             # Next.js runtime and build configuration
├── package.json               # Dependencies and scripts
└── tsconfig.json              # TypeScript compiler settings
```

---

## Database Schema

When using the PostgreSQL integration, AutoGrade auto-creates two tables:

```sql
-- Stores batch grading sessions
CREATE TABLE batch_sessions (
  id UUID PRIMARY KEY,
  total_questions INTEGER NOT NULL,
  master_key JSONB NOT NULL,
  threshold INTEGER NOT NULL DEFAULT 85,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores individual student results within a batch
CREATE TABLE student_results (
  id SERIAL PRIMARY KEY,
  batch_id UUID REFERENCES batch_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'auto-graded',
  results JSONB NOT NULL,
  graded_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## License

This project is licensed under the MIT License.
