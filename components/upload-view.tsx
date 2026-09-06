import { UploadCloud, FileType, SlidersHorizontal, CheckCircle2, Loader2 } from "lucide-react";
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
  const [masterKey, setMasterKey] = useState<Record<number, string>>({
    1: "A", 2: "C", 3: "B", 4: "D", 5: "A"
  });
  const [isGrading, setIsGrading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeySelect = (question: number, answer: string) => {
    setMasterKey(prev => ({ ...prev, [question]: answer }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGrading(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64DataUrl = reader.result as string;
        const base64Data = base64DataUrl.split(',')[1];

        // Call our Gemini grading API
        const res = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type,
            masterKey,
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
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

        {/* Master Key Configuration */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            Master Key
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100%-2rem)]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="font-bold text-slate-900 text-[10px] uppercase tracking-wider">Manual Configuration</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total MCQs:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2 py-1 text-sm border border-slate-300 rounded font-bold text-slate-900 bg-white"
                  />
                </div>
                <button className="text-blue-600 text-[10px] uppercase font-bold tracking-wider hover:text-blue-700">Upload Key</button>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNum) => (
                <div key={qNum} className="flex items-center justify-between">
                  <span className="w-8 text-sm font-medium text-slate-500">Q{qNum}</span>
                  <div className="flex gap-1">
                    {['A', 'B', 'C', 'D'].map((opt) => {
                      const isSelected = masterKey[qNum] === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => handleKeySelect(qNum, opt)}
                          className={`w-8 h-8 rounded text-sm font-bold transition-all border ${
                            isSelected
                              ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm'
                              : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button className="w-full py-2 bg-blue-600 text-white font-medium rounded-md text-sm hover:bg-blue-700 transition-colors shadow-sm">
                Save Master Key
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
