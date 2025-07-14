import { Search, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../client";

export default function Navbar() {
  const [userData, setUserData] = useState({
    name: "User",
    id: "----",
    userType: "----",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Comprehensive search items based on user role with accurate paths
  const getSearchItems = (userType) => {
    const baseItems = [
      {
        title: "Profile",
        path: "/home/profile",
        description: "View and edit your profile",
        category: "Account"
      },
      {
        title: "Notifications",
        path: "/home/notifications",
        description: "View your notifications",
        category: "Account"
      },
    ];

    switch (userType.toLowerCase()) {
      case "patient":
        return [
          {
            title: "Dashboard",
            path: "/home",
            description: "Patient dashboard and overview",
            category: "Navigation",
            keywords: ["home", "dashboard", "main", "overview"]
          },
          {
            title: "Your Health",
            path: "/home/health",
            description: "Health overview and insights",
            category: "Health",
            keywords: ["health", "overview", "insights", "wellness"]
          },
          {
            title: "Health Tracking",
            path: "/home/health/tracking",
            description: "Track your health metrics and vital signs",
            category: "Health",
            keywords: ["track", "tracking", "metrics", "vitals", "monitor", "measurements"]
          },
          {
            title: "Health Records",
            path: "/home/health/records",
            description: "View your medical records and history",
            category: "Health",
            keywords: ["records", "medical", "history", "documents", "files"]
          },
          {
            title: "Appointments",
            path: "/home/appointments",
            description: "Schedule and manage your appointments",
            category: "Healthcare",
            keywords: ["appointments", "schedule", "booking", "meetings", "consultations"]
          },
          {
            title: "Connections",
            path: "/home/connections",
            description: "Connect with medical professionals",
            category: "Network",
            keywords: ["connections", "doctors", "professionals", "network", "contacts"]
          },
          {
            title: "Profile",
            path: "/home/profile",
            description: "View and edit your profile information",
            category: "Account",
            keywords: ["profile", "account", "settings", "personal", "information"]
          },
          {
            title: "Notifications",
            path: "/home/notifications",
            description: "View your notifications and alerts",
            category: "Account",
            keywords: ["notifications", "alerts", "messages", "updates"]
          },
        ];

      case "doctor":
        return [
          {
            title: "Dashboard",
            path: "/doctor",
            description: "Doctor dashboard and overview",
            category: "Navigation",
            keywords: ["home", "dashboard", "main", "overview"]
          },
          {
            title: "Patients",
            path: "/doctor/patients",
            description: "Manage and view your patients",
            category: "Patient Care",
            keywords: ["patients", "manage", "list", "cases"]
          },
          {
            title: "Patient Appointments",
            path: "/doctor/patients/appointments",
            description: "View and manage patient appointments",
            category: "Scheduling",
            keywords: ["appointments", "schedule", "calendar", "meetings", "consultations"]
          },
          {
            title: "Patient Reports",
            path: "/doctor/patients/reports",
            description: "Patient reports and analytics",
            category: "Analytics",
            keywords: ["reports", "analytics", "statistics", "data", "insights"]
          },
          {
            title: "Professional Connections",
            path: "/doctor/connections",
            description: "Connect with other professionals",
            category: "Network",
            keywords: ["connections", "professionals", "network", "colleagues", "contacts"]
          },
          {
            title: "Profile",
            path: "/doctor/profile",
            description: "View and edit your professional profile",
            category: "Account",
            keywords: ["profile", "account", "settings", "personal", "information"]
          },
          {
            title: "Notifications",
            path: "/doctor/notifications",
            description: "View your notifications and alerts",
            category: "Account",
            keywords: ["notifications", "alerts", "messages", "updates"]
          },
        ];

      case "admin":
        return [
          {
            title: "Admin Dashboard",
            path: "/admin/home",
            description: "Administrative dashboard and overview",
            category: "Navigation",
            keywords: ["home", "dashboard", "main", "overview", "admin"]
          },
          {
            title: "Manage Patients",
            path: "/admin/patients",
            description: "Manage all patients in the system",
            category: "User Management",
            keywords: ["patients", "manage", "users", "administration"]
          },
          {
            title: "Manage Professionals",
            path: "/admin/professionals",
            description: "Manage medical professionals and staff",
            category: "User Management",
            keywords: ["professionals", "doctors", "staff", "medical", "manage"]
          },
          {
            title: "Doctor Approvals",
            path: "/admin/doctor-approvals",
            description: "Review and approve doctor applications",
            category: "Approvals",
            keywords: ["approvals", "doctor", "applications", "review", "verify"]
          },
          {
            title: "System Reports",
            path: "/admin/reports",
            description: "System reports and analytics",
            category: "Analytics",
            keywords: ["reports", "analytics", "statistics", "data", "insights", "system"]
          },
          {
            title: "Support Management",
            path: "/admin/support",
            description: "Customer support and help desk",
            category: "Support",
            keywords: ["support", "help", "customer", "tickets", "assistance"]
          },
          {
            title: "Bug Reports",
            path: "/admin/bugs",
            description: "Bug reports and technical issues",
            category: "Technical",
            keywords: ["bugs", "issues", "technical", "problems", "errors"]
          },
          {
            title: "Profile",
            path: "/admin/profile",
            description: "View and edit your admin profile",
            category: "Account",
            keywords: ["profile", "account", "settings", "personal", "information"]
          },
        ];

      default:
        return baseItems;
    }
  };

  // Function to fetch user data
  const getUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let profile = {};
      let userType = "";

      // Check patients table first - using patient_id instead of user_id
      const { data: patientData } = await supabase
        .from("patients")
        .select("*")
        .eq("patient_id", user.id)
        .single();

      if (patientData) {
        profile = patientData;
        userType = "patient";
      } else {
        // Check medicalprofessionals table - using med_id instead of user_id
        const { data: professionalData } = await supabase
          .from("medicalprofessionals")
          .select("*")
          .eq("med_id", user.id)
          .single();

        if (professionalData) {
          profile = professionalData;
          userType = "doctor";
        } else {
          // Check admin table - assuming admin uses user_id
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

      // Extract name based on table structure
      let initialName = "";
      if (userType === "admin") {
        // Admin table uses full_name
        initialName = profile.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
      } else {
        // Patients and medicalprofessionals tables use first_name
        initialName = profile.first_name || user.user_metadata?.first_name || user.email?.split("@")[0] || "User";
      }

      // Fallback to user metadata if no profile found
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

      // Fallback to user metadata on error
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

  // Initial load
  useEffect(() => {
    getUserData();
  }, []);

  // Listen for profile updates via custom events
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

  // Listen for database changes using Supabase realtime
  useEffect(() => {
    const setupRealtimeSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to changes in the patients table - using patient_id
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

      // Subscribe to changes in the medicalprofessionals table - using med_id
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

      // Subscribe to changes in the admin table - assuming admin uses user_id
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

  // Refresh data when window regains focus (backup method)
  useEffect(() => {
    const handleFocus = () => {
      getUserData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Enhanced search functionality with multiple matching criteria
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    const searchItems = getSearchItems(userData.userType);
    const query = searchQuery.toLowerCase().trim();

    // Enhanced filtering with multiple criteria
    const filteredResults = searchItems.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(query);
      const descriptionMatch = item.description.toLowerCase().includes(query);
      const categoryMatch = item.category.toLowerCase().includes(query);
      const keywordMatch = item.keywords?.some(keyword =>
        keyword.toLowerCase().includes(query)
      );

      return titleMatch || descriptionMatch || categoryMatch || keywordMatch;
    });

    // Sort results by relevance
    const sortedResults = filteredResults.sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();

      // Prioritize exact matches in title
      if (aTitle.includes(query) && !bTitle.includes(query)) return -1;
      if (!aTitle.includes(query) && bTitle.includes(query)) return 1;

      // Then prioritize title matches over description matches
      if (aTitle.startsWith(query) && !bTitle.startsWith(query)) return -1;
      if (!aTitle.startsWith(query) && bTitle.startsWith(query)) return 1;

      return 0;
    });

    setSearchResults(sortedResults);
    setShowDropdown(true);
    setIsLoading(false);
  }, [searchQuery, userData.userType]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchItemClick = (path) => {
    try {
      navigate(path);
      setSearchQuery("");
      setShowDropdown(false);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSearchItemClick(searchResults[0].path);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  // Keyboard navigation for search results
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      clearSearch();
    }
  };

  const displayName = userData.name;

  return (
    <nav className="h-16 bg-mySidebar shadow-md px-8 py-6 flex items-center justify-between">
      {/* Enhanced Search bar */}
      <div className="relative w-full max-w-sm" ref={searchRef}>
        <form onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder={`Search...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-2 pr-20 rounded-2xl bg-white text-gray-800 border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all duration-200"
            autoComplete="off"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Search className="text-mySidebar w-5 h-5" />
          </div>
        </form>

        {/* Enhanced Search dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="w-4 h-4 border-2 border-t-mySidebar border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="py-2">
                {searchResults.map((item, index) => (
                  <button
                    key={`${item.path}-${index}`}
                    onClick={() => handleSearchItemClick(item.path)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors border-l-4 border-transparent hover:border-indigo-400 ${location.pathname === item.path ? 'bg-indigo-50 border-indigo-400' : ''
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 flex items-center">
                          {item.title}
                          {location.pathname === item.path && (
                            <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">{item.description}</div>
                      </div>
                      <div className="text-xs text-gray-400 ml-2">
                        {item.category}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <div className="mb-2">No results found for "{searchQuery}"</div>
                <div className="text-xs text-gray-400">
                  Try searching for features like "profile", "appointments", or "health"
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User info section */}
      <div className="flex items-center space-x-3 ml-6">
        <div className="flex flex-col leading-tight text-right">
          <span className="text-white font-medium">Hi, {displayName}!</span>
          <span className="text-sm text-white">
            ID: {userData.id} •
            <span className="bg-indigo-500 px-1.5 py-0.5 rounded-full ml-1">
              {userData.userType}
            </span>
          </span>
        </div>
        <div className="relative">
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
              userData.name
            )}&background=c7d2fe&color=3730a3`}
            alt="User Avatar"
            className="w-10 h-10 rounded-full border-2 border-indigo-300 hover:border-indigo-400 transition-colors"
          />
        </div>
      </div>
    </nav>
  );
}