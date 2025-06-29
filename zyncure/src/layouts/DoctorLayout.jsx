import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar, { SidebarItem, SidebarSubItem } from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { CalendarDays, Users, Bell, Heart, House, User, FileText } from 'lucide-react';

export default function DoctorLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === `/doctor${path}`;
  const isHealthActive = location.pathname.includes('/doctor/patients');

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
        >
          <SidebarSubItem 
            icon={<CalendarDays size={20} />}
            text="Appointments" 
            active={isActive('/patients/appointments')}
            onClick={() => navigate('/doctor/patients/appointments')} 
          />
          <SidebarSubItem 
            icon={<FileText size={20} />}
            text="Reports"
            active={isActive('/patients/reports')}
            onClick={() => navigate('/doctor/patients/reports')} 
          />
        </SidebarItem>
        <SidebarItem 
          icon={<Users size={20} />} 
          text="Connections" 
          active={isActive('/connections')}
          onClick={() => navigate('/doctor/connections')} 
        />
        <SidebarItem 
          icon={<Bell size={20} />} 
          text="Notifications" 
          active={isActive('/notifications')}
          onClick={() => navigate('/doctor/notifications')} 
          alert 
        />
      </Sidebar>
      <div className="flex flex-col flex-1">
        <Navbar />

        <main className="flex-1 w-full p-6 bg-mainBg text-gray-800">
          <Outlet />
        </main>
      </div>
    </div>
  );
}