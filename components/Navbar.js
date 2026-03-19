import { Search, Bell, Gift } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-lucra-dark border-b border-gray-800 p-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <h1 className="text-2xl font-black text-lucra-green tracking-tighter italic">BET</h1>
        
        <div className="hidden md:flex items-center bg-lucra-card border border-gray-700 rounded-lg px-3 py-1.5 w-64">
          <Search size={16} className="text-gray-500" />
          <input 
            type="text" 
            placeholder="Search games, teams..." 
            className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full text-gray-300"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2 mr-4">
          <Gift size={20} className="text-gray-400 hover:text-lucra-green cursor-pointer" />
          <Bell size={20} className="text-gray-400 hover:text-lucra-green cursor-pointer" />
        </div>
        <button className="text-white font-bold px-4 py-2 hover:text-lucra-green transition">Sign In</button>
        <button className="bg-lucra-green text-black font-bold px-6 py-2 rounded-lg hover:bg-white transition">Sign Up</button>
      </div>
    </nav>
  );
}
