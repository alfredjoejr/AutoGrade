"use client";

import { useState, useEffect } from "react";
import { UploadView } from "@/components/upload-view";
import { ModerationView } from "@/components/moderation-view";
import { AnalyticsView } from "@/components/analytics-view";
import { StudentPortalView } from "@/components/student-portal-view";
import {
  UploadCloud,
  Eye,
  BarChart3,
  GraduationCap,
  BookOpen,
  UserCheck,
  ArrowLeftRight,
  ShieldCheck,
  Loader2
} from "lucide-react";
import type { StudentGradingResult } from "@/lib/types";

type ViewState = 'UPLOAD' | 'MODERATE' | 'ANALYZE';
type Role = 'teacher' | 'student' | 'admin';

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewState>('UPLOAD');
  const [totalQuestions, setTotalQuestions] = useState(25);
  const [threshold, setThreshold] = useState(85);
  
  // Auth and Role state
  const [currentRole, setCurrentRole] = useState<Role>('teacher');
  const [currentUser, setCurrentUser] = useState<{ username: string; displayName: string; role: Role } | null>({
    username: 'teacher',
    displayName: 'Teacher Sarah',
    role: 'teacher'
  });
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  // Batch grading state
  const [batchStudents, setBatchStudents] = useState<StudentGradingResult[]>([]);
  const [masterKey, setMasterKey] = useState<Record<number, string>>({});
  const [batchId, setBatchId] = useState<string>('');

  // Sync session on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
          setCurrentRole(data.user.role);
        } else {
          // Initialize default teacher session
          handleSwitchRole('teacher');
        }
      })
      .catch(() => {
        handleSwitchRole('teacher');
      });
  }, []);

  const handleSwitchRole = async (targetRole: Role) => {
    setIsSwitchingRole(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quickRole: targetRole })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        setCurrentRole(data.user.role);
      }
    } catch (err) {
      console.error("Failed to switch role:", err);
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const tabs = [
    { id: 'UPLOAD', label: '1. Setup & Upload', icon: UploadCloud },
    { id: 'MODERATE', label: '2. Moderation', icon: Eye },
    { id: 'ANALYZE', label: '3. Analytics', icon: BarChart3 },
  ] as const;

  const handleBatchComplete = (
    students: StudentGradingResult[], 
    key: Record<number, string>,
    sessionId: string
  ) => {
    setBatchStudents(students);
    setMasterKey(key);
    setBatchId(sessionId);
    setCurrentView('MODERATE');
  };

  const handleModerationComplete = (updatedStudents: StudentGradingResult[]) => {
    setBatchStudents(updatedStudents);
    setCurrentView('ANALYZE');
  };

  const studentsGraded = batchStudents.length;

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col font-sans overflow-hidden">
      
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-xs">
            A
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900">AutoGrade <span className="text-blue-600">AI</span></span>
          </div>
        </div>
        
        {/* Navigation Tabs (Visible for Teacher / Admin) */}
        {currentRole !== 'student' ? (
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
                      ? 'bg-white text-blue-700 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200/80 rounded-lg text-xs font-semibold text-indigo-800">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Student Submission & Results Portal
          </div>
        )}
        
        {/* Right Section: Role Switcher & User Profile */}
        <div className="flex items-center gap-3">
          {/* Quick Role Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => handleSwitchRole('teacher')}
              disabled={isSwitchingRole || currentRole === 'teacher'}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                currentRole === 'teacher'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              <span>Teacher</span>
            </button>

            <button
              onClick={() => handleSwitchRole('student')}
              disabled={isSwitchingRole || currentRole === 'student'}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                currentRole === 'student'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Student</span>
            </button>
          </div>

          {/* User Badge */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 text-xs">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
              {currentUser?.displayName ? currentUser.displayName.charAt(0) : 'U'}
            </div>
            <div className="text-left">
              <div className="font-semibold text-slate-800 truncate max-w-[120px]">
                {currentUser?.displayName || 'User'}
              </div>
              <div className="text-[10px] text-slate-400 capitalize font-mono">
                {currentRole}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        <section className="flex-1 bg-slate-100 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
            {isSwitchingRole ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-xs font-semibold">Switching Role...</span>
              </div>
            ) : currentRole === 'student' ? (
              /* Student Portal View */
              <StudentPortalView
                defaultStudentId={currentUser?.username === 'student' ? 'STU-101' : currentUser?.username}
                defaultStudentName={currentUser?.displayName || 'Alex Johnson'}
              />
            ) : (
              /* Teacher / Admin View */
              <>
                {currentView === 'UPLOAD' && (
                  <UploadView 
                    totalQuestions={totalQuestions} 
                    setTotalQuestions={setTotalQuestions} 
                    onBatchComplete={handleBatchComplete}
                  />
                )}
                {currentView === 'MODERATE' && (
                  <ModerationView 
                    totalQuestions={totalQuestions} 
                    students={batchStudents}
                    setStudents={setBatchStudents}
                    onModerationComplete={handleModerationComplete}
                  />
                )}
                {currentView === 'ANALYZE' && (
                  <AnalyticsView 
                    totalQuestions={totalQuestions}
                    students={batchStudents}
                    masterKey={masterKey}
                    batchId={batchId}
                    threshold={threshold}
                  />
                )}
              </>
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
          <span className="text-[10px] text-slate-400 uppercase tracking-tighter">
            Role: <span className="text-blue-400 font-bold uppercase">{currentRole}</span>
          </span>
          <span className="text-[10px] text-slate-600">|</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-tighter">Batch Limit: 10 Sheets Max</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 uppercase">
              {currentRole === 'student'
                ? 'Student Portal Active'
                : studentsGraded > 0 
                  ? `Batch: ${studentsGraded} student${studentsGraded !== 1 ? 's' : ''} graded`
                  : 'No batch loaded'
              }
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
