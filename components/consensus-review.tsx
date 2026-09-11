import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Zap,
  Eye,
  ChevronDown,
  ChevronUp,
  Bot,
  Check,
  Pencil,
  ArrowRight,
  Info,
  Loader2,
} from "lucide-react";
import { useState, useMemo } from "react";

export type ConsensusStatus = 'agreed' | 'disagreed' | 'partial';

export interface ConsensusItem {
  questionId: number;
  agentAAnswer: string | null;
  agentAConfidence: number;
  agentBAnswer: string | null;
  agentBConfidence: number;
  consensusStatus: ConsensusStatus;
  recommendedAnswer: string | null;
  avgConfidence: number;
}

export interface AgentInfo {
  model: string;
  label: string;
  success: boolean;
  error?: string;
  durationMs: number;
}

export interface ConsensusSummary {
  totalQuestions: number;
  agreedCount: number;
  disagreedCount: number;
  partialCount: number;
  agreementRate: number;
  autoApprovable: boolean;
}

interface ConsensusReviewProps {
  title: string;
  consensus: ConsensusItem[];
  summary: ConsensusSummary;
  agentA: AgentInfo;
  agentB: AgentInfo;
  singleAgentFallback: boolean;
  /** Called when teacher approves — returns the final answers with any overrides */
  onApprove: (finalAnswers: Array<{ id: number; answer: string | null; confidence: number }>) => void;
  /** Called when teacher requests manual review */
  onManualReview?: () => void;
  /** Loading state for the approve action */
  isApproving?: boolean;
  /** Mode: 'key' for master key extraction, 'grade' for student grading */
  mode?: 'key' | 'grade';
}

