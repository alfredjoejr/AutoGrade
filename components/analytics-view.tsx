import { Download, Users, Target, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const distributionData = [
  { range: '<60%', count: 2 },
  { range: '60-69%', count: 5 },
  { range: '70-79%', count: 12 },
  { range: '80-89%', count: 18 },
  { range: '90-100%', count: 8 },
];

const studentData = [
  { id: '9482', name: 'John Doe', score: 71, status: 'Reviewed' },
  { id: '9483', name: 'Jane Smith', score: 92, status: 'Auto-Graded' },
  { id: '9484', name: 'Michael Johnson', score: 85, status: 'Auto-Graded' },
  { id: '9485', name: 'Emily Davis', score: 58, status: 'Reviewed' },
  { id: '9486', name: 'Chris Wilson', score: 88, status: 'Auto-Graded' },
];

export function AnalyticsView({ totalQuestions }: { totalQuestions: number }) {
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
            <h3 className="text-2xl font-bold text-slate-900">45</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-green-50 flex items-center justify-center">
            <Target className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Class Average</p>
            <h3 className="text-2xl font-bold text-slate-900">81.4%</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ambiguous Flags</p>
            <h3 className="text-2xl font-bold text-slate-900">12</h3>
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
              <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

        {/* Tricky Questions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Most Missed Questions</h3>
          <div className="flex-1 space-y-4">
            {[
              { q: 7, missRate: '45%', topic: 'Photosynthesis' },
              { q: 12, missRate: '38%', topic: 'Cellular Respiration' },
              { q: 3, missRate: '22%', topic: 'Mitosis vs Meiosis' },
            ].map((item) => (
              <div key={item.q} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <div className="font-medium text-slate-900">Question {item.q}</div>
                  <div className="text-xs text-slate-500">{item.topic}</div>
                </div>
                <div className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                  {item.missRate} missed
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>

      {/* Student List & Export */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900">Student Results</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors shadow-sm text-xs uppercase tracking-wider">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-white">
                <th className="p-4 text-sm font-medium text-slate-500">Student ID</th>
                <th className="p-4 text-sm font-medium text-slate-500">Name</th>
                <th className="p-4 text-sm font-medium text-slate-500">Score</th>
                <th className="p-4 text-sm font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentData.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm font-medium text-slate-900">{student.id}</td>
                  <td className="p-4 text-sm text-slate-600">{student.name}</td>
                  <td className="p-4 text-sm">
                    <span className={`font-semibold ${student.score >= 90 ? 'text-green-600' : student.score < 60 ? 'text-red-600' : 'text-slate-900'}`}>
                      {student.score}%
                    </span>
                  </td>
                  <td className="p-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                      student.status === 'Auto-Graded' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
