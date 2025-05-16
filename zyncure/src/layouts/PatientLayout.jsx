import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar, { SidebarItem } from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { CalendarDays, Users, Bell, Heart, House, User } from 'lucide-react';

export default function PatientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine which menu item is active based on the current path
  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen">
      <Sidebar>
        <SidebarItem 
          icon={<User size={20} />} 
          text="Profile" 
          active={isActive('/profile')}
          onClick={() => navigate('/profile')} 
        />
        <SidebarItem 
          icon={<House size={20} />} 
          text="Home" 
          active={isActive('/')}
          onClick={() => navigate('/')} 
        />
        <SidebarItem 
          icon={<Heart size={20} />} 
          text="Your Health" 
          active={isActive('/health')}
          onClick={() => navigate('/health')} 
        />
        <SidebarItem 
          icon={<Users size={20} />} 
          text="Connections" 
          active={isActive('/connections')}
          onClick={() => navigate('/connections')} 
        />
        <SidebarItem 
          icon={<Bell size={20} />} 
          text="Notifications" 
          active={isActive('/notifications')}
          onClick={() => navigate('/notifications')} 
          alert 
        />
        <SidebarItem 
          icon={<CalendarDays size={20} />} 
          text="Appointments" 
          active={isActive('/appointments')}
          onClick={() => navigate('/appointments')} 
          alert 
        />
      </Sidebar>

      <div className="flex flex-col flex-1">
        <Navbar />

        <main className="flex-1 w-full p-6 bg-gray-50 text-gray-800">
          <Outlet />
        </main>
      </div>
    </div>
  );
}