"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  Loader2,
  LayoutDashboard,
  Users,
  BarChart3,
  FolderOpen,
  ChevronRight,
  TrendingUp,
  Calendar,
  Brain,
} from "lucide-react";

type BatchSession = {
  id: string;
  total_questions: number;
  threshold: number;
  created_at: string;
  student_count: number;
  avg_score: number | null;
};

type AdminStats = {
  totalBatches: number;
  totalStudents: number;
  overallAverage: number;
};

type AdminUser = {
  id: number;
  username: string;
  displayName: string;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [sessions, setSessions] = useState<BatchSession[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Check auth
        const authRes = await fetch("/api/admin/me");
        if (!authRes.ok) {
          router.replace("/admin");
          return;
        }
        const authData = await authRes.json();
        if (cancelled) return;
        setUser(authData.user);

        // Fetch dashboard data
        const dataRes = await fetch("/api/admin/batches");
        if (!dataRes.ok) {
          if (dataRes.status === 401) router.replace("/admin");
          return;
        }
        const data = await dataRes.json();
        if (cancelled) return;
        setSessions(data.sessions || []);
        setStats(data.stats || null);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        if (!cancelled) router.replace("/admin");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
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
          <p className="text-sm text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">
                AutoGrade <span className="text-blue-400">Admin</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard/tuning"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-purple-300 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-all shadow-sm shadow-purple-900/20"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Tuning & Learning</span>
            </Link>

            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                <div className="w-6 h-6 rounded-full bg-blue-600/30 flex items-center justify-center text-xs font-bold text-blue-300">
                  {user.displayName[0]}
                </div>
                <span className="text-xs text-slate-300 font-medium">
                  {user.displayName}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all"
            >
              {loggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Overview of all grading sessions and student results.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="relative overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 group hover:border-blue-500/30 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Total Batches
              </p>
              <p className="text-3xl font-bold text-white tabular-nums">
                {stats?.totalBatches ?? 0}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 group hover:border-emerald-500/30 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Students Graded
              </p>
              <p className="text-3xl font-bold text-white tabular-nums">
                {stats?.totalStudents ?? 0}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 group hover:border-violet-500/30 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-violet-400" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Overall Average
              </p>
              <p className="text-3xl font-bold text-white tabular-nums">
                {stats?.overallAverage ?? 0}
                <span className="text-lg text-slate-500">%</span>
              </p>
            </div>
          </div>
        </div>

        {/* Batch Sessions Table */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">
                Grading Sessions
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              {sessions.length} batch{sessions.length !== 1 ? "es" : ""}
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FolderOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">
                No grading sessions found
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Batch results will appear here once grading data is saved to the
                database.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Batch ID
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Questions
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Students
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Avg Score
                    </th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Threshold
                    </th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sessions.map((session) => (
                    <tr
                      key={session.id}
                      className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/dashboard/batch/${session.id}`)
                      }
                    >
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                          {session.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {formatDate(session.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 tabular-nums">
                        {session.total_questions}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-sm text-slate-300 tabular-nums">
                            {session.student_count}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {session.avg_score !== null ? (
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              Number(session.avg_score) >= 90
                                ? "text-emerald-400"
                                : Number(session.avg_score) >= 70
                                ? "text-blue-400"
                                : Number(session.avg_score) >= 60
                                ? "text-amber-400"
                                : "text-red-400"
                            }`}
                          >
                            {session.avg_score}%
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400 tabular-nums">
                        {session.threshold}%
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
