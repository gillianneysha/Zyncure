import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../client"; 


export default function Navbar() {
  const [userData, setUserData] = useState({
    name: "User",
    id: "----",
    userType: "----",
  });

  useEffect(() => {
    const getUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Try to get profile info from Supabase profiles table
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

        // Capitalize first letter of user type
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

  const firstName = userData.name.includes(" ")
    ? userData.name.split(" ")[0]
    : userData.name;

  return (
    <nav className="h-16 bg-mySidebar shadow-md px-8 py-6 flex items-center justify-between">
      {/* Search bar */}
      <div className="relative w-full max-w-sm">
        <input
          type="text"
          placeholder="Search..."
          className="w-full px-4 py-2 pr-10 rounded-2xl bg-white text-gray-800 border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-mySidebar w-5 h-5" />
      </div>
   

      
        <div className="flex items-center space-x-3 ml-6">
        <div className="flex flex-col leading-tight text-right">
          <span className="text-white font-medium">Hi, {firstName}!</span>          
          <span className="text-sm text-white">ID: {userData.id} • <span className="bg-indigo-500 px-1.5  rounded-full">{userData.userType}</span></span>
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