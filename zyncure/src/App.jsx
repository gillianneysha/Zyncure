import AppRouter from './AppRouter';

export default function App() {
  return <AppRouter />;
}


// import './App.css';
// import Sidebar, { SidebarItem } from './components/Sidebar';
// import Navbar from './components/Navbar';
// import { CalendarDays, Users, Bell, Heart, House, User } from 'lucide-react';
// import { Routes, Route, useNavigate } from 'react-router-dom';

// import Home from './pages/patient/Home';
// import Profile from './pages/Profile';
// import Health from './pages/Health';
// import Connections from './pages/Connections';
// import Notifications from './pages/Notifications';
// import Appointments from './pages/Appointments';

// export default function App() {
//   const navigate = useNavigate();

//   return (
//     <div className="flex h-screen">
//       <Sidebar>
//         <SidebarItem icon={<User size={20} />} text="Profile" onClick={() => navigate('/profile')} />
//         <SidebarItem icon={<House size={20} />} text="Home" onClick={() => navigate('/')} />
//         <SidebarItem icon={<Heart size={20} />} text="Your Health" onClick={() => navigate('/health')} />
//         <SidebarItem icon={<Users size={20} />} text="Connections" onClick={() => navigate('/connections')} />
//         <SidebarItem icon={<Bell size={20} />} text="Notifications" onClick={() => navigate('/notifications')} alert />
//         <SidebarItem icon={<CalendarDays size={20} />} text="Appointments" onClick={() => navigate('/appointments')} alert />
//       </Sidebar>

//       <div className="flex flex-col flex-1">
//         <Navbar />

//         {/* Main content area */}
//         <main className="flex-1 w-full p-6 bg-myBackground text-gray-800">
//           <Routes>
//             <Route path="/" element={<Home />} />
//             <Route path="/profile" element={<Profile />} />
//             <Route path="/health" element={<Health />} />
//             <Route path="/connections" element={<Connections />} />
//             <Route path="/notifications" element={<Notifications />} />
//             <Route path="/appointments" element={<Appointments />} />
//           </Routes>
//         </main>
//       </div>
//     </div>
//   );
// }
