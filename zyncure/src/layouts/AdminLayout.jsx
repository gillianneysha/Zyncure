import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import Navbar from '../components/Navbar';

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-[#FFEDE7]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <Navbar /> {/* Use the same Navbar as patient */}
        <main className="flex-1 p-10 bg-[#FFEDE7]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}