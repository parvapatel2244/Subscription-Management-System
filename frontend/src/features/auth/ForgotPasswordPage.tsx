import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../../services/api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetTokenDebug, setResetTokenDebug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<any>('/auth/forgot-password', { email });
      setSubmitted(true);
      if (res.reset_token_debug) {
        setResetTokenDebug(res.reset_token_debug);
      }
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-sky-600 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-sky-600/30 mb-3">
            B
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Forgot Password</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your registered email to reset password</p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-start gap-2.5">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>
                If an account with that email exists, password reset instructions have been generated.
              </span>
            </div>
            {resetTokenDebug && (
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs">
                <span className="font-semibold block mb-1">Development Reset Token:</span>
                <code className="bg-white px-2 py-1 rounded block select-all break-all border border-sky-200">
                  {resetTokenDebug}
                </code>
                <Link
                  to={`/reset-password?token=${resetTokenDebug}`}
                  className="mt-2 inline-block text-sky-600 font-bold hover:underline"
                >
                  Click here to proceed to Reset Form &rarr;
                </Link>
              </div>
            )}
            <Link
              to="/login"
              className="w-full mt-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-center block text-sm transition"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl transition shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              {loading ? 'Submitting...' : 'Send Reset Instructions'}
            </button>

            <Link
              to="/login"
              className="w-full py-2.5 text-slate-500 hover:text-slate-800 font-medium text-center block text-xs"
            >
              Back to Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};

