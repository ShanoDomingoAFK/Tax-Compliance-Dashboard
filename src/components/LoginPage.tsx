import React, { useState } from 'react';
import { supabaseAuthService } from '../services/supabaseAuth';
import { Shield, Eye, EyeOff, Loader2, Database, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    if (isSignUp) {
      if (!firstName || !lastName) {
        setErrorMessage('Please enter both your first name and last name to register your profile.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please ensure both fields are identical.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const sessionData = await supabaseAuthService.signUp(email, password, firstName, lastName);
        if (sessionData.user) {
          // Logged in immediately
          setSuccessMessage('Account created successfully! Redirecting to dashboard...');
          setTimeout(() => {
            onLoginSuccess(sessionData.user);
          }, 1500);
        } else {
          // Verification required
          setSuccessMessage('Registration successful! Please check your email inbox to verify your secure credentials before signing in.');
          // Clear inputs
          setFirstName('');
          setLastName('');
          setPassword('');
          setConfirmPassword('');
          setIsSignUp(false); // Switch to sign in so they can log in after verifying
        }
      } else {
        const sessionData = await supabaseAuthService.signIn(email, password);
        if (sessionData.user) {
          onLoginSuccess(sessionData.user);
        }
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'An unexpected error occurred during security authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-4 relative overflow-hidden select-none">
      {/* Background Decorative Accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px]" />

      <div className="w-full max-w-md z-10">
        {/* Branding & Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4 animate-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase font-sans">
            Tax & Compliance
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold tracking-wider uppercase font-mono">
            Secure Government Ledger Dashboard
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-8 shadow-2xl">
          {/* Sign In vs Sign Up Tabs */}
          <div className="flex border-b border-slate-700/50 mb-6 pb-0.5">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider text-center transition-colors border-b-2 cursor-pointer ${
                !isSignUp
                  ? 'text-indigo-400 border-indigo-500'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider text-center transition-colors border-b-2 cursor-pointer ${
                isSignUp
                  ? 'text-indigo-400 border-indigo-500'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          <h2 className="text-base font-bold text-white mb-1">
            {isSignUp ? 'Register corporate credentials' : 'Welcome back'}
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            {isSignUp
              ? 'Create a secured log to access your electronic tax ledger and compliance tools.'
              : 'Sign in to access your authorized tax workspace.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message banner */}
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex gap-2 text-red-400 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Success Message banner */}
            {successMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* Registration specific fields: First & Last Name */}
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shan"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 shadow-inner font-sans"
                    disabled={isLoading}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Domingo"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 shadow-inner font-sans"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Corporate Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. shansdomingo@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 shadow-inner font-sans"
                disabled={isLoading}
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Security Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isSignUp ? 'Create a secure password (min 6 char)' : 'Enter your secret password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 focus:border-indigo-500 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 shadow-inner font-sans"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (Registration only) */}
            {isSignUp && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Confirm Security Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Verify password matches"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 focus:border-indigo-500 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 shadow-inner font-sans"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 shadow-md shadow-indigo-500/10 cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isSignUp ? 'Registering...' : 'Verifying Credentials...'}</span>
                </>
              ) : (
                <span>{isSignUp ? 'Register Corporate Profile' : 'Sign In to Workspace'}</span>
              )}
            </button>
          </form>

          {/* Quick Sandbox Mode Details */}
          <div className="mt-6 pt-6 border-t border-slate-700/50 flex flex-col gap-2 bg-slate-900/25 p-3 rounded-xl border border-slate-800/40 select-none">
            <div className="flex items-center gap-1.5 text-indigo-400">
              <Database className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Demo / Sandbox Mode</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              If your database link is offline, type your corporate email address with password <code className="text-amber-400 font-mono font-bold bg-slate-900 px-1 py-0.5 rounded">password123</code> in either form to skip directly into local sandbox demo.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-slate-500 text-center mt-6 font-medium">
          Philippine Tax Ledger Framework &copy; 2026. Secured with 256-bit encryption.
        </p>
      </div>
    </div>
  );
}
