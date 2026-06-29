import { supabase } from './supabaseClient';

export interface UserSession {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  } | null;
  session: any | null;
}

export const supabaseAuthService = {
  /**
   * Check if a user is currently logged in (persisted session)
   */
  async getCurrentSession(): Promise<UserSession> {
    const cachedUser = localStorage.getItem('dashboard_user_session');
    
    // Check if Supabase client is live and connected
    if (supabase) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!error && session?.user) {
          // Fetch profiles matching user id
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          return {
            user: {
              id: session.user.id,
              email: session.user.email || '',
              firstName: profile?.first_name || '',
              lastName: profile?.last_name || '',
              role: profile?.role || 'editor',
            },
            session,
          };
        }
      } catch (e) {
        console.warn('Supabase session check failed, falling back to local session state.', e);
      }
    }

    // Fallback to local session check
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        return {
          user: parsed,
          session: { local: true },
        };
      } catch {
        return { user: null, session: null };
      }
    }

    return { user: null, session: null };
  },

  /**
   * Sign up with email, password, and first/last name
   */
  async signUp(email: string, password: string, firstName: string, lastName: string): Promise<UserSession> {
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            }
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data?.user) {
          // If a session exists immediately (email confirmation disabled in Supabase), log them in
          if (data.session) {
            const userObj = {
              id: data.user.id,
              email: data.user.email || '',
              firstName: firstName,
              lastName: lastName,
              role: 'editor',
            };
            localStorage.setItem('dashboard_user_session', JSON.stringify(userObj));
            return {
              user: userObj,
              session: data.session,
            };
          } else {
            // Email confirmation is required
            return {
              user: null,
              session: null,
            };
          }
        }
      } catch (err: any) {
        console.error('Supabase Sign Up failed:', err);
        throw err;
      }
    }

    // Fallback sandbox / demo register
    const userObj = {
      id: 'usr_local_demo_' + Date.now(),
      email: email.toLowerCase().trim(),
      firstName,
      lastName,
      role: 'admin',
    };
    localStorage.setItem('dashboard_user_session', JSON.stringify(userObj));
    return {
      user: userObj,
      session: { local: true },
    };
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<UserSession> {
    // 1. If Supabase is configured, attempt real authentication
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data?.session && data?.user) {
          // Fetch user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const userObj = {
            id: data.user.id,
            email: data.user.email || '',
            firstName: profile?.first_name || '',
            lastName: profile?.last_name || '',
            role: profile?.role || 'editor',
          };

          localStorage.setItem('dashboard_user_session', JSON.stringify(userObj));
          return {
            user: userObj,
            session: data.session,
          };
        }
      } catch (err: any) {
        console.warn('Supabase Auth failed or is unconfigured. Trying local verification.', err);
        // If it's a real Auth error (like invalid credentials), propagate it
        if (err.message && !err.message.includes('Fetch') && !err.message.includes('network')) {
          throw err;
        }
      }
    }

    // 2. Local Fallback credentials (useful for demo, local testing, and offline modes)
    // Accept standard Philippine company accounting logins, or default admin/password123
    const demoEmail = email.toLowerCase().trim();
    if (
      (demoEmail === 'admin@company.com' && password === 'password123') ||
      (demoEmail === 'shansdomingo@gmail.com' && password === 'password123') ||
      (password === 'password123' && demoEmail.includes('@'))
    ) {
      const userObj = {
        id: 'usr_local_demo',
        email: demoEmail,
        firstName: demoEmail === 'shansdomingo@gmail.com' ? 'Shan' : 'Admin',
        lastName: 'User',
        role: 'admin',
      };
      
      localStorage.setItem('dashboard_user_session', JSON.stringify(userObj));
      return {
        user: userObj,
        session: { local: true },
      };
    }

    throw new Error('Invalid email or password. Please use your Supabase credentials or type your corporate email with password: "password123" for demo mode.');
  },

  /**
   * Log out from the current session
   */
  async signOut(): Promise<void> {
    localStorage.removeItem('dashboard_user_session');
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase logout encountered error:', e);
      }
    }
  }
};
