import './App.css'
import Sidebar, { SidebarItem } from './components/Sidebar'
import Navbar from './components/Navbar'
import {CalendarDays, Users, Bell, Heart, House, User} from "lucide-react"


export default function App() {
  return (
    <div className="flex h-screen">

     <Sidebar>
        <SidebarItem icon={<User size={20} />} text="Profile" />
        <SidebarItem icon={<House size={20} />} text="Home"  active/>
        <SidebarItem icon={<Heart size={20} />} text="Your Health" />
        <SidebarItem icon={<Users size={20} />} text="Connections" />
        <SidebarItem icon={<Bell size={20} />} text="Notifications" alert />
        <SidebarItem icon={<CalendarDays size={20} />} text="Appointments" alert />
      </Sidebar>

      {/* Main content */}
      <div className="flex flex-col flex-1">
        {/* Top navbar */}
        <Navbar />

        {/* Main content area */}
        <main className="flex-1 w-full p-6 bg-myBackground text-gray-800">
          <h1 className="text-3xl font-bold mb-4 text-myHeader text-left">Welcome Back!</h1>
        <p className="text-zyncureOrange text-left">Here are some of your weekly and monthly records to help you track your health</p>
        </main>
      </div>
    </div>
  )
}