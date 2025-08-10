import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import Sidebar, { SidebarItem, SidebarSubItem } from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { CalendarDays, Users, Bell, Heart, House, User, ChartPie, Folders, MessageSquare, Lock } from 'lucide-react';
import { ReportModal } from '../components/ReportModal';
import PatientVerificationModal from '../components/PatientVerificationModal'; 
import { supabase } from '../client'; 

export default function PatientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(true);
  const [verificationError, setVerificationError] = useState('');
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [hasManuallyDismissedModal, setHasManuallyDismissedModal] = useState(false);

  const isActive = (path) => location.pathname === `/home${path}`;
  const isHealthActive = location.pathname.includes('/home/health');

  // Check if user verification is required for certain routes
  const requiresVerification = (path) => {
    const protectedRoutes = ['/connections', '/appointments'];
    return protectedRoutes.some(route => path.includes(route));
  };

  // Determine if patient is unverified (similar to doctor layout)
  const isPatientUnverified = !isVerified;

  // Check user verification status
  const checkVerificationStatus = async (user) => {
    if (!user) return false;

    try {
      // Check if user has been verified (you can store this in user metadata)
      const isUserVerified = user.user_metadata?.identity_verified === true;
      
      // Also check if there's an active verification timeout
      if (user.user_metadata?.verification_timeout_until) {
        const timeoutExpiry = new Date(user.user_metadata.verification_timeout_until);
        const now = new Date();
        
        if (now < timeoutExpiry) {
          // User is still in timeout period
          return false;
        }
      }

      return isUserVerified;
    } catch (error) {
      console.error('Error checking verification status:', error);
      return false;
    }
  };

  // Handle successful verification
// Handle successful verification
  const handleVerificationSuccess = async (userData) => {
    try {
      // Mark user as verified in their metadata
      await supabase.auth.updateUser({
        data: {
          identity_verified: true,
          verification_completed_at: new Date().toISOString()
        }
      });

      setIsVerified(true);
      setVerificationError('');
      setHasManuallyDismissedModal(false); // Reset so it doesn't show again automatically
      
      // Navigate to pending route if any
      if (pendingNavigation) {
        navigate(pendingNavigation);
        setPendingNavigation(null);
      }
    } catch (error) {
      console.error('Error updating verification status:', error);
    }
  };

  // Handle verification failure
  const handleVerificationFailed = (error) => {
    setVerificationError(error);
    setIsVerificationModalOpen(false);
    
    // Navigate away from protected route
    if (requiresVerification(location.pathname)) {
      navigate('/home');
    }
  };

  // Handle navigation to protected routes
  const handleProtectedNavigation = (path) => {
    if (!isVerified && requiresVerification(path)) {
      setPendingNavigation(path);
      setIsVerificationModalOpen(true);
    } else {
      navigate(path);
    }
  };

  // Show verification modal automatically if not verified (similar to doctor layout)
  const shouldShowVerificationModal = !isVerified;

  useEffect(() => {
    const getCurrentUser = async () => {
      setIsCheckingVerification(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user);
          const verified = await checkVerificationStatus(session.user);
          setIsVerified(verified);
          
          // If user is on a protected route but not verified, redirect them
          if (!verified && requiresVerification(location.pathname)) {
            navigate('/home');
          }
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      } finally {
        setIsCheckingVerification(false);
      }
    };

    getCurrentUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setCurrentUser(session.user);
          const verified = await checkVerificationStatus(session.user);
          setIsVerified(verified);
        } else {
          setCurrentUser(null);
          setIsVerified(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [location.pathname, navigate]);

  // Auto-show verification modal (similar to doctor layout)
  // Auto-show verification modal (similar to doctor layout)
  useEffect(() => {
    if (shouldShowVerificationModal && !isVerificationModalOpen && !hasManuallyDismissedModal && !isCheckingVerification) {
      setTimeout(() => {
        setIsVerificationModalOpen(true);
      }, 500); // Slightly longer delay to ensure user data is loaded
    }
  }, [shouldShowVerificationModal, isVerificationModalOpen, hasManuallyDismissedModal, isCheckingVerification]);

  // Show loading state while checking verification
  if (isCheckingVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#55A1A4]"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Verification Status Banner (similar to doctor layout)
  const VerificationStatusBanner = () => {
    if (isVerified) {
      return null;
    }

    return (
      <div className="bg-yellow-50 border-yellow-200 border-l-4 p-4 mb-4">
        <div className="flex items-center">
          <Lock className="w-5 h-5 text-yellow-600" />
          <div className="ml-3">
            <p className="text-sm font-medium text-yellow-800">
              Please complete identity verification to access all features.
            </p>
            <button
              onClick={() => {
                setIsVerificationModalOpen(true);
                setHasManuallyDismissedModal(false);
              }}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Complete Verification
            </button>
            {verificationError && (
              <p className="mt-1 text-sm text-red-600">
                Error: {verificationError}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar>
        <SidebarItem
          icon={<House size={20} />}
          text="Home"
          active={isActive('')}
          onClick={() => navigate('/home')}
        />
        <SidebarItem
          icon={<User size={20} />}
          text="Profile"
          active={isActive('/profile')}
          onClick={() => navigate('/home/profile')}
        />
        <SidebarItem
          icon={<Heart size={20} />}
          text="Your Health"
          active={isHealthActive}
        >
          <SidebarSubItem
            icon={<ChartPie size={20} />}
            text="Tracking"
            active={isActive('/health/tracking')}
            onClick={() => navigate('/home/health/tracking')}
          />
          <SidebarSubItem
            icon={<Folders size={20} />}
            text="Records"
            active={isActive('/health/records')}
            onClick={() => navigate('/home/health/records')}
          />
        </SidebarItem>
        
        {/* Protected Connections Tab - Now using disabled prop */}
        <SidebarItem
          icon={<Users size={20} />}
          text="Connections"
          active={isActive('/connections')}
          onClick={() => !isPatientUnverified && navigate('/home/connections')}
          disabled={isPatientUnverified}
        />
        
        <SidebarItem
          icon={<Bell size={20} />}
          text="Notifications"
          active={isActive('/notifications')}
          onClick={() => navigate('/home/notifications')}
        />
        
        {/* Protected Appointments Tab - Now using disabled prop */}
        <SidebarItem
          icon={<CalendarDays size={20} />}
          text="Appointments"
          active={isActive('/appointments')}
          onClick={() => !isPatientUnverified && navigate('/home/appointments')}
          disabled={isPatientUnverified}
        />

        <SidebarItem
          icon={<MessageSquare size={20} />}
          text="Need Help?"
          onClick={() => setIsReportModalOpen(true)}
        />
      </Sidebar>
      
      <div className="flex flex-col flex-1">
        <Navbar />
        <main className="flex-1 w-full p-6 bg-mainBg text-gray-800">
          <VerificationStatusBanner />
          <Outlet />
        </main>
      </div>
      
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        user={currentUser} 
      />
      
      <PatientVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => {
          setIsVerificationModalOpen(false);
          setHasManuallyDismissedModal(true);
          setPendingNavigation(null);
        }}
        onVerified={handleVerificationSuccess}
        onVerificationFailed={handleVerificationFailed}
        patientData={currentUser}
      />
    </div>
  );
}