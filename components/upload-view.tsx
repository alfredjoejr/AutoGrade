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
  X
} from "lucide-react";
import { useState, useRef } from "react";

export function UploadView({ 
  totalQuestions, 
  setTotalQuestions,
  onGradeComplete
}: { 
  totalQuestions: number, 
  setTotalQuestions: (n: number) => void,
  onGradeComplete: (results: any[], image: string) => void 
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
    setExtractionNotice(null);
  };

  const configuredCount = Object.keys(masterKey).filter(
    (k) => Number(k) >= 1 && Number(k) <= totalQuestions && masterKey[Number(k)]
  ).length;

  // Handle uploading and extracting from a master key sheet scan via Gemini
  const handleMasterKeyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingKey(true);
    setExtractionNotice(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64DataUrl = reader.result as string;
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

        const newKey: Record<number, string> = {};
        const confidences: Record<number, number> = {};
        if (Array.isArray(data.answers)) {
          data.answers.forEach((item: any) => {
            if (item.id && item.answer) {
              newKey[item.id] = String(item.answer).toUpperCase();
              if (typeof item.confidence === 'number') {
                confidences[item.id] = item.confidence;
              }
            }
          });
        }

        const detectedCount = data.detectedTotalQuestions || targetCount;
        setTotalQuestions(detectedCount);
        setInputTotalQuestions(detectedCount);
        setMasterKey(newKey);
        setKeyConfidences(confidences);
        setIsKeyConfigured(true);

        const extractedAnswersCount = Object.keys(newKey).length;
        setExtractionNotice(`AI extracted ${extractedAnswersCount} answers from the master sheet. Please review below.`);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error extracting master key. Please check your network and Gemini API key.");
    } finally {
      setIsExtractingKey(false);
      if (e.target) e.target.value = '';
    }
  };

  // Handle student exam papers upload & grading
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isKeyConfigured) {
      handleInitializeKey();
    }

    setIsGrading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64DataUrl = reader.result as string;
        const base64Data = base64DataUrl.split(',')[1];

        // Ensure master key has answers populated
        const effectiveKey = { ...masterKey };
        for (let i = 1; i <= totalQuestions; i++) {
          if (!effectiveKey[i]) {
            effectiveKey[i] = currentOptions[0] || "A";
          }
        }

        const res = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type,
            masterKey: effectiveKey,
            totalQuestions,
            threshold
          })
        });

        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to grade paper');
        }

        onGradeComplete(data.results, base64DataUrl);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert("Error grading paper. Please try again.");
    } finally {
      setIsGrading(false);
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
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
            <UploadCloud className="w-4 h-4 text-blue-600" />
            Batch Ingestion
          </h2>
          <div 
            onClick={() => !isGrading && fileInputRef.current?.click()}
            className={`border border-slate-200 rounded-xl bg-slate-50 p-12 text-center hover:bg-white hover:border-blue-300 transition-colors cursor-pointer group flex flex-col items-center justify-center ${isGrading ? 'opacity-75 pointer-events-none' : ''}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/png, image/jpeg, application/pdf" 
              className="hidden" 
            />
            {isGrading ? (
              <>
                <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center mb-4">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">ANALYZING DOCUMENT...</h3>
                <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">Running Vision-Language Model inference</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileType className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">DRAG AND DROP SCANNED SHEETS</h3>
                <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">Upload PDF or image batches (JPG, PNG). We recommend 300 DPI scans for best AI accuracy.</p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors">
                  Browse Files
                </button>
              </>
            )}
          </div>

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
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
              isKeyConfigured 
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
                      className={`px-2 py-0.5 text-xs font-semibold rounded border transition-colors ${
                        inputTotalQuestions === count
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
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
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
            /* STEP 2: Expanded Answer Key Grid */
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[640px]">
              
              {/* Header with configured summary and Reconfigure / Rescan options */}
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{totalQuestions} MCQs</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                      {currentOptions[0]} – {currentOptions[currentOptions.length - 1]}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {configuredCount} of {totalQuestions} answers marked
                  </p>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => masterKeyFileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                    title="Upload another master answer sheet scan"
                  >
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Scan</span>
                  </button>
                  <button
                    onClick={() => setIsKeyConfigured(false)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors"
                    title="Modify question count or options"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>

              {/* AI Extraction Success Notification Banner */}
              {extractionNotice && (
                <div className="px-3.5 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium text-[11px]">{extractionNotice}</span>
                  </div>
                  <button 
                    onClick={() => setExtractionNotice(null)}
                    className="text-emerald-600 hover:text-emerald-900 p-0.5 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

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
              <div className="p-4 flex-1 overflow-y-auto space-y-2.5 divide-y divide-slate-100">
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
                              className={`w-7 h-7 rounded text-xs font-bold transition-all border ${
                                isSelected
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

              {/* Footer */}
              <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Key synced & active</span>
                </div>
                <button 
                  onClick={() => alert("Master Key confirmed and ready for grading.")}
                  className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded text-xs hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Confirm Key
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


