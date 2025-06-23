import { useNavigate, useLocation, NavLink } from "react-router-dom";
import {
  User, Home, Users, Bug,
  ChevronFirst, ChevronLast, ChevronDown, ChevronRight,
  UserRoundCog, Ticket, ChartPie, Stethoscope
} from "lucide-react";
import React, { useContext, createContext, useState } from "react";

const SidebarContext = createContext();

export default function AdminSidebar() {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === `/admin${path}`;
  const isIssueManagement = location.pathname.startsWith('/admin/support') || location.pathname.startsWith('/admin/bugs');

  return (
    <aside className="min-h-screen flex flex-col bg-mySidebar rounded-br-[120px] shadow-2xl drop-shadow-2xl relative z-50">
      <nav className="h-full flex flex-col">
        <div className="p-4 pb-2 flex justify-between items-center">
          <img
            src="/zyncure_logo.png"
            className={`overflow-hidden transition-all ${expanded ? "w-40" : "w-0"}`}
            alt="Zyncure Logo"
          />
          <button
            onClick={() => setExpanded((curr) => !curr)}
            className="p-1.5 rounded-lg bg-mySidebar hover:bg-indigo-200 text-white hover:text-indigo-800"
          >
            {expanded ? <ChevronFirst /> : <ChevronLast />}
          </button>
        </div>
        <SidebarContext.Provider value={{ expanded }}>
          <ul className="flex-1 px-3">
            <SidebarItem
              icon={<User size={20} />}
              text="Profile"
              active={isActive("/profile")}
              onClick={() => navigate("/admin/profile")}
            />
            <SidebarItem
              icon={<Home size={20} />}
              text="Home"
              active={isActive("/home")}
              onClick={() => navigate("/admin/home")}
            />
            <SidebarItem
              icon={<Users size={20} />}
              text="Patients"
              active={isActive("/patients")}
              onClick={() => navigate("/admin/patients")}
            />
            <SidebarItem
              icon={<Stethoscope size={20} />}
              text="Medical Professionals"
              active={isActive("/professionals")}
              onClick={() => navigate("/admin/professionals")}
            />
            <SidebarItem
              icon={<ChartPie size={20} />}
              text="Reports"
              active={isActive("/reports")}
              onClick={() => navigate("/admin/reports")}
            />
            <SidebarItem
              icon={<UserRoundCog size={20} />}
              text="Issue Management"
              active={isIssueManagement}
            >
              <SidebarSubItem
                icon={<Ticket size={18} />}
                text="Support Tickets"
                active={location.pathname === "/admin/support"}
                onClick={() => navigate("/admin/support")}
              />
              <SidebarSubItem
                icon={<Bug size={18} />}
                text="Bug Reports"
                active={location.pathname === "/admin/bugs"}
                onClick={() => navigate("/admin/bugs")}
              />
            </SidebarItem>
            {/* Log out sidebar item removed */}
          </ul>
        </SidebarContext.Provider>
      </nav>
    </aside>
  );
}

// --- CHANGES BELOW ---

function SidebarItem({ icon, text, active, alert, onClick, children }) {
  const { expanded } = useContext(SidebarContext);
  const [isOpen, setIsOpen] = useState(false);

  const hasChildren = !!children;

  const handleClick = () => {
    if (hasChildren && expanded) {
      setIsOpen(!isOpen);
    } else if (onClick) {
      onClick();
    }
  };

  const [hovered, setHovered] = useState(false);

  return (
    <>
      <li
        className={`
          relative flex items-center py-2 px-3 my-1
          font-medium rounded-md cursor-pointer
          transition-colors group
          ${
            active
              ? "bg-gradient-to-tr from-indigo-200 to-indigo-100 text-indigo-800"
              : "hover:bg-indigo-50 text-white hover:text-indigo-800"
          }
        `}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {icon}
        <span
          className={`overflow-hidden transition-all ${
            expanded ? "w-52 ml-3" : "w-0"
          }`}
        >
          {text}
        </span>
        {hasChildren && expanded && (
          <span className="ml-auto">
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        )}
        {alert && (
          <div
            className={`absolute right-2 w-2 h-2 rounded bg-indigo-400 ${
              expanded ? "" : "top-2"
            }`}
          />
        )}
        {/* Tooltip for collapsed */}
        {!expanded && (
          <div
            className={`
              absolute left-full rounded-md px-2 py-1 ml-6
              bg-indigo-100 text-indigo-800 text-sm
              invisible opacity-20 -translate-x-3 transition-all
              group-hover:visible group-hover:opacity-100 group-hover:translate-x-0
            `}
          >
            {text}
          </div>
        )}
        {/* Floating submenu when collapsed */}
        {hasChildren && !expanded && hovered && (
          <ul
            className="absolute left-full top-1/2 -translate-y-1/2 ml-6 bg-indigo-100 shadow-lg rounded-xl py-2 z-50 min-w-[160px] border border-gray-200"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {React.Children.map(children, child =>
              React.cloneElement(child, { submenu: true })
            )}
          </ul>
        )}
      </li>
      {/* Submenu items when expanded */}
      {hasChildren && isOpen && expanded && (
        <ul className="ml-6 mt-1 space-y-1">
          {children}
        </ul>
      )}
    </>
  );
}

function SidebarSubItem({ icon, text, active, onClick, submenu = false }) {
  return (
    <li
      className={`
        flex items-center py-1 px-3 rounded-md cursor-pointer text-sm
        transition-colors
        ${
          submenu
            ? active
              ? "bg-indigo-200 text-indigo-800"
              : "text-indigo-800 hover:bg-indigo-200"
            : active
            ? "bg-indigo-50 text-indigo-800"
            : "text-white hover:bg-indigo-50 hover:text-indigo-800"
        }
      `}
      onClick={onClick}
    >
      {icon && <span className="mr-2">{icon}</span>}
      <span>{text}</span>
    </li>
  );
}