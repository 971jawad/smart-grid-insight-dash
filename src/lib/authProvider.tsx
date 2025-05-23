
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, meta?: object) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Auth state changed:', event, Boolean(currentSession));
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
        
        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          toast.success('Signed in successfully');
          navigate('/dashboard');
        } else if (event === 'SIGNED_OUT') {
          toast.info('Signed out');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log('Initial session check:', Boolean(currentSession));
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Signing in with email:', email);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (!error) {
        // Navigation happens in the onAuthStateChange handler
      }
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, meta?: object) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: meta,
          emailRedirectTo: `${window.location.origin}/sign-in`
        }
      });
      
      if (!error) {
        toast.success('Registration successful! Please check your email to verify your account');
        navigate('/sign-in');
      }
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    console.log('Signing out');
    await supabase.auth.signOut();
    // Navigation happens in the onAuthStateChange handler
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
