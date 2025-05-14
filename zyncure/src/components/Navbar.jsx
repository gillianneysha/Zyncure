import { Search } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="h-16 bg-mySidebar shadow px-6 flex items-center justify-between">
      {/* Search bar */}
      <div className="relative w-full max-w-sm">
        <input
          type="text"
          placeholder="Search..."
          className="w-full px-4 py-2 pr-10 rounded-2xl bg-zyncureSearchBar text-gray-800 border border-pink-300 focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-mySidebar w-5 h-5" />
      </div>

      {/* User greeting and avatar */}
      <div className="flex items-center space-x-3 ml-6">
        <div className="flex flex-col leading-tight text-right">
          <span className="text-zyncureLightPink font-medium">Hi, Ysha!</span>
          <span className="text-sm text-zyncureLightPink">ID: 1111</span>
        </div>
        <img
          src="https://ui-avatars.com/api/?name=Ysha&background=c7d2fe&color=3730a3"
          alt="User Avatar"
          className="w-10 h-10 rounded-full"
        />
      </div>
    </nav>
  );
}
