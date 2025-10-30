import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { authApi } from '@/api/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setSession: (session) => set({ 
    session, 
    user: session?.user ?? null,
    isAuthenticated: !!session?.user 
  }),
  
  setLoading: (loading) => set({ loading }),

  signOut: async () => {
    await authApi.signOut();
    set({ user: null, session: null, isAuthenticated: false });
  },

  initialize: async () => {
    try {
      set({ loading: true });
      
      // Set up auth state listener
      authApi.onAuthStateChange((event, session) => {
        set({ 
          session, 
          user: session?.user ?? null,
          isAuthenticated: !!session?.user,
          loading: false 
        });
      });

      // Check for existing session
      const session = await authApi.getSession();
      set({ 
        session, 
        user: session?.user ?? null,
        isAuthenticated: !!session?.user,
        loading: false 
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false });
    }
  }
}));
