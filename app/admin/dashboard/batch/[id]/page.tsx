"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Download,
  Users,
  Target,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Hash,
  FileText,
} from "lucide-react";

type StudentResult = {
  student_id: string;
  file_name: string;
  score: number;
  status: string;
  results: Array<{
    id: number;
    detected: string | null;
    correct: string;
    status: "correct" | "incorrect" | "ambiguous";
  }>;
  graded_at: string;
};

type BatchData = {
  batch: {
    id: string;
    total_questions: number;
    master_key: Record<string, string>;
    threshold: number;
    created_at: string;
  };
  students: StudentResult[];
};

export default function BatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.id as string;

  const [data, setData] = useState<BatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadBatch() {
      try {
        const res = await fetch(`/api/admin/batches/${batchId}`);
        if (res.status === 401) {
          router.replace("/admin");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError("Batch not found");
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Failed to load batch data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBatch();
    return () => { cancelled = true; };
  }, [batchId, router]);

  const analytics = useMemo(() => {
    if (!data || data.students.length === 0) {
      return {
        avgScore: 0,
        totalStudents: 0,
        ambiguousFlags: 0,
        passRate: 0,
        distribution: [] as { range: string; count: number }[],
        mostMissed: [] as { q: number; missRate: string; missCount: number }[],
      };
    }

    const students = data.students;
    const totalStudents = students.length;
    const avgScore =
      Math.round(
        (students.reduce((sum, s) => sum + Number(s.score), 0) /
          totalStudents) *
          100
      ) / 100;

    const ambiguousFlags = students.reduce(
      (sum, s) =>
        sum + (s.results?.filter((r) => r.status === "ambiguous").length || 0),
      0
    );

    const threshold = data.batch.threshold;
    const passRate = Math.round(
      (students.filter((s) => Number(s.score) >= threshold).length /
        totalStudents) *
        100
    );

    const ranges = [
      { range: "<60%", min: 0, max: 59.99 },
      { range: "60-69%", min: 60, max: 69.99 },
      { range: "70-79%", min: 70, max: 79.99 },
      { range: "80-89%", min: 80, max: 89.99 },
      { range: "90-100%", min: 90, max: 100 },
    ];
    const distribution = ranges.map((r) => ({
      range: r.range,
      count: students.filter(
        (s) => Number(s.score) >= r.min && Number(s.score) <= r.max
      ).length,
    }));

    const questionMissCounts: Record<number, number> = {};
    students.forEach((s) => {
      s.results?.forEach((r) => {
        if (r.status === "incorrect") {
          questionMissCounts[r.id] = (questionMissCounts[r.id] || 0) + 1;
        }
      });
    });
    const mostMissed = Object.entries(questionMissCounts)
      .map(([qId, count]) => ({
        q: Number(qId),
        missRate: `${Math.round((count / totalStudents) * 100)}%`,
        missCount: count,
      }))
      .sort((a, b) => b.missCount - a.missCount)
      .slice(0, 5);

    return {
      avgScore,
      totalStudents,
      ambiguousFlags,
      passRate,
      distribution,
      mostMissed,
    };
  }, [data]);

  const handleExportCSV = () => {
    if (!data) return;
    const headers = [
      "Student ID",
      "File Name",
      "Score (%)",
      "Status",
      "Correct",
      "Incorrect",
      "Ambiguous",
      "Graded At",
    ];
    const rows = data.students.map((s) => {
      const correct = s.results?.filter((r) => r.status === "correct").length || 0;
      const incorrect =
        s.results?.filter((r) => r.status === "incorrect").length || 0;
      const ambiguous =
        s.results?.filter((r) => r.status === "ambiguous").length || 0;
      return [
        s.student_id,
        s.file_name,
        s.score,
        s.status,
        correct,
        incorrect,
        ambiguous,
        s.graded_at,
      ];
    });

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `autograde_batch_${batchId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading batch details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <p className="text-slate-300 font-medium">{error || "Batch not found"}</p>
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { batch, students } = data;
  const maxCount = Math.max(...analytics.distribution.map((d) => d.count), 1);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Batch Info Header */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Batch{" "}
                <span className="font-mono text-blue-400">
                  {batch.id.slice(0, 8)}
                </span>
              </h1>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(batch.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" />
                  {batch.total_questions} questions
                </span>
                <span>Threshold: {batch.threshold}%</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                <p className="text-[10px] text-blue-300 uppercase font-bold tracking-wider">
                  Students
                </p>
                <p className="text-lg font-bold text-white tabular-nums">
                  {analytics.totalStudents}
                </p>
              </div>
              <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
                <p className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">
                  Average
                </p>
                <p className="text-lg font-bold text-white tabular-nums">
                  {analytics.avgScore}%
                </p>
              </div>
              <div className="px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg text-center">
                <p className="text-[10px] text-violet-300 uppercase font-bold tracking-wider">
                  Pass Rate
                </p>
                <p className="text-lg font-bold text-white tabular-nums">
                  {analytics.passRate}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Distribution Chart — CSS bars */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-6">
              Score Distribution
            </h3>
            <div className="flex items-end gap-3 h-48">
              {analytics.distribution.map((d) => {
                const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                return (
                  <div
                    key={d.range}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <span className="text-xs text-slate-300 font-semibold tabular-nums">
                      {d.count}
                    </span>
                    <div className="w-full flex flex-col justify-end h-36">
                      <div
                        className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-500"
                        style={{
                          height: `${Math.max(heightPct, d.count > 0 ? 8 : 0)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {d.range}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Most Missed */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 flex flex-col">
            <h3 className="text-sm font-bold text-white mb-4">
              Most Missed Questions
            </h3>
            <div className="flex-1 space-y-3">
              {analytics.mostMissed.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  No missed questions!
                </div>
              ) : (
                analytics.mostMissed.map((item) => (
                  <div
                    key={item.q}
                    className="flex justify-between items-center p-3 bg-white/[0.03] rounded-lg border border-white/5"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        Q{item.q}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Correct:{" "}
                        {batch.master_key?.[String(item.q)] || "—"}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded">
                      {item.missRate}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Student Results Table */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Student Results</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Student ID
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Correct
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Incorrect
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Ambiguous
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Graded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {students.map((student, idx) => {
                  const correct =
                    student.results?.filter((r) => r.status === "correct")
                      .length || 0;
                  const incorrect =
                    student.results?.filter((r) => r.status === "incorrect")
                      .length || 0;
                  const ambiguous =
                    student.results?.filter((r) => r.status === "ambiguous")
                      .length || 0;
                  const score = Number(student.score);

                  return (
                    <tr
                      key={`${student.student_id}-${idx}`}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        {student.student_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400 truncate max-w-[180px]">
                        {student.file_name}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            score >= 90
                              ? "text-emerald-400"
                              : score >= 70
                              ? "text-blue-400"
                              : score >= 60
                              ? "text-amber-400"
                              : "text-red-400"
                          }`}
                        >
                          {student.score}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-400 font-medium tabular-nums">
                        {correct}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-400 font-medium tabular-nums">
                        {incorrect}
                      </td>
                      <td className="px-6 py-4 text-sm text-amber-400 font-medium tabular-nums">
                        {ambiguous}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                            student.status === "reviewed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(student.graded_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Master Key Section */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">
            Master Answer Key
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(batch.master_key || {})
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([qNum, answer]) => (
                <div
                  key={qNum}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/[0.03] border border-white/5 rounded-lg"
                >
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    Q{qNum}
                  </span>
                  <span className="text-xs text-blue-400 font-bold uppercase">
                    {String(answer)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}
