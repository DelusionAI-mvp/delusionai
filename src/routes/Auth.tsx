  import React, { useState } from 'react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, LogIn, User, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from '@tanstack/react-router';
import { Logo } from '../components/Logo';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      navigate({ to: '/dashboard' });
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      const msg = err.code || err.message || "";
      if (msg.includes("popup-closed-by-user")) {
        setError("Sign-in window was closed.");
      } else if (msg.includes("popup-blocked")) {
        setError("Popup was blocked by your browser because this app is loaded inside an iframe preview. Please open this application in a new browser tab (icon in top-right), or connect using the Email/Password option below!");
      } else {
        setError(`Authentication unsuccessful: ${err.message || 'Security validation restricted'}.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await updateProfile(cred.user, { displayName: name });
        } catch (innerErr) {
          console.error("Non-critical: Failed to update display name", innerErr);
        }
      }
      navigate({ to: '/dashboard' });
    } catch (err: any) {
      if (err.message.includes('auth/invalid-credential') || err.message.includes('auth/user-not-found') || err.message.includes('auth/wrong-password')) {
        setError("Invalid credentials. Access denied.");
      } else if (err.message.includes('auth/operation-not-allowed') || err.message.includes('operation-not-allowed')) {
        setError("Email/Password provider is disabled in Firebase. Please enable it in Firebase Console -> Authentication -> Sign-In Method, or connect with Google above!");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (loading) return;
    if (!email) {
      setError("Enter digital mail to reset keyphrase.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen sm:min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 bg-bg-base overflow-y-auto">
      <div className="w-full max-w-md bg-bg-card rounded-[2rem] border-2 border-brand-primary/10 shadow-[12px_12px_24px_rgba(128,0,32,0.03)] p-6 sm:p-8 space-y-4 relative overflow-hidden my-auto">
        <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary"></div>
        
        <div className="text-center space-y-4">
          <div className="flex justify-start">
            <Link 
              to="/" 
              className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-text-muted hover:text-brand-primary transition-colors cursor-pointer"
            >
              <ArrowLeft size={12} />
              <span>Go Back</span>
            </Link>
          </div>
          <div className="flex justify-center -mt-2">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden border border-brand-primary/10">
              <Logo size={44} />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tighter uppercase italic leading-none text-text-base">
            {isLogin ? 'Sign' : 'Join'} <br />
            <span className="text-brand-primary">{isLogin ? 'In' : 'Us'}</span>
          </h2>
          <p className="text-text-muted font-black uppercase tracking-[0.25em] text-[9px] italic">
            {isLogin ? 'Log in to your account' : 'Create your account'}
          </p>
        </div>

        <div className="space-y-3">
          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="btn-glassy w-full py-3 justify-center text-[10px] tracking-[0.15em] font-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
            <span>Connect via Google</span>
          </button>
        </div>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-brand-primary/5"></div>
          <span className="flex-shrink mx-4 text-[8px] font-black uppercase tracking-[0.4em] text-text-muted">Email Login</span>
          <div className="flex-grow border-t border-brand-primary/5"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] ml-1 text-text-muted">Your Name</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  placeholder="Official Name"
                  className="w-full py-2.5 px-12 bg-[#FAF7F2] border border-brand-primary/10 focus:border-brand-primary/40 focus:bg-white focus:shadow-[0_0_8px_rgba(128,0,32,0.02)] outline-none transition-all duration-300 rounded-full text-text-base text-xs placeholder:text-zinc-400 font-sans disabled:opacity-50"
                  required
                />
                <User className="absolute left-4.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand-accent transition-colors" size={16} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] ml-1 text-text-muted">Email Address</label>
            <div className="relative group">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="address@domain.com"
                className="w-full py-2.5 px-12 bg-[#FAF7F2] border border-brand-primary/10 focus:border-brand-primary/40 focus:bg-white focus:shadow-[0_0_8px_rgba(128,0,32,0.02)] outline-none transition-all duration-300 rounded-full text-text-base text-xs placeholder:text-zinc-400 font-sans disabled:opacity-50"
                required
              />
              <Mail className="absolute left-4.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand-accent transition-colors" size={16} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] ml-1 text-text-muted">Password</label>
            <div className="relative group">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="********"
                className="w-full py-2.5 px-12 bg-[#FAF7F2] border border-brand-primary/10 focus:border-brand-primary/40 focus:bg-white focus:shadow-[0_0_8px_rgba(128,0,32,0.02)] outline-none transition-all duration-300 rounded-full text-text-base text-xs placeholder:text-zinc-400 font-sans disabled:opacity-50"
                required
              />
              <Lock className="absolute left-4.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand-accent transition-colors" size={16} />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-4.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-brand-accent transition-colors disabled:opacity-50"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-[10px] font-bold bg-red-500/5 px-3 py-1.5 rounded-xl border border-red-500/10">
              {error}
            </div>
          )}

          {resetSent && (
            <div className="text-brand-secondary text-[10px] font-bold bg-brand-secondary/5 px-3 py-1.5 rounded-xl border border-brand-secondary/10">
              Reset link dispatched to your mail.
            </div>
          )}

          <div className="flex items-center justify-between px-1">
            {isLogin && (
              <button 
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-[9px] font-black uppercase tracking-widest text-brand-secondary hover:text-brand-accent transition-colors underline underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Forgot Password?
              </button>
            )}
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="btn-get-started w-full group !text-[10px] py-3.5 flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{isLogin ? (loading ? 'Signing In...' : 'Sign In') : (loading ? 'Signing Up...' : 'Sign Up')}</span>
            <LogIn size={14} />
          </button>
        </form>

        <div className="text-center pt-1.5">
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-black uppercase tracking-[0.2em] text-[9px] text-text-base hover:text-brand-primary transition-colors border-b-2 border-brand-primary/5 hover:border-brand-primary pb-0.5"
          >
            {isLogin ? "Create an account" : "Go back to Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
