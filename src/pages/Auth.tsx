import React, { useState } from 'react';
import { Car, Users, X, ArrowLeft, CheckCircle, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LegalModal, ModalType } from '../components/Footer';

type AuthView = 'signin' | 'signup' | 'forgot';

type AuthProps = {
  onClose?: () => void;
  modal?: boolean;
};

export const Auth: React.FC<AuthProps> = ({ onClose, modal = false }) => {
  const [view, setView] = useState<AuthView>('signin');
  const [role, setRole] = useState<'driver' | 'passenger'>('passenger');
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '', phone: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [legalModal, setLegalModal] = useState<ModalType>(null);

  const { signUp, signIn, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (view === 'signup') {
        await signUp(formData.email, formData.password, {
          full_name: formData.full_name,
          phone: formData.phone,
          role,
        });
        onClose?.();
      } else if (view === 'signin') {
        await signIn(formData.email, formData.password);
        onClose?.();
      } else {
        await resetPassword(formData.email);
        setSuccess('Reset link sent! Check your email inbox (and spam folder).');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchView = (v: AuthView) => {
    setView(v);
    setError('');
    setSuccess('');
    setAgreedToTerms(false);
  };

  const title = view === 'signup' ? 'Create account' : view === 'forgot' ? 'Reset password' : 'Sign in to Songa';
  const subtitle = view === 'signup' ? 'Join thousands of travellers' : view === 'forgot' ? 'We\'ll email you a reset link' : 'Book your seat in seconds';

  const card = (
    <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md ${modal ? '' : 'mx-auto'}`}>
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {view !== 'signin' && (
            <button
              onClick={() => switchView('signin')}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 mr-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
        {modal && onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-6 space-y-4">
        {view === 'signup' && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">I am a:</p>
            <div className="grid grid-cols-2 gap-3">
              {(['passenger', 'driver'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${
                    role === r ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  {r === 'passenger'
                    ? <Users className={`w-6 h-6 ${role === r ? 'text-orange-500' : 'text-gray-400'}`} />
                    : <Car className={`w-6 h-6 ${role === r ? 'text-orange-500' : 'text-gray-400'}`} />
                  }
                  <span className={`text-sm font-medium capitalize ${role === r ? 'text-orange-600' : 'text-gray-600'}`}>{r}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {view === 'signup' && (
            <>
              <input
                type="text" required placeholder="Full name" value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
              <input
                type="tel" required placeholder="Phone — 07XX XXX XXX" value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
            </>
          )}

          <input
            type="email" required placeholder="Email address" value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          />

          {view !== 'forgot' && (
            <input
              type="password" required placeholder="Password" value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              minLength={6}
            />
          )}

          {view === 'signin' && (
            <div className="text-right -mt-1">
              <button
                type="button"
                onClick={() => switchView('forgot')}
                className="text-xs text-orange-600 font-semibold hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          {view === 'signup' && (
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox" checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-orange-500 rounded shrink-0 cursor-pointer"
              />
              <span className="text-xs text-gray-600 leading-relaxed">
                I have read and agree to the{' '}
                <button type="button" onClick={() => setLegalModal('tos')} className="text-orange-600 font-semibold hover:underline">Terms of Service</button>
                {' '}and{' '}
                <button type="button" onClick={() => setLegalModal('privacy')} className="text-orange-600 font-semibold hover:underline">Privacy Policy</button>
              </span>
            </label>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (view === 'signup' && !agreedToTerms)}
            className="w-full bg-orange-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 active:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Please wait...'
              : view === 'signup' ? 'Create Account'
              : view === 'forgot' ? 'Send Reset Link'
              : 'Sign In'}
          </button>
        </form>

        {view !== 'forgot' && (
          <p className="text-center text-sm text-gray-500">
            {view === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => switchView(view === 'signup' ? 'signin' : 'signup')}
              className="text-orange-600 font-semibold hover:underline"
            >
              {view === 'signup' ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        )}
      </div>

      <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
    </div>
  );

  if (modal) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
        <div className="w-full sm:max-w-md">{card}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-600 mb-1">Songa</h1>
          <p className="text-gray-500 text-sm">Your journey, simplified</p>
        </div>
        {card}
      </div>
    </div>
  );
};

// Rendered by App.tsx when a password reset token is detected in the URL
export const ResetPasswordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Set new password</h2>
          <p className="text-sm text-gray-500 mt-1">Choose a strong password for your account</p>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
            <p className="text-gray-700 font-medium">Password updated successfully!</p>
            <button
              onClick={onClose}
              className="w-full bg-orange-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600"
            >
              Sign In Now
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-3">
            <input
              type="password" required placeholder="New password (min 6 chars)"
              value={password} onChange={(e) => setPassword(e.target.value)} minLength={6}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
            <input
              type="password" required placeholder="Confirm new password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
            )}
            <button
              type="submit" disabled={loading}
              className="w-full bg-orange-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
