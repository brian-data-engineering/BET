import React from 'react';
import { Search, Bell, User } from 'lucide-react';

const Navbar = ({ onSearch }) => {
  return (
    <nav className="bg-[#0f172a] border-b border-slate-800 px-6 py-4 sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-black">L</div>
          <span className="text-xl font-black tracking-tighter text-white">LUCRA</span>
        </div>

        {/* 🔍 Global Search Bar */}
        <div className="flex-1 max-w-xl relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
          <input 
            type="text"
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search teams, leagues or matches..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-2.5 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:text-white transition-colors">
            <Bell size={20} />
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Balance</p>
              <p className="text-sm font-black text-emerald-500">KSH 2,450.00</p>
            </div>
            <button className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 border border-slate-700 hover:border-emerald-500 transition-all">
              <User size={20} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
