import { useState, useEffect } from 'react';
import { supabase } from '../client';
import { useLocation } from "react-router-dom";

export function useUser() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const fetchUserRole = async (userId, userMetadata) => {
      try {
        console.log('Fetching user role for:', userId, 'with metadata:', userMetadata);
        
        
        if (userMetadata?.user_type) {
          console.log('User type from metadata:', userMetadata.user_type);
          
          
          if (userMetadata.user_type === 'doctor') {
            try {
              const { data: doctorVerification, error: verificationError } = await supabase
                .from('doctor_verifications')
                .select('status, admin_notes')
                .eq('user_id', userId)
                .maybeSingle(); 

              if (verificationError) {
                console.error('Error fetching doctor verification:', verificationError);
                
                return {
                  role: 'doctor',
                  user_type: 'doctor',
                  verification_status: 'no_record',
                  rejection_reason: null,
                  is_verified: false,
                  status: 'unverified'
                };
              }

              if (doctorVerification) {
                console.log('Doctor verification found:', doctorVerification);
                return {
                  role: 'doctor',
                  user_type: 'doctor',
                  verification_status: doctorVerification.status || 'pending',
                  rejection_reason: doctorVerification.admin_notes,
                  is_verified: doctorVerification.status === 'approved',
                  status: doctorVerification.status === 'approved' ? 'verified' : 'unverified'
                };
              } else {
               
                console.log('Doctor has no verification record - should show modal');
                return {
                  role: 'doctor',
                  user_type: 'doctor',
                  verification_status: 'no_record',
                  rejection_reason: null,
                  is_verified: false,
                  status: 'unverified'
                };
              }
            } catch (error) {
              console.error('Error in doctor verification check:', error);
              return {
                role: 'doctor',
                user_type: 'doctor',
                verification_status: 'no_record',
                rejection_reason: null,
                is_verified: false,
                status: 'unverified'
              };
            }
          }
          

          return { 
            role: userMetadata.user_type,
            user_type: userMetadata.user_type,
            is_verified: true,
            verification_status: 'approved',
            status: 'verified'
          };
        }

      
        try {
          const { data: adminData, error: adminError } = await supabase
            .from('admin')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          // If admin record exists and is active -- return admin role
          if (!adminError && adminData && adminData.is_active) {
            console.log('User is admin:', adminData);
            return { 
              role: 'admin',
              user_type: 'admin',
              is_verified: true,
              verification_status: 'approved',
              status: 'verified'
            };
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          
        }

      
        try {
          const { data: doctorVerification, error: verificationError } = await supabase
            .from('doctor_verifications')
            .select('status, admin_notes')
            .eq('user_id', userId)
            .maybeSingle();

          if (!verificationError && doctorVerification) {
            console.log('User is doctor with verification record:', doctorVerification);
            return {
              role: 'doctor',
              user_type: 'doctor',
              verification_status: doctorVerification.status || 'pending',
              rejection_reason: doctorVerification.admin_notes,
              is_verified: doctorVerification.status === 'approved',
              status: doctorVerification.status === 'approved' ? 'verified' : 'unverified'
            };
          }
        } catch (error) {
          console.error('Error checking doctor verification:', error);
         
        }

        
        try {
          const { data: medicalProfessional, error: medicalError } = await supabase
            .from('medicalprofessionals')
            .select('*')
            .eq('med_id', userId)
            .maybeSingle();

          if (!medicalError && medicalProfessional) {
            console.log('User is medical professional (legacy):', medicalProfessional);
         
            const { data: existingVerification } = await supabase
              .from('doctor_verifications')
              .select('status, admin_notes')
              .eq('user_id', userId)
              .maybeSingle();

            if (existingVerification) {
              console.log('Legacy doctor with verification record:', existingVerification);
              return {
                role: 'doctor',
                user_type: 'doctor',
                verification_status: existingVerification.status || 'pending',
                rejection_reason: existingVerification.admin_notes,
                is_verified: existingVerification.status === 'approved',
                status: existingVerification.status === 'approved' ? 'verified' : 'unverified'
              };
            } else {
             
              console.log('Legacy doctor with no verification - should show modal');
              return {
                role: 'doctor',
                user_type: 'doctor',
                verification_status: 'no_record',
                rejection_reason: null,
                is_verified: false,
                status: 'unverified'
              };
            }
          }
        } catch (error) {
          console.error('Error checking medical professionals:', error);
       
        }

      
        try {
          const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .eq('patient_id', userId)
            .maybeSingle();

          if (!patientError && patient) {
            console.log('User is patient:', patient);
            return { 
              role: 'patient',
              user_type: 'patient',
              is_verified: true,
              verification_status: 'approved',
              status: 'verified'
            };
          }
        } catch (error) {
          console.error('Error checking patients table:', error);
         
        }

      
        console.log('User not found in role tables, defaulting to patient');
        return { 
          role: 'patient',
          user_type: 'patient',
          is_verified: true,
          verification_status: 'approved',
          status: 'verified'
        };
      } catch (error) {
        console.error('Error fetching user role:', error);
        return { 
          role: 'patient',
          user_type: 'patient',
          is_verified: true,
          verification_status: 'approved',
          status: 'verified'
        }; 
      }
    };

    const initializeUser = async () => {
      try {
       
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          if (mounted) setIsLoading(false);
          return;
        }

        if (session?.user && mounted) {
          const { user } = session;
          
          console.log('Initializing user:', user.id, user.email);
          console.log('User metadata:', user.user_metadata);
          
        
          const userRoleData = await fetchUserRole(user.id, user.user_metadata);
          console.log('Determined user role data:', userRoleData);
          
          const finalUser = {
            ...user,
            role: userRoleData.role,
            user_type: userRoleData.user_type,
            verification_status: userRoleData.verification_status,
            rejection_reason: userRoleData.rejection_reason,
            is_verified: userRoleData.is_verified,
            status: userRoleData.status
          };

          console.log('Final user object:', finalUser);
          setUser(finalUser);
        } else {
          console.log('No session found');
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeUser();

  
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "USER_UPDATED" && location.pathname === "/reset-password") {
          return;
        }

        if (session?.user) {
          const { user } = session;

          console.log('User metadata on auth change:', user.user_metadata);
          
          const userRoleData = await fetchUserRole(user.id, user.user_metadata);
          console.log('Auth change - user role data:', userRoleData);
          
          const newUser = {
            ...user,
            role: userRoleData.role,
            user_type: userRoleData.user_type,
            verification_status: userRoleData.verification_status,
            rejection_reason: userRoleData.rejection_reason,
            is_verified: userRoleData.is_verified,
            status: userRoleData.status
          };

          console.log('Setting user with role and verification:', newUser.role, newUser.verification_status);

          setUser(prevUser => {
            if (!prevUser || 
                prevUser.id !== newUser.id || 
                prevUser.role !== newUser.role ||
                prevUser.verification_status !== newUser.verification_status ||
                prevUser.is_verified !== newUser.is_verified) {
              console.log('User state changed, updating');
              return newUser;
            }
            return prevUser;
          });
        } else {
          console.log('No user in session, clearing user state');
          setUser(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return { user, isLoading };
}