import { useState, useEffect } from 'react';
import { supabase } from '../client';

export function useUser() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchProfileRole = async (userId) => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', userId)
        .single();
      return profile?.user_type || null;
    };

    const initializeUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          const { user } = session;
          // Fetch user_type from profiles table
          const userType = await fetchProfileRole(user.id);
          setUser({
            ...user,
            role: userType || user.user_metadata?.user_type || 'patient'
          });
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          const { user } = session;
          const userType = await fetchProfileRole(user.id);
          const newUser = {
            ...user,
            role: userType || user.user_metadata?.user_type || 'patient'
          };

          setUser(prevUser => {
            if (!prevUser || prevUser.id !== newUser.id || prevUser.role !== newUser.role) {
              return newUser;
            }
            return prevUser;
          });
        } else {
          setUser(prevUser => prevUser ? null : prevUser);
        }

        setIsLoading(prevLoading => prevLoading ? false : prevLoading);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return { user, isLoading };
}