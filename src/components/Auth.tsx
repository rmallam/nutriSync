"use client";

import { useState } from 'react';
import { supabase } from '@/utils/supabase';

interface AuthProps {
  onSuccess: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        // If email confirmation is off, the user is signed in immediately
        // If it's on, data.session will be null
        if (data.session) {
          onSuccess();
        } else {
          setError("Sign up successful! Please check your email for a confirmation link.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 'var(--space-6)' }}>
      <div className="card glass-panel" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-8)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
           <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-2)' }}>
             <span style={{ fontSize: '2rem' }}>🍏</span> NutriSync
           </h1>
           <p style={{ color: 'var(--text-muted)' }}>
             {isSignUp ? "Create an account to start tracking." : "Welcome back. Log in to track your meals."}
           </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-4)', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', outline: 'none', background: 'var(--bg-primary)' }}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', outline: 'none', background: 'var(--bg-primary)' }}
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ marginTop: 'var(--space-4)', width: '100%' }}
          >
            {loading ? "Authenticating..." : (isSignUp ? "Sign Up" : "Log In")}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
            style={{ background: 'none', border: 'none', color: '#007AFF', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
          >
            {isSignUp ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
