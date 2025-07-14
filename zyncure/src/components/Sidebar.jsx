import React from "react";
import { MoreVertical, ChevronLast, ChevronFirst, ChevronDown, ChevronRight, X } from "lucide-react";
import { useContext, createContext, useState, useEffect } from "react";

const SidebarContext = createContext();

export default function Sidebar({ children }) {
  const [expanded, setExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // On mobile, default to collapsed
      if (window.innerWidth < 768) {
        setExpanded(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setExpanded(!expanded);
    }
  };

  const closeMobileMenu = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-my-Sidebar text-white md:hidden"
        >
          {mobileMenuOpen ? <X size={20} /> : <ChevronFirst size={20} />}
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        ${isMobile 
          ? `fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ${
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`
          : 'min-h-screen relative z-50'
        }
        flex flex-col bg-mySidebar shadow-2xl drop-shadow-2xl
        ${isMobile ? 'w-64' : 'rounded-br-[120px]'}
      `}>
        <nav className="h-full flex flex-col">
          <div className="p-4 pb-2 flex justify-between items-center">
            <img
              src="/zyncure_logo.png"
              className={`overflow-hidden transition-all ${
                (isMobile && mobileMenuOpen) || (!isMobile && expanded) ? "w-40" : "w-0"
              }`}
              alt="Zyncure Logo"
            />
            {!isMobile && (
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg bg-mySidebar hover:bg-indigo-200 text-white hover:text-indigo-800"
              >
                {expanded ? <ChevronFirst /> : <ChevronLast />}
              </button>
            )}
          </div>

          <SidebarContext.Provider value={{ 
            expanded: isMobile ? mobileMenuOpen : expanded,
            isMobile,
            closeMobileMenu
          }}>
            <ul className="flex-1 px-3 overflow-y-auto">{children}</ul>
          </SidebarContext.Provider>
        </nav>
      </aside>
    </>
  );
}

export function SidebarItem({ icon, text, active, alert, onClick, children, disabled = false }) {
  const { expanded, isMobile, closeMobileMenu } = useContext(SidebarContext);
  const [isOpen, setIsOpen] = useState(false);

  const hasChildren = children && children.length > 0;

  const handleClick = () => {
    if (disabled) return;

    if (hasChildren && expanded) {
      setIsOpen(!isOpen);
    } else if (onClick) {
      onClick();
      // Close mobile menu after clicking
      if (isMobile) {
        closeMobileMenu();
      }
    }
  };

  // For floating submenu on hover when collapsed (desktop only)
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <li
        className={`
          relative flex items-center py-3 px-3 my-1
          font-medium rounded-md cursor-pointer
          transition-colors group
          ${disabled
            ? "opacity-50 cursor-not-allowed text-gray-400"
            : active
              ? "bg-gradient-to-tr from-indigo-200 to-indigo-100 text-indigo-800"
              : "hover:bg-indigo-50 text-white hover:text-indigo-800"
          }
          ${isMobile ? 'min-h-[44px]' : ''} // Better touch target on mobile
        `}
        onClick={handleClick}
        onMouseEnter={() => !disabled && !isMobile && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className="flex-shrink-0">{icon}</span>
        <span
          className={`overflow-hidden transition-all ${
            expanded ? "w-52 ml-3" : "w-0"
          }`}
        >
          {text}
        </span>
        {hasChildren && expanded && !disabled && (
          <span className="ml-auto flex-shrink-0">
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        )}
        {alert && !disabled && (
          <div
            className={`absolute right-2 w-2 h-2 rounded bg-indigo-400 ${
              expanded ? "" : "top-2"
            }`}
          />
        )}
        
        {/* Tooltip for collapsed (desktop only) */}
        {!expanded && !disabled && !isMobile && (
          <div
            className={`
              absolute left-full rounded-md px-2 py-1 ml-6
              bg-indigo-100 text-indigo-800 text-sm
              invisible opacity-20 -translate-x-3 transition-all
              group-hover:visible group-hover:opacity-100 group-hover:translate-x-0
              whitespace-nowrap
            `}
          >
            {text}
          </div>
        )}
        
        {/* Disabled tooltip (desktop only) */}
        {!expanded && disabled && !isMobile && (
          <div
            className={`
              absolute left-full rounded-md px-2 py-1 ml-6
              bg-red-100 text-red-800 text-sm
              invisible opacity-20 -translate-x-3 transition-all
              group-hover:visible group-hover:opacity-100 group-hover:translate-x-0
              whitespace-nowrap
            `}
          >
            {text} - Verification Required
          </div>
        )}
        
        {/* Floating submenu when collapsed (desktop only) */}
        {hasChildren && !expanded && hovered && !disabled && !isMobile && (
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
      {hasChildren && isOpen && expanded && !disabled && (
        <ul className="ml-6 mt-1 space-y-1">
          {children}
        </ul>
      )}
    </>
  );
}

export function SidebarSubItem({ icon, text, active, onClick, submenu = false, disabled = false }) {
  const { isMobile, closeMobileMenu } = useContext(SidebarContext);
  
  const handleClick = () => {
    if (disabled) return;
    if (onClick) {
      onClick();
      // Close mobile menu after clicking
      if (isMobile) {
        closeMobileMenu();
      }
    }
  };

  return (
    <li
      className={`
        flex items-center py-2 px-3 rounded-md cursor-pointer text-sm
        transition-colors
        ${disabled
          ? "opacity-50 cursor-not-allowed text-gray-400"
          : submenu
            ? active
              ? "bg-indigo-200 text-indigo-800"
              : "text-indigo-800 hover:bg-indigo-200"
            : active
              ? "bg-indigo-50 text-indigo-800"
              : "text-white hover:bg-indigo-50 hover:text-indigo-800"
        }
        ${isMobile ? 'min-h-[40px]' : ''} // Better touch target on mobile
      `}
      onClick={handleClick}
    >
      {icon && <span className="mr-2 flex-shrink-0">{icon}</span>}
      <span className="truncate">{text}</span>
    </li>
  );
}

// Example usage component
function BarItems() {
  const [activeItem, setActiveItem] = useState('dashboard');

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar>
        <SidebarItem
          icon={<span>📊</span>}
          text="Dashboard"
          active={activeItem === 'dashboard'}
          onClick={() => setActiveItem('dashboard')}
        />
        <SidebarItem
          icon={<span>👥</span>}
          text="Users"
          active={activeItem === 'users'}
          onClick={() => setActiveItem('users')}
        />
        <SidebarItem
          icon={<span>📁</span>}
          text="Projects"
          active={activeItem.startsWith('projects')}
        >
          <SidebarSubItem
            icon={<span>📋</span>}
            text="Active Projects"
            active={activeItem === 'projects-active'}
            onClick={() => setActiveItem('projects-active')}
          />
          <SidebarSubItem
            icon={<span>📦</span>}
            text="Archived"
            active={activeItem === 'projects-archived'}
            onClick={() => setActiveItem('projects-archived')}
          />
        </SidebarItem>
        <SidebarItem
          icon={<span>⚙️</span>}
          text="Settings"
          active={activeItem === 'settings'}
          onClick={() => setActiveItem('settings')}
        />
        <SidebarItem
          icon={<span>🔒</span>}
          text="Admin Panel"
          disabled={true}
          alert={true}
        />
      </Sidebar>
      
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">
            {activeItem.charAt(0).toUpperCase() + activeItem.slice(1).replace('-', ' ')}
          </h1>
          <div className="bg-white rounded-lg shadow p-6">
           
          </div>
        </div>
      </main>
    </div>
  );
}

export { BarItems };