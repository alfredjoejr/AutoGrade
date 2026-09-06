"use client";

import { useState } from "react";
import { UploadView } from "@/components/upload-view";
import { ModerationView } from "@/components/moderation-view";
import { AnalyticsView } from "@/components/analytics-view";
import { UploadCloud, Eye, BarChart3, GraduationCap } from "lucide-react";

type ViewState = 'UPLOAD' | 'MODERATE' | 'ANALYZE';

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewState>('UPLOAD');
  const [totalQuestions, setTotalQuestions] = useState(25);
  
  // Grading State
  const [gradingResults, setGradingResults] = useState<any[]>([]);
  const [scannedImage, setScannedImage] = useState<string | null>(null);

  const tabs = [
    { id: 'UPLOAD', label: '1. Setup & Upload', icon: UploadCloud },
    { id: 'MODERATE', label: '2. Moderation', icon: Eye },
    { id: 'ANALYZE', label: '3. Analytics', icon: BarChart3 },
  ] as const;

  const handleGradingComplete = (results: any[], imageBase64: string) => {
    setGradingResults(results);
    setScannedImage(imageBase64);
    setCurrentView('MODERATE');
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col font-sans overflow-hidden">
      
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
            G
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">GradeFlow <span className="text-blue-600">AI</span></span>
        </div>
        
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          {tabs.map((tab) => {
            const isActive = currentView === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-white text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold tracking-wide text-slate-600 bg-slate-100 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Open Access
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        <section className="flex-1 bg-slate-100 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
            {currentView === 'UPLOAD' && (
              <UploadView 
                totalQuestions={totalQuestions} 
                setTotalQuestions={setTotalQuestions} 
                onGradeComplete={handleGradingComplete}
              />
            )}
            {currentView === 'MODERATE' && (
              <ModerationView 
                totalQuestions={totalQuestions} 
                results={gradingResults}
                setResults={setGradingResults}
                scannedImage={scannedImage}
              />
            )}
            {currentView === 'ANALYZE' && (
              <AnalyticsView totalQuestions={totalQuestions} />
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="h-8 bg-slate-900 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-[10px] text-slate-400 uppercase tracking-tighter">System Active</span>
          </div>
          <span className="text-[10px] text-slate-600">|</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-tighter">OCR Accuracy: 99.4%</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-3/4"></div>
            </div>
            <span className="text-[10px] text-slate-400 ml-2 uppercase">Processing Batch...</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
