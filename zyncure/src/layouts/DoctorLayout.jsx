import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar, { SidebarItem, SidebarSubItem } from '../components/Sidebar';
import Navbar from '../components/Navbar';
import DoctorVerificationModal from '../components/DoctorVerificationModal';
import { CalendarDays, Users, Bell, Heart, House, User, FileText, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { supabase } from '../client';
import { ReportModal } from '../components/ReportModal';

export default function DoctorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useUser();
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isActive = (path) => location.pathname === `/doctor${path}`;
  const isHealthActive = location.pathname.includes('/doctor/patients');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Fixed: Use correct property names from useUser hook
  const verificationStatus = user?.verification_status;
  const isVerified = user?.is_verified;
  const rejectionReason = user?.rejection_reason;

  // Show verification modal only for doctors with no_record or rejected status
  const shouldShowVerificationModal = user?.role === 'doctor' &&
    (verificationStatus === 'no_record' || verificationStatus === 'rejected');

  // Check if doctor features should be limited (frozen state)
  // Only doctors with 'approved' or 'verified' status should have full access
  const isDoctorUnverified = user?.role === 'doctor' &&
    verificationStatus !== 'approved' &&
    verificationStatus !== 'verified' &&
    !isVerified;

  // Debug logging
  useEffect(() => {
    if (user) {
      console.log('DoctorLayout - User ID:', user.id);
      console.log('DoctorLayout - User data:', {
        role: user.role,
        verification_status: user.verification_status,
        is_verified: user.is_verified,
        rejection_reason: user.rejection_reason
      });
      console.log('DoctorLayout - Should show modal:', shouldShowVerificationModal);
      console.log('DoctorLayout - Is doctor unverified:', isDoctorUnverified);
    }
  }, [user, shouldShowVerificationModal, isDoctorUnverified]);

  const handleVerificationSubmit = async ({ licenseNumber, licenseFile }) => {
    setSubmissionLoading(true);
    setErrorMessage('');

    try {
      // Validate inputs
      if (!licenseNumber || !licenseFile) {
        throw new Error('License number and file are required');
      }

      if (!user?.id) {
        throw new Error('User ID not found');
      }

      // Check file size (limit to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (licenseFile.size > maxSize) {
        throw new Error('File size must be less than 10MB');
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(licenseFile.type)) {
        throw new Error('File must be a JPEG, PNG, or PDF');
      }

      console.log('Starting verification submission...', {
        licenseNumber,
        fileSize: licenseFile.size,
        fileType: licenseFile.type,
        userId: user.id
      });

      // Upload license file to storage first
      const fileExt = licenseFile.name.split('.').pop();
      const fileName = `${user.id}_license_${Date.now()}.${fileExt}`;

      console.log('Uploading file:', fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('doctor-licenses')
        .upload(fileName, licenseFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      console.log('File uploaded successfully:', uploadData);

      // Check if user already has a verification record using maybeSingle()
      console.log('Checking for existing verification record...');
      const { data: existingVerification, error: selectError } = await supabase
        .from('doctor_verifications')
        .select('id, status, admin_notes')
        .eq('user_id', user.id)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking existing verification:', selectError);
        throw new Error(`Database access error: ${selectError.message}`);
      }

      console.log('Existing verification:', existingVerification);

      let result;
      if (existingVerification) {
        console.log('Updating existing verification record...');
        const { data: updateData, error: updateError } = await supabase
          .from('doctor_verifications')
          .update({
            license_number: licenseNumber,
            license_file_url: fileName,
            status: 'pending',
            admin_notes: null, // Clear previous rejection notes
            updated_at: new Date().toISOString()
          })
          .eq('id', existingVerification.id) // Use the record ID instead of user_id
          .select('id, status, admin_notes');


        if (updateError) {
          console.error('Update error:', updateError);
          throw new Error(`Database update error: ${updateError.message}`);
        }

        result = updateData;
        console.log('Update successful:', result);
      } else {
        // Insert new record
        console.log('Inserting new verification record...');
        const { data: insertData, error: insertError } = await supabase
          .from('doctor_verifications')
          .insert({
            user_id: user.id,
            license_number: licenseNumber,
            license_file_url: fileName,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id, status, admin_notes');


        if (insertError) {
          console.error('Insert error:', insertError);
          throw new Error(`Database insert error: ${insertError.message}`);
        }


        result = insertData;
        console.log('Insert successful:', result);
      }


      console.log('Verification record created/updated:', result);

      setVerificationModalOpen(false);
      alert('Verification submitted successfully! We will review your documents and notify you of the result.');

      setTimeout(() => {
        window.location.reload();
      }, 1000);


    } catch (error) {
      console.error('Error submitting verification:', error);

      // Clean up uploaded file if database operation failed
      if (error.message.includes('Database')) {
        try {
          const fileExt = licenseFile.name.split('.').pop();
          const fileName = `${user.id}_license_${Date.now()}.${fileExt}`;
          await supabase.storage
            .from('doctor-licenses')
            .remove([fileName]);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }


      const errorMsg = error.message || 'An unexpected error occurred. Please try again.';
      setErrorMessage(errorMsg);

      // Show error message
      if (error.message.includes('File upload failed')) {
        alert('Failed to upload file. Please check your internet connection and try again.');
      } else if (error.message.includes('Database')) {
        alert('Database error occurred. Please contact support if the problem persists.');
      } else {
        alert(errorMsg);
      }
    } finally {
      setSubmissionLoading(false);
    }
  };


  // Auto-open verification modal for unverified doctors
  useEffect(() => {
    console.log('Modal effect - shouldShowVerificationModal:', shouldShowVerificationModal);
    console.log('Modal effect - verificationModalOpen:', verificationModalOpen);


    if (shouldShowVerificationModal && !verificationModalOpen) {
      console.log('Opening verification modal');
      setVerificationModalOpen(true);
    }
  }, [shouldShowVerificationModal, verificationModalOpen]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }


  // Verification status component
  const VerificationStatusBanner = () => {
    // Don't show banner for verified doctors
    if (user?.role !== 'doctor' || isVerified || verificationStatus === 'approved' || verificationStatus === 'verified') {
      return null;
    }


    const getStatusConfig = () => {
      switch (verificationStatus) {
        case 'pending':
          return {
            icon: <Clock className="w-5 h-5 text-yellow-600" />,
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200',
            textColor: 'text-yellow-800',
            message: 'Your verification is pending admin approval. Some features are temporarily unavailable.',
            showResubmit: false
          };
        case 'rejected':
          return {
            icon: <XCircle className="w-5 h-5 text-red-600" />,
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            textColor: 'text-red-800',
            message: 'Your verification was rejected. Please resubmit your documents.',
            showResubmit: true
          };
        case 'no_record':
        default:
          return {
            icon: <Clock className="w-5 h-5 text-gray-600" />,
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            textColor: 'text-gray-800',
            message: 'Please complete your verification to access all features.',
            showResubmit: false
          };
      }
    };


    const config = getStatusConfig();


    return (
      <div className={`${config.bgColor} ${config.borderColor} border-l-4 p-4 mb-4`}>
        <div className="flex items-center">
          {config.icon}
          <div className="ml-3">
            <p className={`text-sm font-medium ${config.textColor}`}>
              {config.message}
            </p>
            {config.showResubmit && (
              <button
                onClick={() => setVerificationModalOpen(true)}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Resubmit Verification
              </button>
            )}
            {rejectionReason && (
              <p className="mt-1 text-sm text-red-600">
                Reason: {rejectionReason}
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
          onClick={() => navigate('/doctor/home')}
        />
        <SidebarItem
          icon={<User size={20} />}
          text="Profile"
          active={isActive('/profile')}
          onClick={() => navigate('/doctor/profile')}
        />
        <SidebarItem
          icon={<Heart size={20} />}
          text="Patients"
          active={isHealthActive}
          disabled={isDoctorUnverified}
        >
          <SidebarSubItem
            icon={<CalendarDays size={20} />}
            text="Appointments"
            active={isActive('/patients/appointments')}
            onClick={() => !isDoctorUnverified && navigate('/doctor/patients/appointments')}
            disabled={isDoctorUnverified}
          />
          <SidebarSubItem
            icon={<FileText size={20} />}
            text="Reports"
            active={isActive('/patients/reports')}
            onClick={() => !isDoctorUnverified && navigate('/doctor/patients/reports')}
            disabled={isDoctorUnverified}
          />
        </SidebarItem>
        <SidebarItem
          icon={<Users size={20} />}
          text="Connections"
          active={isActive('/connections')}
          onClick={() => !isDoctorUnverified && navigate('/doctor/connections')}
          disabled={isDoctorUnverified}
        />
        <SidebarItem
          icon={<Bell size={20} />}
          text="Notifications"
          active={isActive('/notifications')}
          onClick={() => navigate('/doctor/notifications')}
          alert
        />
        <SidebarItem
          icon={<MessageSquare size={20} />}
          text="Need Help?"
          onClick={() => setIsReportModalOpen(true)}
          
        />
      </Sidebar>


      {/* Main Content Area */}
      <div className="flex flex-col flex-1">
        <Navbar />
        <main className="flex-1 w-full p-6 bg-mainBg text-gray-800">
          <VerificationStatusBanner />
          <Outlet />
        </main>
      </div>


      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        user={user} // Pass the user prop here
      />


      {/* Verification Modal */}
      <DoctorVerificationModal
        open={verificationModalOpen}
        onClose={() => {
          // Only allow closing if doctor has submitted verification (not no_record or rejected)
          if (verificationStatus !== 'no_record' && verificationStatus !== 'rejected') {
            setVerificationModalOpen(false);
          }
        }}
        onSubmit={handleVerificationSubmit}
        loading={submissionLoading}
        verificationStatus={verificationStatus}
        rejectionReason={rejectionReason}
        errorMessage={errorMessage}
      />
    </div>
  );
}