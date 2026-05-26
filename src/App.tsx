import { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { DriverDashboard } from './pages/DriverDashboard';
import { PassengerDashboard } from './pages/PassengerDashboard';
import { Landing } from './pages/Landing';
import { Cargo } from './pages/Cargo';
import { Corporate } from './pages/Corporate';
import { SongaAI } from './pages/SongaAI';
import { ResetPasswordModal } from './pages/Auth';

export type Page = 'landing' | 'passenger' | 'driver' | 'cargo' | 'corporate' | 'ai';

function App() {
  const { profile, loading } = useAuth();
  const [page, setPage] = useState<Page>('landing');
  const [showReset, setShowReset] = useState(false);

  // Detect password reset token in URL hash (Supabase sends #access_token=... after reset email click)
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    if (hash.includes('access_token') || params.get('reset') === 'true' || hash.includes('type=recovery')) {
      setShowReset(true);
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading Songa...</p>
      </div>
    );
  }

  if (showReset) return <ResetPasswordModal onClose={() => setShowReset(false)} />;

  // Shared sub-pages available to any auth state
  if (page === 'cargo') return <Cargo onNavigate={setPage} />;
  if (page === 'corporate') return <Corporate onNavigate={setPage} />;
  if (page === 'ai') return <SongaAI onBack={() => setPage('landing')} />;

  // Authenticated — route by role immediately (no manual refresh needed)
  if (profile?.role === 'driver') return <DriverDashboard />;
  if (profile?.role === 'passenger') return <PassengerDashboard />;

  return <Landing onNavigate={setPage} />;
}

export default App;
