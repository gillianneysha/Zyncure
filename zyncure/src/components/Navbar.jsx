import { Search } from "lucide-react";
import { useState, useEffect } from 'react';
import { supabase } from "../client"; // Adjust the import path as needed

export default function Navbar() {
  const [userData, setUserData] = useState({
    name: 'User',
    id: '----'
  });

  useEffect(() => {
    // Function to get user data
    const getUserData = async () => {
      try {
        // Get token from session storage
        const tokenStr = sessionStorage.getItem('token');
        if (!tokenStr) return;
        
        const token = JSON.parse(tokenStr);
        
        // Check if we have a session with user data
        if (token?.session?.user) {
          const { user } = token.session;
          
          // First, use what we have in the session
          const initialName = user.user_metadata?.full_name || 
                              user.user_metadata?.name || 
                              user.email?.split('@')[0] || 
                              'User';
          
          setUserData({
            name: initialName,
            id: user.id.substring(0, 4) // Just showing first 4 chars of UUID for brevity
          });
          
          // Then, try to get more detailed user info from database if needed
          // This assumes you have a profiles table linked to auth.users
          // Remove or adjust this part if you don't have such a setup
          const { data, error } = await supabase
            .from('profiles') // Change to your actual table name if different
            .select('full_name, display_name')
            .eq('id', user.id)
            .single();
            
          if (data && !error) {
            setUserData(prevState => ({
              ...prevState,
              name: data.full_name || data.display_name || prevState.name
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    getUserData();
  }, []);

  // Get first name only if there are multiple names
  const firstName = userData.name.includes(' ') 
    ? userData.name.split(' ')[0] 
    : userData.name;

  return (
    <nav className="h-16 bg-mySidebar shadow-md px-6 flex items-center justify-between">
      {/* Search bar */}
      <div className="relative w-full max-w-sm">
        <input
          type="text"
          placeholder="Search..."
          className="w-full px-4 py-2 pr-10 rounded-2xl bg-white text-gray-800 border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-mySidebar w-5 h-5" />
      </div>

      {/* User greeting and avatar */}
      <div className="flex items-center space-x-3 ml-6">
        <div className="flex flex-col leading-tight text-right">
          <span className="text-white font-medium">Hi, {firstName}!</span>
          <span className="text-sm text-white">ID: {userData.id}</span>
        </div>
        <img
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=c7d2fe&color=3730a3`}
          alt="User Avatar"
          className="w-10 h-10 rounded-full border-2 border-indigo-300"
        />
      </div>
    </nav>
  );
}