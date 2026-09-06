import { Pool } from 'pg';

// Singleton pool instance
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

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

    CREATE TABLE IF NOT EXISTS student_results (
      id SERIAL PRIMARY KEY,
      batch_id UUID REFERENCES batch_sessions(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      score NUMERIC(5,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'auto-graded',
      results JSONB NOT NULL,
      graded_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_student_results_batch_id ON student_results(batch_id);
  `);
}

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
export async function getBatchSessions(limit = 20): Promise<any[]> {
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
