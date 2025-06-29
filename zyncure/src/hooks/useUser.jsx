import { useState, useEffect } from 'react';
import { supabase } from '../client';

export function useUser() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchUserRole = async (userId) => {
      try {
        // First check if user is an admin
        const { data: adminData, error: adminError } = await supabase
          .from('admin')
          .select('*')
          .eq('user_id', userId)
          .single();

        // If admin record exists and is active, return admin role
        if (!adminError && adminData && adminData.is_active) {
          console.log('User is admin:', adminData);
          return 'admin';
        }

        // If not admin, check medicalprofessionals table
        const { data: medicalProfessional, error: medicalError } = await supabase
          .from('medicalprofessionals')
          .select('*')
          .eq('med_id', userId) // assuming med_id corresponds to auth user id
          .single();

        if (!medicalError && medicalProfessional) {
          console.log('User is medical professional:', medicalProfessional);
          return 'doctor'; // Changed from 'medical_professional' to 'doctor'
        }

        // If not admin or medical professional, check patients table
        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('patient_id', userId) // assuming patient_id corresponds to auth user id
          .single();

        if (!patientError && patient) {
          console.log('User is patient:', patient);
          return 'patient';
        }

        // If user exists in auth but not in any role tables, default to patient
        console.log('User not found in role tables, defaulting to patient');
        return 'patient';
      } catch (error) {
        console.error('Error fetching user role:', error);
        return 'patient'; // Default fallback
      }
    };

    const initializeUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          const { user } = session;
          console.log('Initializing user:', user.id, user.email);
          
          // Fetch role from admin, medicalprofessionals, then patients tables
          const userRole = await fetchUserRole(user.id);
          console.log('Determined user role:', userRole);
          
          setUser({
            ...user,
            role: userRole
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

        console.log('Auth state changed:', event, session?.user?.email);

        if (session?.user) {
          const { user } = session;
          const userRole = await fetchUserRole(user.id);
          const newUser = {
            ...user,
            role: userRole
          };

          console.log('Setting user with role:', newUser.role);

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