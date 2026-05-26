import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: { full_name: string; phone: string; role: 'driver' | 'passenger' }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchProfileSafe(userId: string): Promise<Profile | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

async function fetchProfileWithRetry(userId: string, retries = 4): Promise<Profile | null> {
  const data = await fetchProfileSafe(userId);
  if (data) return data;
  if (retries <= 0) return null;
  await new Promise((r) => setTimeout(r, 800));
  return fetchProfileWithRetry(userId, retries - 1);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Hard 10s timeout so we never hang forever
      const safetyTimer = setTimeout(() => {
        if (mounted && loading) setLoading(false);
      }, 10000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          const p = await fetchProfileWithRetry(session.user.id);
          if (mounted) { setProfile(p); setLoading(false); }
        } else {
          if (mounted) setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      } finally {
        clearTimeout(safetyTimer);
        if (mounted) initializedRef.current = true;
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted || !initializedRef.current) return;
      (async () => {
        if (session?.user) {
          setUser(session.user);
          const p = await fetchProfileWithRetry(session.user.id);
          if (mounted) { setProfile(p); setLoading(false); }
        } else {
          if (mounted) { setUser(null); setProfile(null); setLoading(false); }
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    userData: { full_name: string; phone: string; role: 'driver' | 'passenger' }
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: userData.full_name, phone: userData.phone, role: userData.role } },
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
      if (error.message.includes('Database error')) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInErr) return;
        throw new Error('Sign up failed. Please try again.');
      }
      throw error;
    }

    if (data.user?.identities?.length === 0) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    if (data.user) {
      await supabase.from('profiles').upsert(
        { id: data.user.id, full_name: userData.full_name, phone: userData.phone, role: userData.role },
        { onConflict: 'id', ignoreDuplicates: false }
      );
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
        throw new Error('Incorrect email or password. Please try again.');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please confirm your email address before signing in.');
      }
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const redirectTo = `${window.location.origin}/?reset=true`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