export function ConsensusReview({
  title,
  consensus,
  summary,
  agentA,
  agentB,
  singleAgentFallback,
  onApprove,
  onManualReview,
  isApproving = false,
  mode = 'key',
}: ConsensusReviewProps) {
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<'all' | 'agreed' | 'disagreed' | 'partial'>('all');
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);

  const filteredItems = useMemo(() => {
    const items = filter === 'all' ? consensus : consensus.filter(c => c.consensusStatus === filter);
    return showAll ? items : items.slice(0, 15);
  }, [consensus, filter, showAll]);

  const hasOverrides = Object.keys(overrides).length > 0;

  const handleApprove = () => {
    const finalAnswers = consensus.map(c => ({
      id: c.questionId,
      answer: overrides[c.questionId]
        ? overrides[c.questionId].toUpperCase()
        : c.recommendedAnswer,
      confidence: overrides[c.questionId] ? 100 : c.avgConfidence,
    }));
    onApprove(finalAnswers);
  };

  const statusIcon = (status: ConsensusStatus) => {
    switch (status) {
      case 'agreed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'partial': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'disagreed': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const statusColor = (status: ConsensusStatus) => {
    switch (status) {
      case 'agreed': return 'bg-emerald-50 border-emerald-200';
      case 'partial': return 'bg-amber-50 border-amber-200';
      case 'disagreed': return 'bg-red-50 border-red-200';
    }
  };

  const agreementColor = summary.agreementRate >= 95
    ? 'text-emerald-600'
    : summary.agreementRate >= 80
    ? 'text-amber-600'
    : 'text-red-600';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dual-agent consensus review — approve or override before saving
              </p>
            </div>
          </div>
          <div className={`text-2xl font-black ${agreementColor}`}>
            {summary.agreementRate}%
            <span className="text-xs font-medium text-slate-400 ml-1">agree</span>
          </div>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-2 gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
        {[agentA, agentB].map((agent, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              agent.success
                ? 'bg-white border-slate-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
              idx === 0
                ? 'bg-blue-100 text-blue-700'
                : 'bg-violet-100 text-violet-700'
            }`}>
              {idx === 0 ? 'α' : 'β'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">{agent.label}</div>
              <div className="text-[10px] text-slate-400 font-mono">{agent.model}</div>
            </div>
            <div className="text-right">
              {agent.success ? (
                <>
                  <div className="text-[10px] font-bold text-emerald-600">✓ OK</div>
                  <div className="text-[10px] text-slate-400">{(agent.durationMs / 1000).toFixed(1)}s</div>
                </>
              ) : (
                <div className="text-[10px] font-bold text-red-500">✗ Failed</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Single Agent Fallback Warning */}
      {singleAgentFallback && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-amber-800">Single Agent Fallback</div>
            <div className="text-[11px] text-amber-700 mt-0.5">
              One agent failed — results are from a single model only. Extra scrutiny recommended.
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2 p-4 border-b border-slate-100">
        {[
          { label: 'Total', value: summary.totalQuestions, color: 'text-slate-700' },
          { label: 'Agreed', value: summary.agreedCount, color: 'text-emerald-600' },
          { label: 'Partial', value: summary.partialCount, color: 'text-amber-600' },
          { label: 'Conflict', value: summary.disagreedCount, color: 'text-red-600' },
        ].map(stat => (
          <div key={stat.label} className="text-center">
            <div className={`text-lg font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-2">
        {(['all', 'agreed', 'disagreed', 'partial'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
              filter === f
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && (
              <span className="ml-1 opacity-70">
                ({f === 'agreed' ? summary.agreedCount : f === 'disagreed' ? summary.disagreedCount : summary.partialCount})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="px-4 pb-3">
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold">
                <th className="px-3 py-2 text-left w-12">Q#</th>
                <th className="px-3 py-2 text-center">Agent α</th>
                <th className="px-3 py-2 text-center">Agent β</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-center">{mode === 'key' ? 'Final Answer' : 'Detected'}</th>
                <th className="px-3 py-2 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isEditing = editingQuestion === item.questionId;
                const hasOverride = overrides[item.questionId] !== undefined;
                const displayAnswer = hasOverride
                  ? overrides[item.questionId].toUpperCase()
                  : item.recommendedAnswer || '—';

                return (
                  <tr
                    key={item.questionId}
                    className={`border-t border-slate-100 transition-colors ${statusColor(item.consensusStatus)} ${
                      hasOverride ? 'ring-1 ring-inset ring-blue-300' : ''
                    }`}
                  >
                    <td className="px-3 py-2 font-bold text-slate-700">
                      {item.questionId}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center gap-1">
                        <span className="font-mono font-bold text-blue-700">
                          {item.agentAAnswer || '—'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({item.agentAConfidence}%)
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center gap-1">
                        <span className="font-mono font-bold text-violet-700">
                          {item.agentBAnswer || '—'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({item.agentBConfidence}%)
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center gap-1">
                        {statusIcon(item.consensusStatus)}
                        <span className="text-[10px] font-semibold capitalize">
                          {item.consensusStatus}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isEditing ? (
                        <input
                          autoFocus
                          className="w-12 px-2 py-0.5 text-center font-mono font-bold border border-blue-300 rounded bg-white text-sm uppercase"
                          defaultValue={displayAnswer === '—' ? '' : displayAnswer}
                          maxLength={2}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value.trim();
                              if (val) setOverrides(prev => ({ ...prev, [item.questionId]: val }));
                              setEditingQuestion(null);
                            } else if (e.key === 'Escape') {
                              setEditingQuestion(null);
                            }
                          }}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val) setOverrides(prev => ({ ...prev, [item.questionId]: val }));
                            setEditingQuestion(null);
                          }}
                        />
                      ) : (
                        <span className={`font-mono font-bold text-sm ${
                          hasOverride ? 'text-blue-600' : 'text-slate-800'
                        }`}>
                          {displayAnswer}
                          {hasOverride && (
                            <span className="ml-1 text-[9px] text-blue-500 font-sans">(override)</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => setEditingQuestion(isEditing ? null : item.questionId)}
                        className="p-1 rounded hover:bg-white/80 transition-colors"
                        title="Override answer"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-400 hover:text-blue-600" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Show More / Less */}
        {consensus.length > 15 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-2 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 transition-colors"
          >
            {showAll ? (
              <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>Show All {consensus.length} Questions <ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </button>
        )}
      </div>

      {/* Override Summary */}
      {hasOverrides && (
        <div className="mx-4 mb-3 p-2.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-blue-800">
              {Object.keys(overrides).length} manual override{Object.keys(overrides).length !== 1 ? 's' : ''} applied
            </span>
          </div>
          <button
            onClick={() => setOverrides({})}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {summary.autoApprovable && !singleAgentFallback && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
              <Zap className="w-3 h-3" /> High confidence — auto-approvable
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onManualReview && (
            <button
              onClick={onManualReview}
              disabled={isApproving}
              className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-all disabled:opacity-50"
            >
              <Eye className="w-3.5 h-3.5 inline mr-1.5" />
              Manual Review
            </button>
          )}
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isApproving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Approve & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
