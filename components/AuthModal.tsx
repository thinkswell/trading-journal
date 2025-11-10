import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, ActionCodeSettings } from "firebase/auth";
import { FaGoogle } from 'react-icons/fa';

interface AuthModalProps {
  onClose: () => void;
}

type AuthMode = 'login' | 'signup';

const googleProvider = new GoogleAuthProvider();

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Reset forgot password state when switching modes
  useEffect(() => {
    if (mode === 'signup') {
      setShowForgotPassword(false);
      setResetSent(false);
      setResetEmail('');
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!resetEmail.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    setResetLoading(true);
    setError(null);
    
    // Configure action code settings for password reset email
    const actionCodeSettings: ActionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: false,
    };
    
    try {
      console.log('Sending password reset email to:', resetEmail);
      await sendPasswordResetEmail(auth, resetEmail, actionCodeSettings);
      console.log('Password reset email sent successfully');
      setResetSent(true);
      setError(null);
    } catch (err: any) {
      console.error('Password reset error:', err);
      let errorMessage = err.message;
      
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many password reset requests. Please try again later.';
      } else if (err.code === 'auth/quota-exceeded') {
        errorMessage = 'Password reset quota exceeded. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="p-2">
      <h2 className="text-3xl font-extrabold bg-gradient-to-r from-white to-[#E0E0E0] bg-clip-text text-transparent mb-6">
        {mode === 'login' ? 'Welcome Back' : 'Create Account'}
      </h2>
      <div className="flex border-b border-[rgba(255,255,255,0.1)] mb-6">
        <button 
          onClick={() => setMode('login')}
          className={`py-3 px-4 text-lg font-bold w-1/2 transition-all duration-200 ${
            mode === 'login' 
              ? 'text-[#6A5ACD] border-b-2 border-[#6A5ACD]' 
              : 'text-[#A0A0A0] hover:text-[#E0E0E0]'
          }`}
        >
          Login
        </button>
        <button 
          onClick={() => setMode('signup')}
          className={`py-3 px-4 text-lg font-bold w-1/2 transition-all duration-200 ${
            mode === 'signup' 
              ? 'text-[#6A5ACD] border-b-2 border-[#6A5ACD]' 
              : 'text-[#A0A0A0] hover:text-[#E0E0E0]'
          }`}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-[#E0E0E0] mb-2">Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white placeholder-[#A0A0A0] 
                      focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                      transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#E0E0E0] mb-2">Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!showForgotPassword}
            minLength={6}
            disabled={showForgotPassword}
            className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white placeholder-[#A0A0A0] 
                      focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                      transition-all duration-200 hover:border-[rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {mode === 'login' && !showForgotPassword && (
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setError(null);
                setResetEmail(email);
              }}
              className="text-sm text-[#6A5ACD] hover:text-[#8b5cf6] hover:underline mt-2 transition-colors duration-200"
            >
              Forgot Password?
            </button>
          )}
        </div>
        
        {showForgotPassword && mode === 'login' && (
          <div className="space-y-4 p-4 bg-[rgba(106,90,205,0.1)] border border-[rgba(106,90,205,0.3)] rounded-lg">
            {!resetSent ? (
              <>
                <p className="text-sm text-[#E0E0E0] mb-2">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-[#E0E0E0] mb-2">Email</label>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleForgotPassword(e as any);
                        }
                      }}
                      className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white placeholder-[#A0A0A0] 
                                focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                                transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetEmail('');
                        setError(null);
                      }}
                      className="flex-1 bg-[#2C2C2C] hover:bg-[#3f3f46] text-white font-bold py-2 px-4 rounded-lg 
                                transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      className="flex-1 bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-2 px-4 rounded-lg 
                                shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 transition-all duration-200 
                                hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {resetLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="bg-[#28A745]/10 border border-[#28A745]/30 rounded-lg p-3 space-y-2">
                  <p className="text-[#28A745] text-sm font-medium">
                    Password reset email sent successfully!
                  </p>
                  <p className="text-[#E0E0E0] text-xs">
                    Please check your inbox and follow the instructions to reset your password. 
                    If you don't see the email, please check your spam/junk folder. 
                    The email may take a few minutes to arrive.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSent(false);
                    setResetEmail('');
                    setError(null);
                  }}
                  className="w-full bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-2 px-4 rounded-lg 
                            shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 transition-all duration-200 
                            hover:scale-[1.02] active:scale-[0.98]"
                >
                  Back to Login
                </button>
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="bg-[#DC3545]/10 border border-[#DC3545]/30 rounded-lg p-3">
            <p className="text-[#DC3545] text-sm font-medium">{error}</p>
          </div>
        )}
        {!showForgotPassword && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#6A5ACD] to-[#8b5cf6] hover:from-[#8b5cf6] hover:to-[#6A5ACD] text-white font-bold py-3 px-4 rounded-lg 
                        shadow-sm shadow-[#6A5ACD]/10 hover:shadow-md hover:shadow-[#6A5ACD]/15 transition-all duration-200 
                        hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Create Account')}
            </button>
          </div>
        )}
      </form>

      {!showForgotPassword && (
        <>
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-[rgba(255,255,255,0.1)]"></div>
            <span className="px-4 text-sm text-[#A0A0A0] font-medium">OR</span>
            <div className="flex-1 border-t border-[rgba(255,255,255,0.1)]"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-lg 
                      shadow-sm hover:shadow-md transition-all duration-200 
                      hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <FaGoogle size={20} />
            Continue with Google
          </button>
        </>
      )}
    </div>
  );
};

export default AuthModal;