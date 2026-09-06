// Shared types for AutoGrade

export type QuestionResult = {
  id: number;
  detected: string | null;
  correct: string;
  status: 'correct' | 'incorrect' | 'ambiguous';
  confidence?: number;
};

export type StudentGradingResult = {
  studentId: string;          // Extracted from filename (e.g., "STU001.jpg" → "STU001")
  fileName: string;           // Original filename
  imageBase64: string;        // Scanned sheet for moderation view
  results: QuestionResult[];  // Per-question grading
  score: number;              // Percentage (correct / total * 100)
  status: 'auto-graded' | 'reviewed';
  gradedAt: string;           // ISO timestamp
};

export type BatchSession = {
  id: string;                         // UUID
  totalQuestions: number;
  masterKey: Record<number, string>;
  threshold: number;
  students: StudentGradingResult[];
  createdAt: string;
};
