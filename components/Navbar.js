import React from 'react';
import Link from 'next/link';
import { 
  Search, Trophy, Activity, Smartphone, Ticket 
} from 'lucide-react';
import HomeBanner from './HomeBanner';

const Navbar = ({ onSearch }) => {
  return (
    <nav className="sticky top-0 z-50 shadow-xl flex flex-col w-full">
      
      {/* --- TOP BAR: Branding & Actions --- */}
      <div className="bg-[#0b0f1a] px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1 cursor-pointer">
          <div className="w-9 h-9 border-2 border-[#10b981] rounded-full flex items-center justify-center font-black text-[#10b981] text-lg">
            L
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-2xl font-black tracking-tighter text-white uppercase italic">
              lucra<span className="text-[#f59e0b]">bet</span>
            </span>
            <span className="text-[10px] font-bold text-[#f59e0b] ml-auto">.co.ke</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-slate-300 hover:text-white transition-all text-xs font-bold uppercase tracking-tight">
            <Ticket size={16} className="text-[#f59e0b]" />
            Check Ticket
          </button>
        </div>
      </div>

      {/* --- QUICK LINKS & SEARCH: Utility Bar --- */}
      <div className="bg-[#003d30] px-4 py-2 border-y border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-6 text-[11px] font-bold text-slate-400 uppercase italic">
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
        
        <div 
          onClick={() => onSearch && onSearch('')} 
          className="flex items-center gap-2 text-white/70 hover:text-white cursor-pointer group"
        >
          <Search size={18} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-tight">Search</span>
        </div>
      </div>

      {/* --- BANNER SECTION: Full-Width Integrated Promo --- */}
      <div className="bg-[#0b0f1a] w-full border-b border-white/5 overflow-hidden">
        <HomeBanner />
      </div>
    </nav>
  );
};

export default Navbar;
