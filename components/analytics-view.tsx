import { Download, Users, Target, AlertTriangle, Database, Loader2, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useMemo } from "react";
import type { StudentGradingResult } from "@/lib/types";

export function AnalyticsView({ 
  totalQuestions, 
  students,
  masterKey,
  batchId,
  threshold
}: { 
  totalQuestions: number,
  students: StudentGradingResult[],
  masterKey: Record<number, string>,
  batchId: string,
  threshold: number
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  // Compute real analytics from student data
  const analytics = useMemo(() => {
    if (students.length === 0) {
      return {
        totalPapers: 0,
        classAverage: 0,
        ambiguousFlags: 0,
        distributionData: [],
        mostMissed: [],
      };
    }

    const totalPapers = students.length;
    const classAverage = Math.round(
      (students.reduce((sum, s) => sum + s.score, 0) / totalPapers) * 100
    ) / 100;

    // Count total ambiguous flags across all students
    const ambiguousFlags = students.reduce(
      (sum, s) => sum + s.results.filter(r => r.status === 'ambiguous').length, 0
    );

    // Score distribution
    const ranges = [
      { range: '<60%', min: 0, max: 59.99 },
      { range: '60-69%', min: 60, max: 69.99 },
      { range: '70-79%', min: 70, max: 79.99 },
      { range: '80-89%', min: 80, max: 89.99 },
      { range: '90-100%', min: 90, max: 100 },
    ];
    const distributionData = ranges.map(r => ({
      range: r.range,
      count: students.filter(s => s.score >= r.min && s.score <= r.max).length
    }));

    // Most missed questions
    const questionMissCounts: Record<number, number> = {};
    students.forEach(s => {
      s.results.forEach(r => {
        if (r.status === 'incorrect') {
          questionMissCounts[r.id] = (questionMissCounts[r.id] || 0) + 1;
        }
      });
    });
    const mostMissed = Object.entries(questionMissCounts)
      .map(([qId, count]) => ({
        q: Number(qId),
        missRate: `${Math.round((count / totalPapers) * 100)}%`,
        missCount: count,
      }))
      .sort((a, b) => b.missCount - a.missCount)
      .slice(0, 5);

    return { totalPapers, classAverage, ambiguousFlags, distributionData, mostMissed };
  }, [students]);

  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    setSaveMessage('');

    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: batchId,
          totalQuestions,
          masterKey,
          threshold,
          students: students.map(s => ({
            studentId: s.studentId,
            fileName: s.fileName,
            score: s.score,
            status: s.status,
            results: s.results,
            gradedAt: s.gradedAt,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save results');
      }

      setSaveStatus('success');
      setSaveMessage(`Batch saved successfully! ID: ${batchId.slice(0, 8)}...`);
    } catch (err: any) {
      console.error('Error saving to database:', err);
      setSaveStatus('error');
      setSaveMessage(err.message || 'Failed to save to database. Check your DATABASE_URL in .env.local');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (students.length === 0) return;

    const headers = ['Student ID', 'File Name', 'Score (%)', 'Status', 'Correct', 'Incorrect', 'Ambiguous', 'Graded At'];
    const rows = students.map(s => {
      const correct = s.results.filter(r => r.status === 'correct').length;
      const incorrect = s.results.filter(r => r.status === 'incorrect').length;
      const ambiguous = s.results.filter(r => r.status === 'ambiguous').length;
      return [s.studentId, s.fileName, s.score, s.status, correct, incorrect, ambiguous, s.gradedAt];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autograde_batch_${batchId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (students.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-600">No Results Available</h3>
          <p className="text-sm text-slate-400">Complete the upload and moderation steps first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-blue-50 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Papers</p>
            <h3 className="text-2xl font-bold text-slate-900">{analytics.totalPapers}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-green-50 flex items-center justify-center">
            <Target className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Class Average</p>
            <h3 className="text-2xl font-bold text-slate-900">{analytics.classAverage}%</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ambiguous Flags</p>
            <h3 className="text-2xl font-bold text-slate-900">{analytics.ambiguousFlags}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Area */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-900">Grade Distribution</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.distributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="range" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Missed Questions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Most Missed Questions</h3>
          <div className="flex-1 space-y-4">
            {analytics.mostMissed.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-400" />
                No missed questions!
              </div>
            ) : (
              analytics.mostMissed.map((item) => (
                <div key={item.q} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <div className="font-medium text-slate-900">Question {item.q}</div>
                    <div className="text-xs text-slate-500">Correct: {masterKey[item.q] || '—'}</div>
                  </div>
                  <div className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                    {item.missRate} missed
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
      </div>

      {/* Student List & Export */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900">Student Results</h3>
          <div className="flex items-center gap-3">
            {/* Save to Database */}
            <button 
              onClick={handleSaveToDatabase}
              disabled={isSaving || saveStatus === 'success'}
              className={`flex items-center gap-2 px-4 py-2 font-bold rounded-md text-xs uppercase tracking-wider transition-colors shadow-sm ${
                saveStatus === 'success'
                  ? 'bg-emerald-600 text-white cursor-default'
                  : saveStatus === 'error'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-violet-600 text-white hover:bg-violet-700'
              } disabled:opacity-60`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveStatus === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              {saveStatus === 'success' ? 'Saved' : saveStatus === 'error' ? 'Retry Save' : 'Save to Database'}
            </button>

            {/* Export CSV */}
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors shadow-sm text-xs uppercase tracking-wider"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Save status message */}
        {saveMessage && (
          <div className={`px-4 py-2 text-xs font-medium ${
            saveStatus === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100'
              : 'bg-red-50 text-red-700 border-b border-red-100'
          }`}>
            {saveMessage}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-white">
                <th className="p-4 text-sm font-medium text-slate-500">Student ID</th>
                <th className="p-4 text-sm font-medium text-slate-500">File Name</th>
                <th className="p-4 text-sm font-medium text-slate-500">Score</th>
                <th className="p-4 text-sm font-medium text-slate-500">Correct</th>
                <th className="p-4 text-sm font-medium text-slate-500">Incorrect</th>
                <th className="p-4 text-sm font-medium text-slate-500">Ambiguous</th>
                <th className="p-4 text-sm font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => {
                const correct = student.results.filter(r => r.status === 'correct').length;
                const incorrect = student.results.filter(r => r.status === 'incorrect').length;
                const ambiguous = student.results.filter(r => r.status === 'ambiguous').length;

                return (
                  <tr key={student.studentId} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm font-medium text-slate-900">{student.studentId}</td>
                    <td className="p-4 text-sm text-slate-500 truncate max-w-[200px]">{student.fileName}</td>
                    <td className="p-4 text-sm">
                      <span className={`font-semibold ${student.score >= 90 ? 'text-green-600' : student.score < 60 ? 'text-red-600' : 'text-slate-900'}`}>
                        {student.score}%
                      </span>
                    </td>
                    <td className="p-4 text-sm text-green-600 font-medium">{correct}</td>
                    <td className="p-4 text-sm text-red-600 font-medium">{incorrect}</td>
                    <td className="p-4 text-sm text-amber-600 font-medium">{ambiguous}</td>
                    <td className="p-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                        student.status === 'reviewed' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
