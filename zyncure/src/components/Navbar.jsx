import { useState, useEffect } from "react";
import { supabase } from "../client";

// Import the SearchBar component
import SearchBar from "./SearchBar";

export default function Navbar() {
  const [userData, setUserData] = useState({
    name: "User",
    id: "----",
    userType: "----",
  });

  const getUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let profile = {};
      let userType = "";

      const { data: patientData } = await supabase
        .from("patients")
        .select("*")
        .eq("patient_id", user.id)
        .single();

      if (patientData) {
        profile = patientData;
        userType = "patient";
      } else {
        const { data: professionalData } = await supabase
          .from("medicalprofessionals")
          .select("*")
          .eq("med_id", user.id)
          .single();

        if (professionalData) {
          profile = professionalData;
          userType = "doctor";
        } else {
          const { data: adminData } = await supabase
            .from("admin")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (adminData) {
            profile = adminData;
            userType = "admin";
          }
        }
      }

      let initialName = "";
      if (userType === "admin") {
        initialName = profile.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
      } else {
        initialName = profile.first_name || user.user_metadata?.first_name || user.email?.split("@")[0] || "User";
      }

      if (!profile.patient_id && !profile.med_id && !profile.user_id) {
        userType = user.user_metadata?.user_type || user.user_metadata?.role || "User";
        initialName = user.user_metadata?.first_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
      }

      const capitalizedUserType = userType.charAt(0).toUpperCase() + userType.slice(1).toLowerCase();

      setUserData({
        name: initialName,
        id: user.id ? user.id.substring(0, 4) : "----",
        userType: capitalizedUserType,
      });
    } catch (error) {
      console.error("Error fetching user data:", error);

      const { data: { user } } = await supabase.auth.getUser();
      const fallbackUserType = user?.user_metadata?.user_type || user?.user_metadata?.role || "User";
      const fallbackName = user?.user_metadata?.first_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

      setUserData({
        name: fallbackName,
        id: user?.id ? user.id.substring(0, 4) : "----",
        userType: fallbackUserType.charAt(0).toUpperCase() + fallbackUserType.slice(1).toLowerCase(),
      });
    }
  };

  useEffect(() => {
    getUserData();
  }, []);

  useEffect(() => {
    const handleProfileUpdate = (event) => {
      if (event.detail?.type === 'profile-updated') {
        getUserData();
      }
    };

    window.addEventListener('profile-updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    const setupRealtimeSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const patientsSubscription = supabase
        .channel('patients-changes')
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'patients',
            filter: `patient_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Patient data updated:', payload);
            getUserData();
          }
        )
        .subscribe();

      const professionalsSubscription = supabase
        .channel('professionals-changes')
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'medicalprofessionals',
            filter: `med_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Professional data updated:', payload);
            getUserData();
          }
        )
        .subscribe();

      const adminSubscription = supabase
        .channel('admin-changes')
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'admin',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Admin data updated:', payload);
            getUserData();
          }
        )
        .subscribe();

      return () => {
        patientsSubscription.unsubscribe();
        professionalsSubscription.unsubscribe();
        adminSubscription.unsubscribe();
      };
    };

    setupRealtimeSubscriptions();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      getUserData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const displayName = userData.name;

  return (
    <>
      {/* Main navbar */}
      <nav className="h-16 bg-mySidebar shadow-md px-4 md:px-8 py-6 flex items-center justify-between">
        {/* Desktop Search bar (now in its own component) */}
        <SearchBar userType={userData.userType} />

        {/* Mobile search button and user info */}
        <div className="flex items-center justify-between w-full md:w-auto">
          {/* User info section */}
          <div className="flex items-center space-x-2 md:space-x-3 ml-auto">
            {/* Desktop user info */}
            <div className="hidden md:flex flex-col leading-tight text-right">
              <span className="text-white font-medium">Hi, {displayName}!</span>
              <span className="text-sm text-white">
                ID: {userData.id} •
                <span className="bg-indigo-500 px-1.5 py-0.5 rounded-full ml-1">
                  {userData.userType}
                </span>
              </span>
            </div>

            {/* Mobile user info - condensed */}
            <div className="md:hidden flex flex-col leading-tight text-right">
              <span className="text-white font-medium text-sm">Hi, {displayName}!</span>
              <div className="flex items-center justify-end space-x-1 text-xs text-white">
                <span>ID: {userData.id}</span>
                <span className="bg-indigo-500 px-1 py-0.5 rounded text-xs">
                  {userData.userType}
                </span>
              </div>
            </div>

            {/* Avatar */}
            <div className="relative">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                  userData.name
                )}&background=c7d2fe&color=3730a3`}
                alt="User Avatar"
                className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-indigo-300 hover:border-indigo-400 transition-colors"
              />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}