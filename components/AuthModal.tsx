import React, { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

interface AuthModalProps {
  onClose: () => void;
}

type AuthMode = 'login' | 'signup';

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
            required
            minLength={6}
            className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-3 text-white placeholder-[#A0A0A0] 
                      focus:ring-2 focus:ring-[#6A5ACD]/50 focus:border-[#6A5ACD]/50 focus:outline-none
                      transition-all duration-200 hover:border-[rgba(255,255,255,0.2)]"
          />
        </div>
        {error && (
          <div className="bg-[#DC3545]/10 border border-[#DC3545]/30 rounded-lg p-3">
            <p className="text-[#DC3545] text-sm font-medium">{error}</p>
          </div>
        )}
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
      </form>
    </div>
  );
};

export default AuthModal;