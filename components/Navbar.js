import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Search, Trophy, Activity, Smartphone, Ticket, X 
} from 'lucide-react';

const Navbar = ({ onSearch }) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchValue(val);
    if (onSearch) onSearch(val);
  };

  const clearSearch = () => {
    setSearchValue('');
    if (onSearch) onSearch('');
  };

  return (
    <nav className="sticky top-0 z-50 shadow-xl flex flex-col w-full">
      
      {/* --- TOP BAR: Branding & Actions --- */}
      <div className="bg-[#0b0f1a] px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1 cursor-pointer">
          <div className="w-9 h-9 border-2 border-[#10b981] rounded-full flex items-center justify-center font-black text-[#10b981] text-lg">
            P
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-2xl font-black tracking-tighter text-white uppercase italic">
              PUSH<span className="text-[#f59e0b]">bet</span>
            </span>
            <span className="text-[10px] font-bold text-[#f59e0b] ml-auto">.shop</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-slate-300 hover:text-white transition-all text-xs font-bold uppercase tracking-tight">
            <Ticket size={16} className="text-[#f59e0b]" />
            <span className="hidden sm:inline">Check Ticket</span>
            <span className="sm:hidden">Ticket</span>
          </button>
        </div>
      </div>

      {/* --- QUICK LINKS & SEARCH: Utility Bar --- */}
      <div className="bg-[#003d30] px-4 py-2 border-y border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-6 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase italic w-full sm:w-auto overflow-x-auto no-scrollbar whitespace-nowrap">
          <button className="hover:text-white flex items-center gap-1.5 transition-colors">
            <Activity size={14} /> Live Score
          </button>
          
          <Link href="/results" className="hover:text-white flex items-center gap-1.5 transition-colors">
            <Trophy size={14} /> Results
          </Link>

          <button className="hover:text-white flex items-center gap-1.5 text-[#f59e0b] transition-colors">
            <Smartphone size={14} /> App
          </button>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
          <input 
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search Teams..."
            className="w-full bg-black/20 border border-white/10 rounded-lg py-1.5 pl-9 pr-8 text-xs font-bold text-white placeholder:text-white/20 focus:border-[#10b981] outline-none transition-all uppercase italic"
          />
          {searchValue && (
            <button 
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
