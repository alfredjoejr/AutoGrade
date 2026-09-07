/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  X, 
  Eye, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Columns2, 
  Grid, 
  FileText, 
  RotateCcw,
  Check,
  Camera,
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";

interface MasterKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalQuestions: number;
  masterKey: Record<number, string>;
  keyConfidences: Record<number, number>;
  onKeySelect: (question: number, answer: string) => void;
  onQuickFill: (answer: string) => void;
  onClearKey: () => void;
  optionsPerQuestion: number;
  currentOptions: string[];
  masterKeyFileName: string | null;
  masterKeyImage: string | null;
  onRescanClick: () => void;
}

export function MasterKeyModal({
  isOpen,
  onClose,
  totalQuestions,
  masterKey,
  keyConfidences,
  onKeySelect,
  onQuickFill,
  onClearKey,
  currentOptions,
  masterKeyFileName,
  masterKeyImage,
  onRescanClick
}: MasterKeyModalProps) {
  const [activeTab, setActiveTab] = useState<'grid' | 'split' | 'sheet'>('grid');
  const [filterMode, setFilterMode] = useState<'all' | 'flagged' | 'unset'>('all');
  const [imageZoom, setImageZoom] = useState<number>(100);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Derived statistics
  const configuredCount = useMemo(() => {
    return Object.keys(masterKey).filter(
      (k) => Number(k) >= 1 && Number(k) <= totalQuestions && masterKey[Number(k)]
    ).length;
  }, [masterKey, totalQuestions]);

  const confidenceStats = useMemo(() => {
    const values = Object.entries(keyConfidences)
      .filter(([q]) => Number(q) <= totalQuestions)
      .map(([, conf]) => conf);

    if (values.length === 0) return { avg: null, lowCount: 0 };

    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const lowCount = values.filter((v) => v < 80).length;
    return { avg, lowCount };
  }, [keyConfidences, totalQuestions]);

  const unsetCount = totalQuestions - configuredCount;

  // Distribution of answers (A: 5, B: 7, etc.)
  const distribution = useMemo(() => {
    const counts: Record<string, number> = {};
    currentOptions.forEach((opt) => (counts[opt] = 0));
    for (let i = 1; i <= totalQuestions; i++) {
      const ans = masterKey[i];
      if (ans && counts[ans] !== undefined) {
        counts[ans] = (counts[ans] || 0) + 1;
      }
    }
    return counts;
  }, [masterKey, totalQuestions, currentOptions]);

  // Questions to display based on filter
  const displayedQuestions = useMemo(() => {
    const list = Array.from({ length: totalQuestions }, (_, i) => i + 1);
    if (filterMode === 'flagged') {
      return list.filter((qNum) => {
        const conf = keyConfidences[qNum];
        return typeof conf === 'number' && conf < 80;
      });
    }
    if (filterMode === 'unset') {
      return list.filter((qNum) => !masterKey[qNum]);
    }
    return list;
  }, [totalQuestions, filterMode, keyConfidences, masterKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Master Answer Key Inspector
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {configuredCount} / {totalQuestions} Marked
                </span>
                {confidenceStats.avg !== null && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {confidenceStats.avg}% AI Confidence
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>Total {totalQuestions} questions ({currentOptions[0]}–{currentOptions[currentOptions.length - 1]})</span>
                {masterKeyFileName && (
                  <>
                    <span>•</span>
                    <span className="text-slate-700 font-medium truncate max-w-xs">
                      Extracted from: {masterKeyFileName}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRescanClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
              title="Upload another scanned master sheet"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Rescan Sheet</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Filter Toolbar */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* View Mode Tabs (only if image exists) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('grid')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'grid'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Answer Grid</span>
            </button>

            {masterKeyImage && (
              <>
                <button
                  onClick={() => setActiveTab('split')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'split'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span>Split View</span>
                </button>

                <button
                  onClick={() => setActiveTab('sheet')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'sheet'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Scanned Sheet</span>
                </button>
              </>
            )}
          </div>

          {/* Filters & Quick Fill */}
          <div className="flex items-center gap-3">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 font-semibold uppercase text-[10px] mr-1">Filter:</span>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  filterMode === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All ({totalQuestions})
              </button>
              {confidenceStats.lowCount > 0 && (
                <button
                  onClick={() => setFilterMode('flagged')}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    filterMode === 'flagged'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Needs Review ({confidenceStats.lowCount})
                </button>
              )}
              {unsetCount > 0 && (
                <button
                  onClick={() => setFilterMode('unset')}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    filterMode === 'unset'
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                  }`}
                >
                  Unset ({unsetCount})
                </button>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* Quick Fill dropdown/buttons */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Fill:</span>
              {currentOptions.slice(0, 4).map((opt) => (
                <button
                  key={opt}
                  onClick={() => onQuickFill(opt)}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
                  title={`Set all ${totalQuestions} questions to option ${opt}`}
                >
                  All {opt}
                </button>
              ))}
              <button
                onClick={onClearKey}
                className="px-1.5 py-0.5 text-slate-400 hover:text-red-600 text-[11px] font-medium transition-colors ml-1"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* TAB 1: Grid View */}
          {activeTab === 'grid' && (
            <div className="space-y-4">
              {displayedQuestions.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No questions match the current filter.</p>
                  <button
                    onClick={() => setFilterMode('all')}
                    className="mt-2 text-xs text-blue-600 hover:underline font-semibold"
                  >
                    View all questions
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {displayedQuestions.map((qNum) => {
                    const selected = masterKey[qNum];
                    const conf = keyConfidences[qNum];
                    const isLowConf = typeof conf === 'number' && conf < 80;

                    return (
                      <div
                        key={qNum}
                        className={`bg-white border rounded-xl p-3 shadow-xs transition-all ${
                          isLowConf 
                            ? 'border-amber-300 ring-1 ring-amber-300/40' 
                            : selected 
                              ? 'border-slate-200 hover:border-slate-300' 
                              : 'border-dashed border-slate-300 bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-800">
                            Q{qNum}
                          </span>
                          {selected ? (
                            isLowConf ? (
                              <span 
                                className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200"
                                title={`Low AI Confidence (${conf}%). Verify answer choice.`}
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                                {conf}%
                              </span>
                            ) : (
                              <span 
                                className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200"
                                title={conf ? `AI Confidence: ${conf}%` : "Answer marked"}
                              >
                                {conf ? `${conf}%` : "Set"}
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400">
                              Unset
                            </span>
                          )}
                        </div>

                        {/* Option buttons */}
                        <div className="grid grid-cols-4 gap-1">
                          {currentOptions.map((opt) => {
                            const isChosen = selected === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => onKeySelect(qNum, opt)}
                                className={`h-8 rounded text-xs font-bold transition-all ${
                                  isChosen
                                    ? 'bg-blue-600 text-white shadow-xs scale-102 ring-2 ring-blue-500/30'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'
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
              )}
            </div>
          )}

          {/* TAB 2: Split View (Sheet on Left, Answers on Right) */}
          {activeTab === 'split' && masterKeyImage && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-[500px]">
              {/* Left Side: Scanned Master Sheet */}
              <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700 flex flex-col">
                <div className="px-3 py-2 bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span className="truncate max-w-[200px]">{masterKeyFileName || "Uploaded Master Sheet"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setImageZoom((prev) => Math.max(50, prev - 25))}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-slate-400 px-1">{imageZoom}%</span>
                    <button
                      onClick={() => setImageZoom((prev) => Math.min(200, prev + 25))}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setImageZoom(100)}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950">
                  <img
                    src={masterKeyImage}
                    alt="Scanned Master Answer Sheet"
                    style={{ width: `${imageZoom}%`, transition: 'width 0.15s ease' }}
                    className="max-w-none object-contain rounded shadow-lg"
                  />
                </div>
              </div>

              {/* Right Side: Scrollable Questions */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Extracted Questions
                  </span>
                  <span className="text-xs text-slate-500">
                    Click any option to edit
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-100">
                  {displayedQuestions.map((qNum) => {
                    const selected = masterKey[qNum];
                    const conf = keyConfidences[qNum];
                    const isLowConf = typeof conf === 'number' && conf < 80;

                    return (
                      <div key={qNum} className="flex items-center justify-between pt-2 first:pt-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 w-8">
                            Q{qNum}
                          </span>
                          {isLowConf && (
                            <span 
                              className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200"
                              title={`Low confidence (${conf}%)`}
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                              {conf}%
                            </span>
                          )}
                          {!isLowConf && conf && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={`Confidence: ${conf}%`} />
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {currentOptions.map((opt) => {
                            const isChosen = selected === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => onKeySelect(qNum, opt)}
                                className={`w-8 h-8 rounded text-xs font-bold transition-all ${
                                  isChosen
                                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/20'
                                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
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
              </div>
            </div>
          )}

          {/* TAB 3: Full Scanned Sheet Preview */}
          {activeTab === 'sheet' && masterKeyImage && (
            <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700 flex flex-col h-full min-h-[500px]">
              <div className="px-4 py-2.5 bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-between border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>{masterKeyFileName || "Scanned Master Copy"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setImageZoom((prev) => Math.max(50, prev - 25))}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-400">{imageZoom}%</span>
                  <button
                    onClick={() => setImageZoom((prev) => Math.min(250, prev + 25))}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setImageZoom(100)}
                    className="px-2 py-0.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-950">
                <img
                  src={masterKeyImage}
                  alt="Scanned Master Copy"
                  style={{ width: `${imageZoom}%`, transition: 'width 0.15s ease' }}
                  className="max-w-none object-contain rounded-lg shadow-2xl"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
          {/* Answer Distribution */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-semibold uppercase text-[10px] text-slate-400">Distribution:</span>
            {currentOptions.map((opt) => (
              <span key={opt} className="inline-flex items-center gap-1 font-mono">
                <strong className="text-slate-800">{opt}:</strong> {distribution[opt] || 0}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm & Apply Key</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
