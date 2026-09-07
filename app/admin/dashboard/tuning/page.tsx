"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Brain,
  Sparkles,
  Database,
  Download,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Layers,
  FileSpreadsheet,
  ChevronRight,
  TrendingUp,
  Cpu,
  History,
  Info
} from "lucide-react";

type TuningStats = {
  totalCorrections: number;
  masterKeyCount: number;
  studentModerationCount: number;
  mostCorrectedQuestions: Array<{ questionId: number; cnt: number }>;
};

type CorrectionRecord = {
  id: number;
  questionId: number;
  source: "master_key" | "student_moderation";
  aiDetected: string | null;
  teacherCorrected: string;
  notes: string | null;
  createdAt: string;
};

export default function AdminTuningPage() {
  const router = useRouter();
  const [stats, setStats] = useState<TuningStats | null>(null);
  const [corrections, setCorrections] = useState<CorrectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<"all" | "master_key" | "student_moderation">("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      // Check auth
      const authRes = await fetch("/api/admin/me");
      if (!authRes.ok) {
        router.replace("/admin");
        return;
      }

      const res = await fetch("/api/corrections");
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalCorrections: data.totalCorrections ?? 0,
          masterKeyCount: data.masterKeyCount ?? 0,
          studentModerationCount: data.studentModerationCount ?? 0,
          mostCorrectedQuestions: data.mostCorrectedQuestions ?? [],
        });
        setCorrections(data.recentLogs ?? []);
      }
    } catch (err) {
      console.error("Failed to load tuning data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/corrections/export");
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `autograde_tuning_dataset_${new Date().toISOString().slice(0, 10)}.jsonl`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export dataset");
    } finally {
      setExporting(false);
    }
  };

  const filteredCorrections = corrections.filter((c) => {
    if (filter === "all") return true;
    return c.source === filter;
  });

  const targetCount = 1000;
  const progressPercent = Math.min(
    100,
    Math.round(((stats?.totalCorrections ?? 0) / targetCount) * 100)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Batches
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Brain className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold tracking-tight text-white">
                AutoGrade <span className="text-purple-400">AI Continuous Learning Hub</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || (stats?.totalCorrections ?? 0) === 0}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className={`w-3.5 h-3.5 ${exporting ? "animate-bounce" : ""}`} />
              {exporting ? "Generating JSONL..." : "Export Gemini SFT Dataset"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Title & Architecture Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>Adaptive OCR Learning Architecture</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active System
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time teacher moderation feedback feeds Tier 1 In-Context few-shot prompts and Tier 3 Supervised Fine-Tuning.
            </p>
          </div>
        </div>

        {/* 3-Tier Architecture Diagram Visual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Tier 1 Card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                Tier 1 • Real-Time
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                In-Context Learning
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Educator corrections are immediately queried from PostgreSQL and dynamically injected as verified ground-truth few-shot examples into every subsequent Gemini Vision request.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-500">Latency impact:</span>
              <span className="font-semibold text-emerald-300">0ms (Live Dynamic Prompt)</span>
            </div>
          </div>

          {/* Tier 2 Card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20">
                Tier 2 • Aggregator
              </span>
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Dataset Curation
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Logs edge cases: ambiguous marks, double-ticked questions, faint pencil scans, and anomalous row alignments with full before/after educator choices.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-500">Curation storage:</span>
              <span className="font-semibold text-blue-300">PostgreSQL (Aiven SSL)</span>
            </div>
          </div>

          {/* Tier 3 Card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/20">
                Tier 3 • Offline SFT
              </span>
              <Cpu className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Supervised Fine-Tuning
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                When vetted samples accumulate, export formatted JSONL paired datasets for Gemini 2.5/3.5 offline adapter fine-tuning to permanently bake domain patterns into weights.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-500">SFT Milestones:</span>
                <span className="font-semibold text-purple-300">
                  {stats?.totalCorrections ?? 0} / {targetCount} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Corrections Logged
            </span>
            <div className="text-3xl font-bold text-white mt-2 tabular-nums">
              {stats?.totalCorrections ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">Available for few-shot injection</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Master Key Refinements
            </span>
            <div className="text-3xl font-bold text-blue-400 mt-2 tabular-nums">
              {stats?.masterKeyCount ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">Scanned answer sheet ground truths</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Student Overrides
            </span>
            <div className="text-3xl font-bold text-purple-400 mt-2 tabular-nums">
              {stats?.studentModerationCount ?? 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">Teacher grading moderation adjustments</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Top Ambiguous Questions
            </span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {stats && stats.mostCorrectedQuestions && stats.mostCorrectedQuestions.length > 0 ? (
                stats.mostCorrectedQuestions.slice(0, 4).map((q) => (
                  <span
                    key={q.questionId}
                    className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  >
                    Q{q.questionId} ({q.cnt}x)
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 mt-1">None flagged yet</span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1">Frequent edge case candidates</div>
          </div>
        </div>

        {/* Corrections Log & Curation Table */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-base font-bold text-white">Continuous Feedback Registry</h3>
                <p className="text-xs text-slate-400">
                  Every entry here is currently prioritized for Tier 1 few-shot injection and dataset export.
                </p>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/10">
              <button
                onClick={() => setFilter("all")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  filter === "all"
                    ? "bg-white/15 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All ({corrections.length})
              </button>
              <button
                onClick={() => setFilter("master_key")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  filter === "master_key"
                    ? "bg-blue-600/30 text-blue-300 border border-blue-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Master Key ({stats?.masterKeyCount ?? 0})
              </button>
              <button
                onClick={() => setFilter("student_moderation")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  filter === "student_moderation"
                    ? "bg-purple-600/30 text-purple-300 border border-purple-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Moderation ({stats?.studentModerationCount ?? 0})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-slate-400 uppercase tracking-wider border-b border-white/5">
                <tr>
                  <th className="px-6 py-3 font-semibold">Question #</th>
                  <th className="px-6 py-3 font-semibold">Source</th>
                  <th className="px-6 py-3 font-semibold">AI Detected</th>
                  <th className="px-6 py-3 font-semibold">Teacher Verified</th>
                  <th className="px-6 py-3 font-semibold">Context / Notes</th>
                  <th className="px-6 py-3 font-semibold">Logged At</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCorrections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <Database className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                      No feedback logs recorded yet. Corrections made during grading or master key inspection will appear here automatically.
                    </td>
                  </tr>
                ) : (
                  filteredCorrections.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-white">
                        <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">
                          Q{item.questionId}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {item.source === "master_key" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Master Key
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Student Moderation
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-rose-400 font-mono font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          {item.aiDetected || "BLANK / NULL"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {item.teacherCorrected}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-300 max-w-xs truncate">
                        {item.notes || "Manual teacher override"}
                      </td>
                      <td className="px-6 py-3.5 text-slate-400 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Tier 1 Injected
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
