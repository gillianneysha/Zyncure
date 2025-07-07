import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import React, { useState } from 'react';
import Sidebar, { SidebarItem, SidebarSubItem } from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { CalendarDays, Users, Bell, Heart, House, User, ChartPie, Folders, MessageSquare } from 'lucide-react';
import { ReportModal } from '../components/ReportModal';

export default function PatientLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === `/home${path}`;
  const isHealthActive = location.pathname.includes('/home/health');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

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
        <SidebarItem
          icon={<Users size={20} />}
          text="Connections"
          active={isActive('/connections')}
          onClick={() => navigate('/home/connections')}
        />
        <SidebarItem
          icon={<Bell size={20} />}
          text="Notifications"
          active={isActive('/notifications')}
          onClick={() => navigate('/home/notifications')}
          alert
        />
        <SidebarItem
          icon={<CalendarDays size={20} />}
          text="Appointments"
          active={isActive('/appointments')}
          onClick={() => navigate('/home/appointments')}
          alert
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
          <Outlet />
        </main>
      </div>
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}