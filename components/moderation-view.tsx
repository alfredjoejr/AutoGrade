import { Search, ZoomIn, ZoomOut, Maximize, AlertCircle, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { StudentGradingResult, QuestionResult } from "@/lib/types";

export function ModerationView({ 
  totalQuestions, 
  students,
  setStudents,
  onModerationComplete
}: { 
  totalQuestions: number,
  students: StudentGradingResult[],
  setStudents: (s: StudentGradingResult[]) => void,
  onModerationComplete: (students: StudentGradingResult[]) => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (students.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-600">No Students to Review</h3>
          <p className="text-sm text-slate-400">Upload student answer sheets in the Setup tab first.</p>
        </div>
      </div>
    );
  }

  const currentStudent = students[currentIndex];
  const results = currentStudent.results;
  const isLastStudent = currentIndex === students.length - 1;
  const reviewedCount = students.filter(s => s.status === 'reviewed').length;

  // Compute live score for current student
  const correctCount = results.filter(r => r.status === 'correct').length;
  const liveScore = Math.round((correctCount / totalQuestions) * 100);

  const handleOverride = (questionId: number, overrideAnswer: string) => {
    const targetQ = results.find(q => q.id === questionId);
    const prevDetected = targetQ ? targetQ.detected : null;

    // Log teacher correction asynchronously to PostgreSQL feedback loop
    fetch('/api/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId,
        source: 'student_moderation',
        aiDetected: prevDetected,
        teacherCorrected: overrideAnswer,
        studentId: currentStudent.studentId,
        notes: `Teacher changed from ${prevDetected ?? 'blank'} to ${overrideAnswer} during student moderation`
      })
    }).catch(err => console.error("Failed to log student moderation correction:", err));

    const updatedResults = results.map(q => {
      if (q.id === questionId) {
        const isCorrect = overrideAnswer.trim().toUpperCase() === q.correct.trim().toUpperCase();
        return { 
          ...q, 
          detected: overrideAnswer, 
          status: (isCorrect ? 'correct' : 'incorrect') as QuestionResult['status'],
          confidence: 100
        };
      }
      return q;
    });

    // Update the student in the array
    const updatedStudents = [...students];
    const updatedCorrectCount = updatedResults.filter(r => r.status === 'correct').length;
    const updatedScore = Math.round((updatedCorrectCount / totalQuestions) * 100 * 100) / 100;
    
    updatedStudents[currentIndex] = {
      ...currentStudent,
      results: updatedResults,
      score: updatedScore,
    };
    setStudents(updatedStudents);
  };

  const handleApproveAndNext = () => {
    // Mark current student as reviewed
    const updatedStudents = [...students];
    updatedStudents[currentIndex] = {
      ...currentStudent,
      status: 'reviewed',
    };
    setStudents(updatedStudents);

    if (isLastStudent) {
      // All students reviewed — go to analytics
      onModerationComplete(updatedStudents);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
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

  // Generate dynamic answer option buttons based on current question's correct answer range
  const getOptionLetters = (): string[] => {
    // Find the max letter used in any correct answer to infer option count
    let maxCharCode = 68; // Default: D
    results.forEach(r => {
      if (r.correct) {
        const code = r.correct.charCodeAt(0);
        if (code > maxCharCode) maxCharCode = code;
      }
    });
    const count = maxCharCode - 64; // A=65, so 65-64=1 option... we need at least to include all
    return Array.from({ length: Math.max(count, 4) }, (_, i) => String.fromCharCode(65 + i));
  };

  const options = getOptionLetters();

  return (
    <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col lg:flex-row gap-6">
      
      {/* Left Panel: Document Viewer */}
      <div className="flex-1 bg-white rounded-xl overflow-hidden flex flex-col relative border border-slate-200 shadow-inner">
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 pointer-events-none">
          <div className="bg-white/90 backdrop-blur text-slate-900 text-sm px-3 py-1.5 rounded-md border border-slate-200 shadow-sm pointer-events-auto">
            Student: <strong>{currentStudent.studentId}</strong>
            <span className="text-slate-400 ml-2 text-xs">({currentStudent.fileName})</span>
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
        
        {/* Document Area */}
        <div className="flex-1 relative w-full h-full min-h-[400px]">
          {currentStudent.imageBase64 ? (
            <Image 
              src={currentStudent.imageBase64} 
              alt={`Answer sheet for ${currentStudent.studentId}`} 
              fill 
              className="object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              No image available
            </div>
          )}
        </div>

        {/* Student Navigation Bar */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button 
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </button>
          
          <div className="flex items-center gap-2">
            {students.map((s, idx) => (
              <button
                key={s.studentId}
                onClick={() => setCurrentIndex(idx)}
                className={`w-7 h-7 rounded text-[10px] font-bold transition-all border ${
                  idx === currentIndex
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : s.status === 'reviewed'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
                title={s.studentId}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setCurrentIndex(prev => Math.min(students.length - 1, prev + 1))}
            disabled={isLastStudent}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Panel: Grading Table */}
      <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Responses
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {reviewedCount} of {students.length} students reviewed
            </p>
          </div>
          <div className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded border border-blue-100 uppercase tracking-wider">
            Score: {liveScore}%
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
                  {options.map(opt => (
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
          <button 
            onClick={handleApproveAndNext}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          >
            {isLastStudent ? 'Approve & View Results' : `Approve & Next (${currentIndex + 1}/${students.length})`}
          </button>
        </div>
      </div>
      
    </div>
  );
}
