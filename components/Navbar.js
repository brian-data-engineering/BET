import React from 'react';
import { Search, User, Globe, Smartphone, Trophy, Activity, Rocket, Zap, Gift } from 'lucide-react';

const Navbar = ({ onSearch }) => {
  return (
    <nav className="sticky top-0 z-50">
      {/* --- TOP BAR: Logo & Auth --- */}
      <div className="bg-[#0b0f1a] px-4 py-3 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center gap-1 cursor-pointer">
          <div className="w-9 h-9 border-2 border-[#10b981] rounded-full flex items-center justify-center font-black text-[#10b981] text-lg">
            bb
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-2xl font-black tracking-tighter text-white uppercase italic">
              bonus<span className="text-[#f59e0b]">bet</span>
            </span>
            <span className="text-[10px] font-bold text-[#f59e0b] ml-auto">.co.ke</span>
          </div>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          <button className="text-sm font-bold text-[#10b981] hover:text-white transition-colors">
            Login
          </button>
          <button className="bg-[#10b981] hover:bg-[#059669] text-white text-sm font-bold px-5 py-2 rounded shadow-lg transition-all active:scale-95">
            Register
          </button>
        </div>
      </div>

      {/* --- MIDDLE BAR: Features Menu (Dark Green) --- */}
      <div className="bg-[#004d3d] border-t border-white/5 px-4 overflow-x-auto no-scrollbar">
        <div className="max-w-[1440px] mx-auto flex items-center gap-6 py-2.5 whitespace-nowrap">
          <NavItem icon={<Trophy size={16} />} label="Sports" active />
          <NavItem icon={<Activity size={16} />} label="Live" />
          <NavItem icon={<Rocket size={16} />} label="Aviator" isNew />
          <NavItem icon={<Zap size={16} />} label="Crash" />
          <NavItem icon={<Gift size={16} />} label="Promotions" />
          <NavItem icon={<Smartphone size={16} />} label="Virtuals" />
        </div>
      </div>

      {/* --- BOTTOM BAR: Quick Links & Search --- */}
      <div className="bg-[#003d30] px-4 py-2 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-6 text-[11px] font-bold text-slate-300 uppercase">
          <button className="hover:text-white flex items-center gap-1.5 italic">
            <Activity size={14} /> Live Score
          </button>
          <button className="hover:text-white flex items-center gap-1.5 italic">
            <Trophy size={14} /> Results
          </button>
          <button className="hover:text-white flex items-center gap-1.5 italic text-[#f59e0b]">
            <Smartphone size={14} /> BonusBet App
          </button>
        </div>

        {/* Search Toggle */}
        <div className="flex items-center gap-2 text-white/70 hover:text-white cursor-pointer group">
          <Search size={18} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-tight">Search</span>
        </div>
      </div>
    </nav>
  );
};

// Sub-component for Menu Items
const NavItem = ({ icon, label, active = false, isNew = false }) => (
  <button className={`flex items-center gap-1.5 px-1 py-1 transition-all relative ${active ? 'text-white border-b-2 border-white' : 'text-white/70 hover:text-white'}`}>
    {icon}
    <span className="text-xs font-black uppercase tracking-tight">{label}</span>
    {isNew && (
      <span className="bg-red-600 text-[8px] font-black px-1 rounded absolute -top-1 -right-4 animate-bounce">
        NEW!
      </span>
    )}
  </button>
);

export default Navbar;
