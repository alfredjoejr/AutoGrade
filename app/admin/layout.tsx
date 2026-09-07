import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AutoGrade Admin',
  description: 'Admin dashboard for managing AutoGrade batch grading results.',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {children}
    </div>
  );
}
