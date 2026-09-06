import { Search, ZoomIn, ZoomOut, Maximize, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type QuestionResult = {
  id: number;
  detected: string | null;
  correct: string;
  status: 'correct' | 'incorrect' | 'ambiguous';
  confidence?: number;
};

export function ModerationView({ 
  totalQuestions, 
  results, 
  setResults, 
  scannedImage 
}: { 
  totalQuestions: number,
  results: QuestionResult[],
  setResults: (res: QuestionResult[]) => void,
  scannedImage: string | null
}) {
  const handleOverride = (id: number, overrideAnswer: string) => {
    setResults(results.map(q => {
      if (q.id === id) {
        const isCorrect = overrideAnswer === q.correct;
        return { ...q, detected: overrideAnswer, status: isCorrect ? 'correct' : 'incorrect' };
      }
      return q;
    }));
  };

  const getStatusColor = (status: QuestionResult['status']) => {
    switch (status) {
      case 'correct': return 'bg-green-100 text-green-800 border-green-200';
      case 'incorrect': return 'bg-red-50 text-red-800 border-red-200';
      case 'ambiguous': return 'bg-amber-50 text-amber-800 border-amber-400';
    }
  };

  const getStatusIcon = (status: QuestionResult['status']) => {
    switch (status) {
      case 'correct': return <CheckCircle2 className="w-4 h-4" />;
      case 'incorrect': return <XCircle className="w-4 h-4" />;
      case 'ambiguous': return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col lg:flex-row gap-6">
      
      {/* Left Panel: Document Viewer */}
      <div className="flex-1 bg-white rounded-xl overflow-hidden flex flex-col relative border border-slate-200 shadow-inner">
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 pointer-events-none">
          <div className="bg-white/90 backdrop-blur text-slate-900 text-sm px-3 py-1.5 rounded-md border border-slate-200 shadow-sm pointer-events-auto">
            Student: <strong>John Doe (ID: 9482)</strong>
          </div>
          <div className="flex gap-2 pointer-events-auto">
            <button className="p-2 bg-white/90 hover:bg-slate-50 backdrop-blur text-slate-600 rounded-md border border-slate-200 shadow-sm transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button className="p-2 bg-white/90 hover:bg-slate-50 backdrop-blur text-slate-600 rounded-md border border-slate-200 shadow-sm transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button className="p-2 bg-white/90 hover:bg-slate-50 backdrop-blur text-slate-600 rounded-md border border-slate-200 shadow-sm transition-colors">
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Mock Document Area */}
        <div className="flex-1 relative w-full h-full min-h-[400px]">
          <Image 
            src={scannedImage || "https://picsum.photos/seed/document1/800/1200"} 
            alt="Scanned Exam Paper" 
            fill 
            className="object-contain"
            referrerPolicy="no-referrer"
          />
          {/* Mock Overlay Bounding Box */}
          <div className="absolute top-[35%] left-[20%] w-[60%] h-[12%] border-2 border-amber-400 bg-amber-50/50 shadow-[0_0_15px_rgba(245,158,11,0.2)] rounded pointer-events-none animate-pulse z-10"></div>
        </div>
      </div>

      {/* Right Panel: Grading Table */}
      <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Flagged Responses
            </h3>
          </div>
          <div className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded border border-blue-100 uppercase tracking-wider">
            Score: 71%
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {results.map((q) => (
            <div key={q.id} className="p-3 mb-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-400 w-6">Q{q.id}</span>
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(q.status)}`}>
                    {getStatusIcon(q.status)}
                    <span className="capitalize">{q.status}</span>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-slate-500">Key: </span>
                  <strong className="text-slate-900">{q.correct}</strong>
                </div>
              </div>
              
              <div className="flex justify-between items-center pl-9">
                <div className="text-sm">
                  <span className="text-slate-500">Detected: </span>
                  <strong className={q.status === 'correct' ? 'text-green-700' : q.status === 'incorrect' ? 'text-red-700' : 'text-amber-700'}>
                    {q.detected || 'Blank'}
                  </strong>
                </div>
                
                {/* Override Actions */}
                <div className={`flex gap-1 transition-opacity ${q.status === 'ambiguous' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleOverride(q.id, opt)}
                      className={`w-7 h-7 text-xs font-medium rounded border transition-colors ${
                        q.detected === opt 
                          ? 'bg-slate-800 text-white border-slate-800' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-md hover:bg-blue-700 transition-colors shadow-sm">
            Approve & Next
          </button>
        </div>
      </div>
      
    </div>
  );
}
