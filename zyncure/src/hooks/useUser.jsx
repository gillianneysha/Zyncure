import { useState, useEffect } from 'react';
import { supabase } from '../client';

export function useUser() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const initializeUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          const { user } = session;
          setUser({
            ...user,
            role: user.user_metadata?.user_type || 'patient'
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

        // Only update user state, don't toggle loading for auth state changes
        // Loading should only be true during initial load
        if (session?.user) {
          const { user } = session;
          const newUser = {
            ...user,
            role: user.user_metadata?.user_type || 'patient'
          };
          
          // Only update if user data actually changed
          setUser(prevUser => {
            if (!prevUser || prevUser.id !== newUser.id || prevUser.role !== newUser.role) {
              return newUser;
            }
            return prevUser;
          });
        } else {
          // Only set to null if we previously had a user
          setUser(prevUser => prevUser ? null : prevUser);
        }

        // Only set loading to false if it's still true (initial load)
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