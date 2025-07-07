import { Search, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Define search items based on user role
  const getSearchItems = (userType) => {
    const baseItems = [
      { title: "Profile", path: "profile", description: "View and edit your profile" },
      { title: "Notifications", path: "notifications", description: "View your notifications" },
    ];

    switch (userType.toLowerCase()) {
      case "patient":
        return [
          { title: "Home", path: "/home", description: "Dashboard and overview" },
          { title: "Your Health", path: "/home/health", description: "Health overview and insights" },
          { title: "Health Tracking", path: "/home/health/tracking", description: "Track your health metrics" },
          { title: "Health Records", path: "/home/health/records", description: "View your medical records" },
          { title: "Appointments", path: "/home/appointments", description: "Manage your appointments" },
          { title: "Connections", path: "/home/connections", description: "Connect with medical professionals" },
          { title: "Profile", path: "/home/profile", description: "View and edit your profile" },
          { title: "Notifications", path: "/home/notifications", description: "View your notifications" },
        ];

      case "doctor":
        return [
          { title: "Home", path: "/doctor", description: "Doctor dashboard" },
          { title: "Patients", path: "/doctor/patients", description: "Manage your patients" },
          { title: "Appointments", path: "/doctor/patients/appointments", description: "View patient appointments" },
          { title: "Reports", path: "/doctor/patients/reports", description: "Patient reports and analytics" },
          { title: "Connections", path: "/doctor/connections", description: "Professional connections" },
          { title: "Profile", path: "/doctor/profile", description: "View and edit your profile" },
          { title: "Notifications", path: "/doctor/notifications", description: "View your notifications" },
        ];

      case "admin":
        return [
          { title: "Home", path: "/admin/home", description: "Admin dashboard" },
          { title: "Patients", path: "/admin/patients", description: "Manage all patients" },
          { title: "Professionals", path: "/admin/professionals", description: "Manage medical professionals" },
          { title: "Reports", path: "/admin/reports", description: "System reports and analytics" },
          { title: "Support", path: "/admin/support", description: "Customer support management" },
          { title: "Bugs", path: "/admin/bugs", description: "Bug reports and issues" },
          { title: "Profile", path: "/admin/profile", description: "View and edit your profile" },
        ];

      default:
        return baseItems;
    }
  };

  useEffect(() => {
    const getUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let profile = {};
        let { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileData) {
          profile = profileData;
        } else {
          profile = user.user_metadata || {};
        }

        const initialName =
          profile.first_name ||
          user.user_metadata?.first_name ||
          user.email?.split("@")[0] ||
          "User";

        const userType =
          profile.user_type ||
          profile.role ||
          user.user_metadata?.user_type ||
          user.user_metadata?.role ||
          "User";

        const capitalizedUserType = userType.charAt(0).toUpperCase() + userType.slice(1).toLowerCase();

        setUserData({
          name: initialName,
          id: user.id ? user.id.substring(0, 4) : "----",
          userType: capitalizedUserType,
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    getUserData();
  }, []);

  // Handle search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    const searchItems = getSearchItems(userData.userType);

    // Filter items based on search query
    const filteredResults = searchItems.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setSearchResults(filteredResults);
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
    navigate(path);
    setSearchQuery("");
    setShowDropdown(false);
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

  const firstName = userData.name.includes(" ")
    ? userData.name.split(" ")[0]
    : userData.name;

  return (
    <nav className="h-16 bg-mySidebar shadow-md px-8 py-6 flex items-center justify-between">
      {/* Search bar */}
      <div className="relative w-full max-w-sm" ref={searchRef}>
        <form onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Search pages, features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pr-20 rounded-2xl bg-white text-gray-800 border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Search className="text-mySidebar w-5 h-5" />
          </div>
        </form>

        {/* Search dropdown */}
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
              <ul className="py-2">
                {searchResults.map((item, index) => (
                  <li key={index}>
                    <button
                      onClick={() => handleSearchItemClick(item.path)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
                    >
                      <div className="font-medium text-gray-800">{item.title}</div>
                      <div className="text-sm text-gray-500 mt-1">{item.description}</div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No results found for "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3 ml-6">
        <div className="flex flex-col leading-tight text-right">
          <span className="text-white font-medium">Hi, {firstName}!</span>
          <span className="text-sm text-white">ID: {userData.id} • <span className="bg-indigo-500 px-1.5 rounded-full">{userData.userType}</span></span>
        </div>
        <div className="relative">
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
              userData.name
            )}&background=c7d2fe&color=3730a3`}
            alt="User Avatar"
            className="w-10 h-10 rounded-full border-2 border-indigo-300"
          />
        </div>
      </div>
    </nav>
  );
}