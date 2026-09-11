import {
  UploadCloud,
  FileType,
  SlidersHorizontal,
  CheckCircle2,
  Loader2,
  Settings2,
  ArrowRight,
  RotateCcw,
  ListOrdered,
  Sparkles,
  Pencil,
  Check,
  Camera,
  AlertTriangle,
  X,
  Users,
  Eye,
  ChevronDown,
  ChevronUp,
  Inbox,
  RefreshCw,
  CheckSquare,
  Square,
  Calendar,
  User as UserIcon,
} from "lucide-react";
import { useState, useRef, useMemo, useEffect } from "react";
import type { StudentGradingResult, QuestionResult } from "@/lib/types";
import { MasterKeyModal } from "@/components/master-key-modal";
import { ConsensusReview } from "@/components/consensus-review";
import type { ConsensusItem, AgentInfo, ConsensusSummary as ConsensusSummaryType } from "@/components/consensus-review";

export function UploadView({
  totalQuestions,
  setTotalQuestions,
  onBatchComplete
}: {
  totalQuestions: number,
  setTotalQuestions: (n: number) => void,
  onBatchComplete: (students: StudentGradingResult[], masterKey: Record<number, string>, batchId: string) => void
}) {
  const [threshold, setThreshold] = useState(85);
  const [masterKey, setMasterKey] = useState<Record<number, string>>({});
  const [isGrading, setIsGrading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Progressive Answer Key setup state
  const [isKeyConfigured, setIsKeyConfigured] = useState(false);
  const [inputTotalQuestions, setInputTotalQuestions] = useState<number>(totalQuestions || 25);
  const [optionsPerQuestion, setOptionsPerQuestion] = useState<number>(4); // Default: 4 options (A-D)

  // AI Master Key extraction state
  const [isExtractingKey, setIsExtractingKey] = useState(false);
  const [keyConfidences, setKeyConfidences] = useState<Record<number, number>>({});
  const [extractionNotice, setExtractionNotice] = useState<string | null>(null);
  const masterKeyFileInputRef = useRef<HTMLInputElement>(null);

  // Master key inspection & display states
  const [masterKeyImage, setMasterKeyImage] = useState<string | null>(null);
  const [masterKeyFileName, setMasterKeyFileName] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showInlineGrid, setShowInlineGrid] = useState(true);

  // Batch upload progress state
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchFiles, setBatchFiles] = useState<File[]>([]);

  // Teacher Student Submissions Ingestion state
  const [batchSource, setBatchSource] = useState<'manual' | 'fetched'>('manual');
  const [fetchedSubmissions, setFetchedSubmissions] = useState<any[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);

  // ─── Dual-Agent Consensus State ─────────────────────────────────────
  const [keyConsensus, setKeyConsensus] = useState<ConsensusItem[] | null>(null);
  const [keySummary, setKeySummary] = useState<ConsensusSummaryType | null>(null);
  const [approvedKeySummary, setApprovedKeySummary] = useState<ConsensusSummaryType | null>(null);
  const [keyAgentA, setKeyAgentA] = useState<AgentInfo | null>(null);
  const [keyAgentB, setKeyAgentB] = useState<AgentInfo | null>(null);
  const [keySingleFallback, setKeySingleFallback] = useState(false);
  const [keyImageHash, setKeyImageHash] = useState<string | null>(null);
  const [isApprovingKey, setIsApprovingKey] = useState(false);
  const [pendingGradeResults, setPendingGradeResults] = useState<Array<{
    student: StudentGradingResult;
    consensus: ConsensusItem[];
    summary: ConsensusSummaryType;
    agentA: AgentInfo;
    agentB: AgentInfo;
    singleFallback: boolean;
    submissionId?: string;
  }> | null>(null);
  const [isApprovingGrades, setIsApprovingGrades] = useState(false);
  const [pendingBatchId, setPendingBatchId] = useState<string | null>(null);
  const [pendingEffectiveKey, setPendingEffectiveKey] = useState<Record<number, string> | null>(null);

  const questionPresets = [10, 20, 25, 50, 100];
  const optionPresets = [
    { count: 3, label: "3 Options", range: "A – C" },
    { count: 4, label: "4 Options", range: "A – D" },
    { count: 5, label: "5 Options", range: "A – E" },
    { count: 6, label: "6 Options", range: "A – F" },
  ];

  const currentOptions = Array.from({ length: optionsPerQuestion }, (_, i) =>
    String.fromCharCode(65 + i)
  );

  const handleInitializeKey = () => {
    const validCount = Math.max(1, Math.min(100, Number(inputTotalQuestions) || 25));
    setTotalQuestions(validCount);
    setIsKeyConfigured(true);
  };

  const handleKeySelect = (question: number, answer: string) => {
    const prevAnswer = masterKey[question];
    if (prevAnswer !== answer) {
      fetch('/api/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question,
          source: 'master_key',
          aiDetected: prevAnswer || null,
          teacherCorrected: answer,
          notes: prevAnswer
            ? `Educator corrected Master Key Q${question} from ${prevAnswer} to ${answer}`
            : `Educator filled missing Master Key Q${question} as ${answer}`
        })
      }).catch(err => console.error("Failed to log master key correction:", err));
    }

    setMasterKey(prev => ({ ...prev, [question]: answer }));
    // Clear any low-confidence flag once manually touched
    setKeyConfidences(prev => {
      const next = { ...prev };
      delete next[question];
      return next;
    });
  };

  const handleQuickFill = (answer: string) => {
    const newKey: Record<number, string> = {};
    for (let i = 1; i <= totalQuestions; i++) {
      newKey[i] = answer;
    }
    setMasterKey(newKey);
  };

  const handleClearKey = () => {
    setMasterKey({});
    setKeyConfidences({});
    setMasterKeyImage(null);
    setMasterKeyFileName(null);
    setExtractionNotice(null);
    setApprovedKeySummary(null);
  };

  const configuredCount = Object.keys(masterKey).filter(
    (k) => Number(k) >= 1 && Number(k) <= totalQuestions && masterKey[Number(k)]
  ).length;

  const confidenceValues = Object.entries(keyConfidences)
    .filter(([q]) => Number(q) <= totalQuestions)
    .map(([, conf]) => conf);

  const avgConfidence = confidenceValues.length > 0
    ? Math.round(confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length)
    : null;

  const lowConfidenceCount = Object.entries(keyConfidences).filter(
    ([qNum, conf]) => Number(qNum) <= totalQuestions && conf < 80
  ).length;

  /** Extract student ID from filename: "STU001.jpg" → "STU001" */
  const extractStudentId = (fileName: string): string => {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
  };

  /** Read a file as base64 data URL */
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle uploading and extracting from a master key sheet scan via Gemini (Dual-Agent)
  const handleMasterKeyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingKey(true);
    setExtractionNotice(null);
    setKeyConsensus(null);
    setApprovedKeySummary(null);

    try {
      const base64DataUrl = await readFileAsBase64(file);
      const base64Data = base64DataUrl.split(',')[1];
      const targetCount = Number(inputTotalQuestions) || totalQuestions || 25;

      const res = await fetch('/api/extract-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: file.type,
          totalQuestions: targetCount,
          optionsPerQuestion
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract answers from master sheet');
      }

      // Parse merged answers into key/confidences (used as preview before approval)
      const newKey: Record<number, string> = {};
      const confidences: Record<number, number> = {};
      let maxLetterCode = 64 + optionsPerQuestion;

      if (Array.isArray(data.answers)) {
        data.answers.forEach((item: any) => {
          const rawId = item.id !== undefined && item.id !== null ? String(item.id) : '';
          const qId = parseInt(rawId.replace(/\D/g, ''), 10);

          if (!isNaN(qId) && qId >= 1 && qId <= 100) {
            if (item.answer && typeof item.answer === 'string') {
              const letter = item.answer.trim().toUpperCase();
              if (letter && letter !== 'NULL' && letter !== 'NONE' && letter !== 'BLANK') {
                newKey[qId] = letter;
                if (letter.length === 1 && letter.charCodeAt(0) > maxLetterCode) {
                  maxLetterCode = Math.min(72, letter.charCodeAt(0));
                }
              }
            }
            if (typeof item.confidence === 'number') {
              confidences[qId] = item.confidence;
            }
          }
        });
      }

      const detectedCount = data.detectedTotalQuestions || targetCount;
      const detectedOptions = Math.max(optionsPerQuestion, maxLetterCode - 64);

      setTotalQuestions(detectedCount);
      setInputTotalQuestions(detectedCount);
      setOptionsPerQuestion(detectedOptions);
      setMasterKey(newKey);
      setKeyConfidences(confidences);
      setMasterKeyImage(base64DataUrl);
      setMasterKeyFileName(file.name);
      setIsKeyConfigured(true);

      // If dual-agent data is present, show consensus review
      if (data.dualAgent && data.consensus) {
        setKeyConsensus(data.consensus);
        setKeySummary(data.summary);
        setApprovedKeySummary(data.summary);
        setKeyAgentA(data.agentA);
        setKeyAgentB(data.agentB);
        setKeySingleFallback(data.singleAgentFallback || false);
        setKeyImageHash(data.imageHash || null);
        setExtractionNotice(
          `Dual-agent extraction complete (${data.summary.agreementRate}% agreement). Review consensus below before using the key.`
        );
      } else {
        // Cache hit or non-dual-agent response
        const extractedAnswersCount = Object.keys(newKey).length;
        setExtractionNotice(`AI extracted ${extractedAnswersCount} answers from "${file.name}". Click "View Key" to inspect.`);
      }
    } catch (err: any) {
      console.error("Master key extraction error:", err);
      alert(err.message || "Error extracting master key. Please check your network and Gemini API key.");
    } finally {
      setIsExtractingKey(false);
      if (e.target) e.target.value = '';
    }
  };

  // Handle teacher approval of dual-agent master key consensus
  const handleApproveKey = async (finalAnswers: Array<{ id: number; answer: string | null; confidence: number }>) => {
    setIsApprovingKey(true);
    try {
      // Apply approved answers to local state
      const approvedKey: Record<number, string> = {};
      const approvedConfidences: Record<number, number> = {};
      finalAnswers.forEach(a => {
        if (a.answer) {
          approvedKey[a.id] = a.answer;
        }
        approvedConfidences[a.id] = a.confidence;
      });

      setMasterKey(approvedKey);
      setKeyConfidences(approvedConfidences);

      // Persist to cache via the approval endpoint
      if (keyImageHash) {
        await fetch('/api/extract-key/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageHash: keyImageHash,
            totalQuestions,
            optionsPerQuestion,
            answers: finalAnswers,
          }),
        });
      }

      // Clear consensus review state
      setKeyConsensus(null);
      setKeySummary(null);
      setKeyAgentA(null);
      setKeyAgentB(null);
      setExtractionNotice(`Master key approved with ${Object.keys(approvedKey).length} answers. Ready for grading.`);
    } catch (err: any) {
      console.error("Error approving master key:", err);
      alert(err.message || "Failed to approve master key");
    } finally {
      setIsApprovingKey(false);
    }
  };

  // Handle teacher approval of dual-agent grading consensus (batch)
  const handleApproveGrades = async () => {
    if (!pendingGradeResults || pendingGradeResults.length === 0) return;
    setIsApprovingGrades(true);

    try {
      const students = pendingGradeResults.map(p => p.student);
      const batchId = pendingBatchId || crypto.randomUUID();
      const effectiveKey = pendingEffectiveKey || masterKey;

      // Save via approval endpoint
      await fetch('/api/grade/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          totalQuestions,
          masterKey: effectiveKey,
          threshold,
          students: students.map(s => ({
            studentId: s.studentId,
            fileName: s.fileName,
            score: s.score,
            results: s.results,
            gradedAt: s.gradedAt,
          })),
          submissionUpdates: pendingGradeResults
            .filter(p => p.submissionId)
            .map(p => ({
              submissionId: p.submissionId,
              score: p.student.score,
              results: p.student.results,
            })),
        }),
      });

      // Transition to moderation view
      setPendingGradeResults(null);
      onBatchComplete(students, effectiveKey, batchId);
    } catch (err: any) {
      console.error("Error approving grades:", err);
      alert(err.message || "Failed to approve grading results");
    } finally {
      setIsApprovingGrades(false);
    }
  };

  // Auto-fetch pending student submissions on mount
  useEffect(() => {
    fetchStudentSubmissions();
  }, []);

  const fetchStudentSubmissions = async () => {
    setIsLoadingSubmissions(true);
    try {
      const res = await fetch('/api/submissions?status=pending&limit=30');
      const data = await res.json();
      if (res.ok && Array.isArray(data.submissions)) {
        setFetchedSubmissions(data.submissions);
      }
    } catch (err) {
      console.error("Error fetching student submissions:", err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const toggleSubmissionSelection = (id: string) => {
    setSelectedSubmissionIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        if (prev.length >= 10) {
          alert("Maximum batch size is 10 documents. You can select up to 10 sheets per batch.");
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const handleSelectAllPending = () => {
    const pendingIds = fetchedSubmissions.slice(0, 10).map(s => s.id);
    setSelectedSubmissionIds(pendingIds);
  };

  const handleDeselectAllPending = () => {
    setSelectedSubmissionIds([]);
  };

  // Grade selected student uploads fetched from database
  const handleGradeFetchedSubmissions = async () => {
    if (selectedSubmissionIds.length === 0) {
      alert("Please select at least one student submission to grade.");
      return;
    }
    if (selectedSubmissionIds.length > 10) {
      alert("Maximum batch size is 10 documents.");
      return;
    }

    if (!isKeyConfigured) {
      handleInitializeKey();
    }

    const submissionsToGrade = fetchedSubmissions.filter(s => selectedSubmissionIds.includes(s.id));
    setIsGrading(true);
    setBatchProgress({ current: 0, total: submissionsToGrade.length });

    const effectiveKey = { ...masterKey };
    for (let i = 1; i <= totalQuestions; i++) {
      if (!effectiveKey[i]) {
        effectiveKey[i] = currentOptions[0] || "A";
      }
    }

    const batchId = crypto.randomUUID();
    const gradedStudents: any[] = [];

    for (let idx = 0; idx < submissionsToGrade.length; idx++) {
      const sub = submissionsToGrade[idx];
      setBatchProgress({ current: idx + 1, total: submissionsToGrade.length });

      try {
        const res = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: sub.imageBase64,
            mimeType: sub.mimeType || 'image/jpeg',
            masterKey: effectiveKey,
            totalQuestions,
            threshold,
            batchTotal: submissionsToGrade.length
          })
        });

        const data = await res.json();
        if (!res.ok || !data.jobId) {
          console.error(`Failed to enqueue grading for ${sub.studentName}:`, data.error);
          continue;
        }

        const jobId = data.jobId;
        let jobResult = null;

        let pollAttempts = 0;
        const maxPollAttempts = 120; // 3 minutes max (1.5s * 120)
        while (true) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          const statusRes = await fetch(`/api/job-status?jobId=${jobId}`);
          if (!statusRes.ok) {
            pollAttempts++;
            if (pollAttempts >= maxPollAttempts) throw new Error('Grading timed out');
            continue;
          }
          const statusData = await statusRes.json();

          if (statusData.state === 'completed') {
            jobResult = statusData.result;
            break;
          } else if (statusData.state === 'failed') {
            throw new Error(statusData.error || 'Job failed');
          }
          pollAttempts++;
          if (pollAttempts >= maxPollAttempts) throw new Error('Grading timed out');
        }

        const results: QuestionResult[] = jobResult.results;
        const correctCount = results.filter((r: any) => r.status === 'correct').length;
        const score = Math.round((correctCount / totalQuestions) * 100 * 100) / 100;

        // Collect for pending approval (NOT auto-saved to DB)
        gradedStudents.push({
          student: {
            studentId: sub.studentId || extractStudentId(sub.fileName),
            fileName: sub.fileName,
            imageBase64: `data:${sub.mimeType};base64,${sub.imageBase64}`,
            results,
            score,
            status: 'marked' as const,
            gradedAt: new Date().toISOString(),
          },
          consensus: jobResult.consensus || [],
          summary: jobResult.summary || { totalQuestions: 0, agreedCount: 0, disagreedCount: 0, partialCount: 0, agreementRate: 100, autoApprovable: true },
          agentA: jobResult.agentA || { model: 'unknown', label: 'Agent Alpha', success: true, durationMs: 0 },
          agentB: jobResult.agentB || { model: 'unknown', label: 'Agent Beta', success: true, durationMs: 0 },
          singleFallback: jobResult.singleAgentFallback || false,
          submissionId: sub.id,
        });
      } catch (err) {
        console.error(`Error grading student submission ${sub.studentName}:`, err);
      }
    }

    setIsGrading(false);
    setBatchProgress({ current: 0, total: 0 });

    if (gradedStudents.length > 0) {
      // Show pending approval instead of auto-completing
      setPendingGradeResults(gradedStudents);
      setPendingBatchId(batchId);
      setPendingEffectiveKey(effectiveKey);
    } else {
      alert("No student submissions were successfully graded. Please try again.");
    }
  };

  // Handle batch student exam papers upload & grading (manual file upload)
  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!isKeyConfigured) {
      handleInitializeKey();
    }

    // Hard limit: Max 10 documents per batch run
    const rawFiles = Array.from(files);
    if (rawFiles.length > 10) {
      alert("Notice: Batch processing is limited to a maximum of 10 documents per run. Only the first 10 sheets will be graded.");
    }
    const fileArray = rawFiles.slice(0, 10);

    setBatchFiles(fileArray);
    setIsGrading(true);
    setBatchProgress({ current: 0, total: fileArray.length });

    // Ensure master key has answers populated
    const effectiveKey = { ...masterKey };
    for (let i = 1; i <= totalQuestions; i++) {
      if (!effectiveKey[i]) {
        effectiveKey[i] = currentOptions[0] || "A";
      }
    }

    const batchId = crypto.randomUUID();
    const gradedStudents: any[] = [];

    for (let idx = 0; idx < fileArray.length; idx++) {
      const file = fileArray[idx];
      setBatchProgress({ current: idx + 1, total: fileArray.length });

      try {
        const base64DataUrl = await readFileAsBase64(file);
        const base64Data = base64DataUrl.split(',')[1];

        const res = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type,
            masterKey: effectiveKey,
            totalQuestions,
            threshold,
            batchTotal: fileArray.length
          })
        });

        const data = await res.json();

        if (!res.ok || !data.jobId) {
          console.error(`Failed to enqueue grading for ${file.name}:`, data.error);
          continue;
        }

        const jobId = data.jobId;
        let jobResult = null;

        // Poll for job completion
        let pollAttempts = 0;
        const maxPollAttempts = 120; // 3 minutes max (1.5s * 120)
        while (true) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          const statusRes = await fetch(`/api/job-status?jobId=${jobId}`);
          if (!statusRes.ok) {
            pollAttempts++;
            if (pollAttempts >= maxPollAttempts) throw new Error('Grading timed out');
            continue;
          }
          const statusData = await statusRes.json();

          if (statusData.state === 'completed') {
            jobResult = statusData.result;
            break;
          } else if (statusData.state === 'failed') {
            throw new Error(statusData.error || 'Job failed');
          }
          pollAttempts++;
          if (pollAttempts >= maxPollAttempts) throw new Error('Grading timed out');
        }

        const results: QuestionResult[] = jobResult.results;
        const correctCount = results.filter((r: any) => r.status === 'correct').length;
        const score = Math.round((correctCount / totalQuestions) * 100 * 100) / 100;

        // Collect for pending approval (NOT auto-saved to DB)
        gradedStudents.push({
          student: {
            studentId: extractStudentId(file.name),
            fileName: file.name,
            imageBase64: base64DataUrl,
            results,
            score,
            status: 'marked' as const,
            gradedAt: new Date().toISOString(),
          },
          consensus: jobResult.consensus || [],
          summary: jobResult.summary || { totalQuestions: 0, agreedCount: 0, disagreedCount: 0, partialCount: 0, agreementRate: 100, autoApprovable: true },
          agentA: jobResult.agentA || { model: 'unknown', label: 'Agent Alpha', success: true, durationMs: 0 },
          agentB: jobResult.agentB || { model: 'unknown', label: 'Agent Beta', success: true, durationMs: 0 },
          singleFallback: jobResult.singleAgentFallback || false,
        });
      } catch (err) {
        console.error(`Error grading ${file.name}:`, err);
      }
    }

    setIsGrading(false);
    setBatchProgress({ current: 0, total: 0 });
    setBatchFiles([]);

    if (gradedStudents.length > 0) {
      // Show pending approval instead of auto-completing
      setPendingGradeResults(gradedStudents);
      setPendingBatchId(batchId);
      setPendingEffectiveKey(effectiveKey);
    } else {
      alert("No files were successfully graded. Please check your uploads and try again.");
    }
  };

  return (
    <div suppressHydrationWarning className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hidden Master Sheet Upload Input */}
      <input
        type="file"
        ref={masterKeyFileInputRef}
        onChange={handleMasterKeyUpload}
        accept="image/png, image/jpeg, image/webp, application/pdf"
        className="hidden"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* Upload Zone */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-blue-600" />
              Batch Ingestion
            </h2>
          </div>

          {/* Master Key Extraction / Active Status Banner */}
          {isExtractingKey ? (
            <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-900">
                    Dual-Agent Scanning: Extracting Master Key with Gemini Vision...
                  </h4>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Two AI agents are independently extracting answers. Results will be compared for consensus.
                  </p>
                </div>
              </div>
            </div>
          ) : isKeyConfigured || configuredCount > 0 ? (
            <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">
                      Master Key Ready:
                    </span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {configuredCount} / {totalQuestions} Answers Marked
                    </span>
                    {avgConfidence !== null && (
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {avgConfidence}% AI Confidence
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {masterKeyFileName ? (
                      <>Source: <strong className="text-slate-700">{masterKeyFileName}</strong> • </>
                    ) : null}
                    Answer key is active and locked for batch grading. Click &ldquo;View Key&rdquo; to inspect or edit.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Key</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-900">
                  <strong>Notice:</strong> Master Answer Key is not loaded yet. Scan your master sheet on the right, or upload student sheets anytime.
                </p>
              </div>
              <button
                type="button"
                onClick={() => masterKeyFileInputRef.current?.click()}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan Key</span>
              </button>
            </div>
          )}
          {/* ─── Master Key Consensus Review Panel ──────────────── */}
          {keyConsensus && keySummary && keyAgentA && keyAgentB && (
            <ConsensusReview
              title="Master Key — Dual Agent Consensus"
              consensus={keyConsensus}
              summary={keySummary}
              agentA={keyAgentA}
              agentB={keyAgentB}
              singleAgentFallback={keySingleFallback}
              onApprove={handleApproveKey}
              isApproving={isApprovingKey}
              mode="key"
              onManualReview={() => {
                setKeyConsensus(null);
                setKeySummary(null);
                setShowKeyModal(true);
              }}
            />
          )}

          {/* ─── Pending Grading Approval Panel ─────────────────── */}
          {pendingGradeResults && pendingGradeResults.length > 0 && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {pendingGradeResults.length}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Grading Complete — Awaiting Your Approval
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {pendingGradeResults.length} student{pendingGradeResults.length !== 1 ? 's' : ''} graded by dual agents. Review consensus below, then approve to save.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPendingGradeResults(null)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleApproveGrades}
                    disabled={isApprovingGrades}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isApprovingGrades ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Approve All & Continue
                  </button>
                </div>
              </div>

              {pendingGradeResults.map((result, idx) => (
                <ConsensusReview
                  key={idx}
                  title={`${result.student.fileName} — Student Grading Consensus`}
                  consensus={result.consensus}
                  summary={result.summary}
                  agentA={result.agentA}
                  agentB={result.agentB}
                  singleAgentFallback={result.singleFallback}
                  onApprove={() => handleApproveGrades()}
                  isApproving={isApprovingGrades}
                  mode="grade"
                />
              ))}
            </div>
          )}

          {/* Ingestion Mode Selector */}
          <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setBatchSource('manual')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                batchSource === 'manual'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Manual Local Upload (Max 10)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBatchSource('fetched');
                fetchStudentSubmissions();
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                batchSource === 'fetched'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Fetch Student Uploads</span>
              {fetchedSubmissions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
                  {fetchedSubmissions.length} pending
                </span>
              )}
            </button>
          </div>

          {/* Mode 1: Manual File Upload */}
          {batchSource === 'manual' && (
            <div
              onClick={() => !isGrading && fileInputRef.current?.click()}
              className={`border border-slate-200 rounded-xl bg-slate-50 p-12 text-center hover:bg-white hover:border-blue-300 transition-colors cursor-pointer group flex flex-col items-center justify-center ${isGrading ? 'opacity-75 pointer-events-none' : ''}`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleBatchUpload}
                accept="image/png, image/jpeg, application/pdf"
                className="hidden"
                multiple
              />
              {isGrading ? (
                <>
                  <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center mb-4">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    GRADING STUDENT {batchProgress.current} OF {batchProgress.total}...
                  </h3>
                  <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                    Running Vision-Language Model inference on each answer sheet
                  </p>
                  {/* Progress Bar */}
                  <div className="w-full max-w-xs mx-auto">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                      <span>{batchProgress.current} / {batchProgress.total}</span>
                      <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                      />
                    </div>
                    {batchFiles[batchProgress.current - 1] && (
                      <p className="text-[10px] text-slate-400 mt-2 truncate">
                        Current: {batchFiles[batchProgress.current - 1].name}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileType className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">UPLOAD STUDENT ANSWER SHEETS</h3>
                  <p className="text-xs text-slate-500 mb-2 max-w-sm mx-auto">
                    Select scanned student answer sheets (JPG, PNG). Each file name becomes the Student ID.
                  </p>
                  <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-100 mb-4">
                    <Users className="w-3 h-3" />
                    Batch Limit: Up to 10 sheets per run
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors">
                    Browse Local Files (Max 10)
                  </button>
                </>
              )}
            </div>
          )}

          {/* Mode 2: Fetch Student Uploads From Database */}
          {batchSource === 'fetched' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Student Submissions Ingestion</h3>
                    <p className="text-xs text-slate-500">Select pending student sheets submitted via the student portal (Max 10).</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchStudentSubmissions}
                    disabled={isLoadingSubmissions}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Refresh student uploads"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingSubmissions ? 'animate-spin text-blue-600' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectAllPending}
                    disabled={fetchedSubmissions.length === 0 || isGrading}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Select All (Up to 10)
                  </button>

                  {selectedSubmissionIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectAllPending}
                      disabled={isGrading}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              {/* Selection Counter Bar */}
              <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Selected for Batch Grading:</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    selectedSubmissionIds.length > 0
                      ? 'bg-blue-100 text-blue-800 font-mono'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {selectedSubmissionIds.length} / 10 Max
                  </span>
                </div>
                {selectedSubmissionIds.length === 10 && (
                  <span className="text-amber-600 font-medium text-[11px]">Maximum batch limit reached</span>
                )}
              </div>

              {/* Submissions List */}
              {isLoadingSubmissions ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  Loading pending student submissions...
                </div>
              ) : fetchedSubmissions.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                  <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-700">No pending student uploads found</p>
                  <p className="text-slate-400 max-w-sm mx-auto">
                    Students can submit their scanned answer sheets through the Student Portal. Once submitted, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {fetchedSubmissions.map((sub) => {
                    const isSelected = selectedSubmissionIds.includes(sub.id);
                    return (
                      <div
                        key={sub.id}
                        onClick={() => !isGrading && toggleSubmissionSelection(sub.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/20 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        } ${isGrading ? 'pointer-events-none opacity-60' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            className="text-blue-600 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isGrading) toggleSubmissionSelection(sub.id);
                            }}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>

                          {/* Thumbnail preview */}
                          <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                            <img
                              src={`data:${sub.mimeType};base64,${sub.imageBase64}`}
                              alt="Thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {sub.studentName}
                              </span>
                              <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                                {sub.studentId}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{sub.assignmentTitle}</span>
                              <span>•</span>
                              <span>{new Date(sub.createdAt).toLocaleDateString()} {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                          Pending
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Grade Button or Progress */}
              {isGrading ? (
                <div className="pt-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Grading Student {batchProgress.current} of {batchProgress.total}...</span>
                    <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGradeFetchedSubmissions}
                  disabled={selectedSubmissionIds.length === 0}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-blue-600/10 flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Grade Selected Student Uploads ({selectedSubmissionIds.length} / 10)
                </button>
              )}
            </div>
          )}

          {/* Confidence Slider */}
          <div className="pt-6">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              AI Confidence Threshold
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 uppercase">Strictness Level</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Flag answers below this confidence for manual review.</p>
                </div>
                <div className="text-2xl font-bold text-blue-600">{threshold}%</div>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">
                <span>More manual review</span>
                <span>Fully automated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Master Key Panel: Progressive Setup & AI Extraction */}
        <div suppressHydrationWarning className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Master Answer Key
            </h2>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${isKeyConfigured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
              {isKeyConfigured ? 'Ready' : 'Setup Required'}
            </span>
          </div>

          {/* AI Extraction Loading State */}
          {isExtractingKey ? (
            <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center mx-auto">
                <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-100/70 text-blue-800 text-[10px] font-bold rounded-full mb-2 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Gemini 2.5 Flash Vision
                </div>
                <h3 className="text-sm font-bold text-slate-900">Scanning Master Sheet...</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Detecting question numbers, bubbled answers, and confidence ratings.
                </p>
              </div>
            </div>
          ) : !isKeyConfigured ? (
            /* STEP 1: Key Configuration & AI Extraction Options */
            <div
              suppressHydrationWarning
              data-protonpass-ignore="true"
              className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <ListOrdered className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Define MCQ Structure</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure question count, or scan an answer sheet to extract keys automatically.
                  </p>
                </div>
              </div>

              {/* Input 1: Total MCQs */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  1. Total MCQs
                </label>
                <div className="flex items-center gap-2">
                  <input
                    suppressHydrationWarning
                    data-protonpass-ignore="true"
                    type="number"
                    min="1"
                    max="100"
                    value={inputTotalQuestions}
                    onChange={(e) => setInputTotalQuestions(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="text-xs text-slate-400">questions</span>
                </div>

                {/* Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Presets:</span>
                  {questionPresets.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setInputTotalQuestions(count)}
                      className={`px-2 py-0.5 text-xs font-semibold rounded border transition-colors ${inputTotalQuestions === count
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input 2: Answers / Options per question */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  2. Options per Question
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {optionPresets.map((preset) => {
                    const isSelected = optionsPerQuestion === preset.count;
                    return (
                      <button
                        key={preset.count}
                        type="button"
                        onClick={() => setOptionsPerQuestion(preset.count)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${isSelected
                            ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                            {preset.label}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">({preset.range})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: AI Scan vs Manual Init */}
              <div className="space-y-3 pt-2">
                {/* AI Master Sheet Scan Button */}
                <button
                  type="button"
                  onClick={() => masterKeyFileInputRef.current?.click()}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-blue-200 group-hover:scale-110 transition-transform" />
                  <span>Scan & Auto-Extract Key</span>
                  <Camera className="w-3.5 h-3.5 text-blue-200 ml-1" />
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">or manually input</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Manual Initialization Button */}
                <button
                  type="button"
                  onClick={handleInitializeKey}
                  className="w-full py-2 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span>Initialize Empty Grid</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  ✨ <strong>AI Vision OCR:</strong> Upload a scanned master copy (JPG, PNG, PDF) and Gemini will automatically detect and populate the answer key.
                </p>
              </div>
            </div>
          ) : (
            /* STEP 2: Configured Master Key Card */
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">

              {/* Header with configured summary and View Key / Rescan / Edit options */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{totalQuestions} MCQs</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                      {currentOptions[0]} – {currentOptions[currentOptions.length - 1]}
                    </span>
                    {avgConfidence !== null && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                        {avgConfidence}% AI
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[180px]">
                    {masterKeyFileName || `${configuredCount} of ${totalQuestions} answers marked`}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs cursor-pointer"
                    title="View and inspect all extracted answers in detail"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Key</span>
                  </button>
                  <button
                    onClick={() => masterKeyFileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
                    title="Upload another master answer sheet scan"
                  >
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Scan</span>
                  </button>
                  <button
                    onClick={() => setIsKeyConfigured(false)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors cursor-pointer"
                    title="Modify question count or options"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>

              {/* AI Extraction Success Notification Banner */}
              {extractionNotice && (
                <div className="px-3.5 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center gap-1.5 min-w-0 mr-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium text-[11px] truncate">{extractionNotice}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowKeyModal(true)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-0.5"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => setExtractionNotice(null)}
                      className="text-emerald-600 hover:text-emerald-900 p-0.5 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Answer Preview Strip */}
              <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Keys:</span>
                  {Array.from({ length: Math.min(6, totalQuestions) }, (_, i) => i + 1).map((qNum) => {
                    const ans = masterKey[qNum];
                    return (
                      <span
                        key={qNum}
                        className={`shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${ans
                            ? 'bg-white text-slate-800 border border-slate-200 shadow-2xs'
                            : 'bg-slate-200/50 text-slate-400'
                          }`}
                      >
                        <span className="text-[9px] text-slate-400">Q{qNum}:</span>
                        <span>{ans || '-'}</span>
                      </span>
                    );
                  })}
                  {totalQuestions > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowKeyModal(true)}
                      className="shrink-0 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline ml-1"
                    >
                      +{totalQuestions - 6} more...
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowInlineGrid(!showInlineGrid)}
                  className="shrink-0 text-slate-500 hover:text-slate-700 text-[11px] font-medium flex items-center gap-0.5 ml-2 cursor-pointer"
                  title={showInlineGrid ? "Collapse inline list" : "Expand inline list"}
                >
                  <span>{showInlineGrid ? "Hide" : "Expand"}</span>
                  {showInlineGrid ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Collapsible Inline Grid */}
              {showInlineGrid && (
                <>
                  {/* Quick Action Toolbar */}
                  <div className="px-4 py-2 border-b border-slate-100 bg-white flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-semibold uppercase text-[10px]">Quick Fill:</span>
                      {currentOptions.slice(0, 2).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleQuickFill(opt)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded transition-colors"
                        >
                          All {opt}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleClearKey}
                      className="text-slate-400 hover:text-red-600 font-medium transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* Scrollable Questions List */}
                  <div className="p-4 max-h-[360px] overflow-y-auto space-y-2.5 divide-y divide-slate-100">
                    {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNum) => {
                      const selectedAnswer = masterKey[qNum];
                      const confidence = keyConfidences[qNum];
                      const isLowConfidence = typeof confidence === 'number' && confidence < 80;

                      return (
                        <div key={qNum} className="flex items-center justify-between pt-2.5 first:pt-0">
                          <div className="flex items-center gap-2">
                            <span className="w-8 text-xs font-bold text-slate-600">Q{qNum}</span>
                            {selectedAnswer ? (
                              isLowConfidence ? (
                                <span
                                  className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 flex items-center gap-0.5"
                                  title={`Low AI confidence (${confidence}%). Please double-check.`}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                                  {confidence}%
                                </span>
                              ) : (
                                <span
                                  className="w-2 h-2 rounded-full bg-emerald-500"
                                  title={confidence ? `High confidence (${confidence}%)` : "Answer set"}
                                />
                              )
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-200" title="Unset" />
                            )}
                          </div>
                          <div className="flex gap-1">
                            {currentOptions.map((opt) => {
                              const isSelected = selectedAnswer === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handleKeySelect(qNum, opt)}
                                  className={`w-7 h-7 rounded text-xs font-bold transition-all border ${isSelected
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                      : 'bg-white text-slate-600 hover:bg-slate-100 hover:border-slate-300 border-slate-200'
                                    }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Key active ({configuredCount}/{totalQuestions})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded text-xs hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Key</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Master Key Inspector Modal */}
      <MasterKeyModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        totalQuestions={totalQuestions}
        masterKey={masterKey}
        keyConfidences={keyConfidences}
        onKeySelect={handleKeySelect}
        onQuickFill={handleQuickFill}
        onClearKey={handleClearKey}
        optionsPerQuestion={optionsPerQuestion}
        currentOptions={currentOptions}
        masterKeyFileName={masterKeyFileName}
        masterKeyImage={masterKeyImage}
        onRescanClick={() => {
          setShowKeyModal(false);
          masterKeyFileInputRef.current?.click();
        }}
        consensusSummary={approvedKeySummary || keySummary}
      />
    </div>
  );
}
