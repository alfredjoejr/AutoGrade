"use client";

import { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  FileCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  User,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles
} from "lucide-react";

type StudentSubmission = {
  id: string;
  studentId: string;
  studentName: string;
  assignmentTitle: string;
  fileName: string;
  mimeType: string;
  imageBase64: string;
  status: "pending" | "processing" | "graded";
  score?: number | null;
  results?: any[] | null;
  createdAt: string;
  gradedAt?: string | null;
};

export function StudentPortalView({
  defaultStudentId = "STU-101",
  defaultStudentName = "Alex Johnson",
}: {
  defaultStudentId?: string;
  defaultStudentName?: string;
}) {
  const [studentId, setStudentId] = useState(defaultStudentId);
  const [studentName, setStudentName] = useState(defaultStudentName);
  const [assignmentTitle, setAssignmentTitle] = useState("Midterm MCQ Exam");

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Submissions list state
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSubmissions = async () => {
    setIsLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/submissions?studentId=${encodeURIComponent(studentId)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.submissions)) {
        setSubmissions(data.submissions);
      }
    } catch (err) {
      console.error("Failed to load student submissions:", err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [studentId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setSubmitSuccess(null);
    setSubmitError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !previewUrl) {
      setSubmitError("Please select a scanned answer sheet to upload.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const base64Data = previewUrl.split(",")[1];
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          studentName,
          assignmentTitle,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          imageBase64: base64Data,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setSubmitSuccess("Your answer sheet has been submitted! It is now waiting for your teacher to evaluate.");
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Refresh submissions
      fetchSubmissions();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit answer sheet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            Student Submission Portal
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Upload Your MCQ Answer Sheet</h1>
          <p className="text-blue-100 text-sm mt-1 max-w-xl">
            Submit your scanned bubble sheet for evaluation. Once your instructor runs the grading batch, your score and detailed question breakdown will appear here.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 text-xs flex items-center gap-3">
          <User className="w-4 h-4 text-blue-200" />
          <div>
            <div className="font-semibold">{studentName}</div>
            <div className="text-blue-200 font-mono text-[11px]">{studentId}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Submission Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">New Submission</h2>
              <p className="text-xs text-slate-500">Provide assignment details and upload your answer sheet image.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {submitSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            {submitError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Student Name
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Student ID / Roll No.
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. STU-101"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Assignment / Exam Title
              </label>
              <input
                type="text"
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                placeholder="e.g. Midterm MCQ Exam"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* File Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Scanned Answer Sheet
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />

              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer bg-slate-50/60 hover:bg-blue-50/40 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    Click to select your scanned answer sheet
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports JPG, PNG, WEBP (Clear, well-lit photos recommended)
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-700 truncate">
                      <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate">{selectedFile?.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs text-red-600 hover:underline font-medium"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="max-h-56 overflow-hidden rounded-lg border border-slate-200 bg-black/5 flex items-center justify-center">
                    <img
                      src={previewUrl}
                      alt="Sheet Preview"
                      className="object-contain max-h-56 w-auto rounded"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-md shadow-blue-600/10 flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Answer Sheet...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  Submit Sheet for Teacher Evaluation
                </>
              )}
            </button>
          </form>
        </div>

        {/* My Submissions History (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              My Submissions & Scores
            </h2>
            <button
              type="button"
              onClick={fetchSubmissions}
              disabled={isLoadingSubmissions}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              title="Refresh submissions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSubmissions ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>

          {isLoadingSubmissions ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
              Loading your submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No submissions found</p>
              <p className="mt-1">Upload your first answer sheet on the left to get evaluated by your instructor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => {
                const isGraded = sub.status === "graded";
                const isExpanded = expandedId === sub.id;

                return (
                  <div
                    key={sub.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200"
                  >
                    <div className="p-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{sub.assignmentTitle}</span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isGraded
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isGraded ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Graded
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                Awaiting Evaluation
                              </>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(sub.createdAt).toLocaleDateString()} {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-600">{sub.fileName}</span>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className="text-right shrink-0">
                        {isGraded && sub.score !== null && sub.score !== undefined ? (
                          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Score</span>
                            <span className="text-lg font-black text-emerald-600">{sub.score}%</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 font-medium">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand breakdown toggle if graded */}
                    {isGraded && Array.isArray(sub.results) && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                          className="w-full px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-between"
                        >
                          <span>{isExpanded ? "Hide" : "View"} Question Breakdown ({sub.results.length} questions)</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isExpanded && (
                          <div className="p-4 bg-slate-50/50 border-t border-slate-100 max-h-60 overflow-y-auto space-y-1.5">
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                              {sub.results.map((q: any) => (
                                <div
                                  key={q.id}
                                  className={`p-1.5 rounded text-center text-xs font-mono border ${
                                    q.status === 'correct'
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold'
                                      : q.status === 'ambiguous'
                                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                                      : 'bg-red-50 border-red-200 text-red-800'
                                  }`}
                                >
                                  <div className="text-[10px] text-slate-500 font-sans">Q{q.id}</div>
                                  <div>{q.detected || '-'}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
