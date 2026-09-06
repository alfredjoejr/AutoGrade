# AutoGrade

An intelligent, AI-powered multiple-choice question (MCQ) grading interface built with **Next.js 15**, **React 19**, **Tailwind CSS**, and **Google Gemini 2.5 Flash**.

AutoGrade streamlines the entire test evaluation workflow: from uploading student answer sheet scans to automated OCR grading, teacher-moderated verification of ambiguous bubbles, and actionable class-wide performance analytics.

---

## Key Features

- **Setup & Upload View**:
  - Configure question count and master answer key (A/B/C/D).
  - Set confidence thresholds for automated flag detection.
  - Upload real answer sheet images or test with preloaded samples.
- **AI-Powered OCR Grading**:
  - Server-side analysis powered by Google Gemini (`gemini-2.5-flash`).
  - Detects marked bubbles, faint marks, crossed-out errors, and multi-bubble ambiguities.
- **Human-in-the-Loop Moderation**:
  - Side-by-side view of student answer sheets and detected marks.
  - Quick manual override and verification for ambiguous or low-confidence marks.
- **Class Analytics**:
  - Real-time score distributions, item difficulty curves, and high/low discriminator analysis.

---

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **UI & Components**: [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Charts & Visualizations**: [Recharts](https://recharts.org/)
- **Animations**: [Motion](https://motion.dev/)
- **AI / LLM Integration**: [@google/genai](https://www.npmjs.com/package/@google/genai)

---

## Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: `v20` or higher (Recommended: LTS)
- **npm**: `v10` or higher (comes bundled with Node.js)
- **Google Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/)

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

Open `.env.local` and add your Gemini API key:

```env
# Required: Your Gemini API key from Google AI Studio
GEMINI_API_KEY="your_gemini_api_key_here"

# Optional: Application URL for local development
APP_URL="http://localhost:3000"
```

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
│   │   └── grade/
│   │       └── route.ts       # Backend Gemini OCR grading endpoint
│   ├── globals.css            # Global Tailwind CSS styles
│   ├── layout.tsx             # Root layout and metadata configuration
│   └── page.tsx               # Main multi-view container (Setup, Moderate, Analyze)
├── components/
│   ├── upload-view.tsx        # Answer key setup, threshold configuration & sheet upload
│   ├── moderation-view.tsx    # Inspection & manual override interface
│   └── analytics-view.tsx     # Class statistics, graphs, and performance breakdown
├── hooks/
│   └── use-mobile.ts          # Responsive layout breakpoint detection hook
├── lib/
│   └── utils.ts               # Tailwind class merging and common utilities
├── .env.example               # Example environment variables template
├── eslint.config.mjs          # Flat ESLint configuration
├── next.config.ts             # Next.js runtime and build configuration
├── package.json               # Dependencies and scripts
└── tsconfig.json              # TypeScript compiler settings
```

---

## License

This project is licensed under the MIT License.
