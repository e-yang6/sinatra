import React, { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'signin' }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { signIn, signUp, resetPassword } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          onClose();
          setEmail('');
          setPassword('');
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email to confirm your account!');
          setTimeout(() => {
            setMode('signin');
            setMessage(null);
          }, 3000);
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for password reset instructions!');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-6 text-zinc-200">
          {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Reset Password'}
        </h2>

        {message && (
          <div className="mb-4 p-3 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-9 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-sm text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-2 text-xs">
          {mode === 'signin' && (
            <>
              <button
                onClick={() => setMode('reset')}
                className="text-zinc-500 hover:text-zinc-300 transition-colors text-left"
              >
                Forgot password?
              </button>
              <button
                onClick={() => setMode('signup')}
                className="text-zinc-500 hover:text-zinc-300 transition-colors text-left"
              >
                Don't have an account? Sign up
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button
              onClick={() => setMode('signin')}
              className="text-zinc-500 hover:text-zinc-300 transition-colors text-left"
            >
              Already have an account? Sign in
            </button>
          )}
          {mode === 'reset' && (
            <button
              onClick={() => setMode('signin')}
              className="text-zinc-500 hover:text-zinc-300 transition-colors text-left"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
