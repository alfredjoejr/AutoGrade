import { Pool } from 'pg';
import crypto from 'crypto';

// Singleton pool instance
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    try {
      const url = new URL(connectionString);
      pool = new Pool({
        user: url.username,
        password: decodeURIComponent(url.password),
        host: url.hostname,
        port: Number(url.port) || 5432,
        database: url.pathname.replace(/^\//, '') || 'defaultdb',
        ssl: { rejectUnauthorized: false },
        max: 5,
      });
    } catch {
      pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 5,
      });
    }
  }
  return pool;
}

// ─── Password Hashing ────────────────────────────────────────────────

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const ITERATIONS = 100_000;
const DIGEST = 'sha512';

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = storedHash.split(':');
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('hex') === hash);
    });
  });
}

// ─── Schema ──────────────────────────────────────────────────────────

/** Create tables if they don't exist */
export async function initSchema(): Promise<void> {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS batch_sessions (
      id UUID PRIMARY KEY,
      total_questions INTEGER NOT NULL,
      master_key JSONB NOT NULL,
      threshold INTEGER NOT NULL DEFAULT 85,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS master_key_cache (
      hash TEXT PRIMARY KEY,
      total_questions INTEGER NOT NULL,
      options_per_question INTEGER NOT NULL,
      answers JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS student_results (
      id SERIAL PRIMARY KEY,
      batch_id UUID REFERENCES batch_sessions(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      score NUMERIC(5,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'marked',
      results JSONB NOT NULL,
      graded_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_student_results_batch_id ON student_results(batch_id);

    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS teacher_corrections (
      id SERIAL PRIMARY KEY,
      batch_id UUID,
      student_id TEXT,
      question_id INTEGER NOT NULL,
      source TEXT NOT NULL,
      ai_detected TEXT,
      teacher_corrected TEXT NOT NULL,
      confidence NUMERIC(5,2),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_corrections_source ON teacher_corrections(source);
    CREATE INDEX IF NOT EXISTS idx_corrections_created ON teacher_corrections(created_at DESC);
  `);

  // Seed default admin if no admins exist
  await seedDefaultAdmin();
}

// ─── Admin Users ─────────────────────────────────────────────────────

/** Seed a default admin user if no admin exists */
async function seedDefaultAdmin(): Promise<void> {
  const db = getPool();
  const existing = await db.query('SELECT COUNT(*)::integer AS cnt FROM admin_users');
  if (existing.rows[0].cnt === 0) {
    const passwordHash = await hashPassword('admin123');
    await db.query(
      `INSERT INTO admin_users (username, password_hash, display_name) VALUES ($1, $2, $3)`,
      ['admin', passwordHash, 'Administrator']
    );
    console.log('[AutoGrade] Default admin user created → username: admin / password: admin123');
  }
}

/** Verify admin credentials — returns the user object or null */
export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<{ id: number; username: string; displayName: string } | null> {
  const db = getPool();
  const result = await db.query(
    'SELECT id, username, password_hash, display_name FROM admin_users WHERE username = $1',
    [username]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const isValid = await verifyPassword(password, row.password_hash);
  if (!isValid) return null;

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
  };
}

// ─── Batch Results ───────────────────────────────────────────────────

/** Save a full batch session and all student results in one transaction */
export async function saveBatchResults(batch: {
  id: string;
  totalQuestions: number;
  masterKey: Record<number, string>;
  threshold: number;
  students: Array<{
    studentId: string;
    fileName: string;
    score: number;
    status: string;
    results: any[];
    gradedAt: string;
  }>;
}): Promise<void> {
  const db = getPool();
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Insert batch session
    await client.query(
      `INSERT INTO batch_sessions (id, total_questions, master_key, threshold)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         total_questions = EXCLUDED.total_questions,
         master_key = EXCLUDED.master_key,
         threshold = EXCLUDED.threshold`,
      [batch.id, batch.totalQuestions, JSON.stringify(batch.masterKey), batch.threshold]
    );

    // Insert each student result
    for (const student of batch.students) {
      await client.query(
        `INSERT INTO student_results (batch_id, student_id, file_name, score, status, results, graded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          batch.id,
          student.studentId,
          student.fileName,
          student.score,
          student.status,
          JSON.stringify(student.results),
          student.gradedAt,
        ]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Retrieve past batch sessions (most recent first) */
export async function getBatchSessions(limit = 50): Promise<any[]> {
  const db = getPool();
  const result = await db.query(
    `SELECT bs.*, 
            COUNT(sr.id)::integer AS student_count,
            ROUND(AVG(sr.score), 2)::numeric AS avg_score
     FROM batch_sessions bs
     LEFT JOIN student_results sr ON sr.batch_id = bs.id
     GROUP BY bs.id
     ORDER BY bs.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/** Get a single batch with all its student results */
export async function getBatchById(batchId: string): Promise<{
  batch: any;
  students: any[];
} | null> {
  const db = getPool();

  const batchResult = await db.query(
    'SELECT * FROM batch_sessions WHERE id = $1',
    [batchId]
  );
  if (batchResult.rows.length === 0) return null;

  const studentsResult = await db.query(
    `SELECT student_id, file_name, score, status, results, graded_at
     FROM student_results
     WHERE batch_id = $1
     ORDER BY student_id ASC`,
    [batchId]
  );

  return {
    batch: batchResult.rows[0],
    students: studentsResult.rows,
  };
}

/** Get aggregate stats across all batches */
export async function getAdminStats(): Promise<{
  totalBatches: number;
  totalStudents: number;
  overallAverage: number;
}> {
  const db = getPool();

  const batchCount = await db.query('SELECT COUNT(*)::integer AS cnt FROM batch_sessions');
  const studentStats = await db.query(
    'SELECT COUNT(*)::integer AS cnt, COALESCE(ROUND(AVG(score), 2), 0)::numeric AS avg FROM student_results'
  );

  return {
    totalBatches: batchCount.rows[0].cnt,
    totalStudents: studentStats.rows[0].cnt,
    overallAverage: Number(studentStats.rows[0].avg),
  };
}

// ─── Master Key Caching ──────────────────────────────────────────────

export async function getCachedMasterKey(hash: string): Promise<{
  totalQuestions: number;
  optionsPerQuestion: number;
  answers: any[];
} | null> {
  const db = getPool();
  const res = await db.query(
    'SELECT total_questions, options_per_question, answers FROM master_key_cache WHERE hash = $1',
    [hash]
  );
  if (res.rows.length === 0) return null;
  return {
    totalQuestions: res.rows[0].total_questions,
    optionsPerQuestion: res.rows[0].options_per_question,
    answers: res.rows[0].answers,
  };
}

export async function saveCachedMasterKey(
  hash: string,
  totalQuestions: number,
  optionsPerQuestion: number,
  answers: any[]
): Promise<void> {
  const db = getPool();
  await db.query(
    `INSERT INTO master_key_cache (hash, total_questions, options_per_question, answers)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (hash) DO UPDATE SET
       total_questions = EXCLUDED.total_questions,
       options_per_question = EXCLUDED.options_per_question,
       answers = EXCLUDED.answers,
       created_at = NOW()`,
    [hash, totalQuestions, optionsPerQuestion, JSON.stringify(answers)]
  );
}

// ─── Human-in-the-Loop Corrections & AI Tuning ────────────────────────

export interface TeacherCorrectionRecord {
  id?: number;
  batchId?: string | null;
  studentId?: string | null;
  questionId: number;
  source: 'master_key' | 'student_moderation';
  aiDetected?: string | null;
  teacherCorrected: string;
  confidence?: number | null;
  notes?: string | null;
  createdAt?: string;
}

/** Record a single human teacher correction */
export async function logTeacherCorrection(record: TeacherCorrectionRecord): Promise<number> {
  const db = getPool();
  const res = await db.query(
    `INSERT INTO teacher_corrections 
     (batch_id, student_id, question_id, source, ai_detected, teacher_corrected, confidence, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      record.batchId || null,
      record.studentId || null,
      record.questionId,
      record.source,
      record.aiDetected || null,
      record.teacherCorrected,
      record.confidence || null,
      record.notes || null,
    ]
  );
  return res.rows[0].id;
}

/** Retrieve recent verified corrections for dynamic in-context learning */
export async function getRecentCorrections(source?: string, limit = 8): Promise<TeacherCorrectionRecord[]> {
  const db = getPool();
  let query = `
    SELECT id, batch_id AS "batchId", student_id AS "studentId", 
           question_id AS "questionId", source, ai_detected AS "aiDetected", 
           teacher_corrected AS "teacherCorrected", confidence, notes, 
           created_at AS "createdAt"
    FROM teacher_corrections
  `;
  const params: any[] = [];
  if (source) {
    query += ` WHERE source = $1`;
    params.push(source);
    query += ` ORDER BY created_at DESC LIMIT $2`;
    params.push(limit);
  } else {
    query += ` ORDER BY created_at DESC LIMIT $1`;
    params.push(limit);
  }

  const res = await db.query(query, params);
  return res.rows;
}

/** Aggregate statistics on teacher corrections for the Admin Tuning Hub */
export async function getTuningStats(): Promise<{
  totalCorrections: number;
  masterKeyCount: number;
  studentModerationCount: number;
  mostCorrectedQuestions: Array<{ questionId: number; count: number }>;
  recentLogs: TeacherCorrectionRecord[];
}> {
  const db = getPool();

  const totalRes = await db.query('SELECT COUNT(*)::integer AS cnt FROM teacher_corrections');
  const sourceRes = await db.query(
    `SELECT source, COUNT(*)::integer AS cnt FROM teacher_corrections GROUP BY source`
  );

  let masterKeyCount = 0;
  let studentModerationCount = 0;
  sourceRes.rows.forEach((r: any) => {
    if (r.source === 'master_key') masterKeyCount = r.cnt;
    if (r.source === 'student_moderation') studentModerationCount = r.cnt;
  });

  const questionRes = await db.query(`
    SELECT question_id AS "questionId", COUNT(*)::integer AS cnt
    FROM teacher_corrections
    GROUP BY question_id
    ORDER BY cnt DESC
    LIMIT 6
  `);

  const logsRes = await db.query(`
    SELECT id, batch_id AS "batchId", student_id AS "studentId", 
           question_id AS "questionId", source, ai_detected AS "aiDetected", 
           teacher_corrected AS "teacherCorrected", confidence, notes, 
           created_at AS "createdAt"
    FROM teacher_corrections
    ORDER BY created_at DESC
    LIMIT 50
  `);

  return {
    totalCorrections: totalRes.rows[0].cnt,
    masterKeyCount,
    studentModerationCount,
    mostCorrectedQuestions: questionRes.rows,
    recentLogs: logsRes.rows,
  };
}

/** Export all corrections formatted as a Gemini Supervised Fine-Tuning JSONL dataset */
export async function getTuningDatasetJSONL(): Promise<string> {
  const db = getPool();
  const res = await db.query(`
    SELECT question_id, source, ai_detected, teacher_corrected, confidence, notes, created_at
    FROM teacher_corrections
    ORDER BY created_at ASC
  `);

  const lines = res.rows.map((r: any) => {
    return JSON.stringify({
      messages: [
        {
          role: "user",
          content: `Extract the correct answer for Question ${r.question_id} (${r.source}). Previous AI detected: ${r.ai_detected || 'none'}.`
        },
        {
          role: "model",
          content: JSON.stringify({
            questionId: r.question_id,
            verifiedAnswer: r.teacher_corrected,
            notes: r.notes || "Educator verified override."
          })
        }
      ]
    });
  });

  return lines.join('\n');
}
