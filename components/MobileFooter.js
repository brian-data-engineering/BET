import React from 'react';
import { List, LayoutGrid, Activity, Trophy, User } from 'lucide-react';

const MobileFooter = ({ 
  itemCount = 0, 
  onOpenSidebar, 
  onOpenSlip, 
  onGoHome 
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden">
      {/* Glossy Backdrop Blur Container */}
      <div className="bg-[#111926]/95 backdrop-blur-2xl border-t border-white/5 h-16 flex items-center justify-around px-2 relative">
        
        {/* A-Z List */}
        <button 
          onClick={onOpenSidebar}
          className="flex flex-col items-center gap-1 text-slate-400 active:text-white transition-colors flex-1"
        >
          <List size={20} />
          <span className="text-[9px] font-black uppercase italic tracking-tighter">A-Z Sports</span>
        </button>

        {/* Home */}
        <button 
          onClick={onGoHome}
          className="flex flex-col items-center gap-1 text-[#10b981] flex-1"
        >
          <LayoutGrid size={20} />
          <span className="text-[9px] font-black uppercase italic tracking-tighter">Home</span>
        </button>
        
        {/* Center Betslip Button - Raised Design */}
        <div className="relative flex-1 flex justify-center">
          <button 
            onClick={onOpenSlip}
            className="bg-[#10b981] w-14 h-14 rounded-full -mt-12 flex items-center justify-center text-[#0b0f1a] shadow-[0_8px_20px_rgba(16,185,129,0.3)] border-[6px] border-[#0b0f1a] active:scale-90 transition-all"
          >
            <Trophy size={26} strokeWidth={2.5} />
          </button>
          
          {itemCount > 0 && (
            <div className="absolute -top-14 right-2 bg-red-600 text-white w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-[#0b0f1a] animate-pulse">
              {itemCount}
            </div>
          )}
        </div>

        {/* In-Play/Live */}
        <button className="flex flex-col items-center gap-1 text-slate-400 active:text-white transition-colors flex-1">
          <Activity size={20} />
          <span className="text-[9px] font-black uppercase italic tracking-tighter">In-Play</span>
        </button>

        {/* Account Profile */}
        <button className="flex flex-col items-center gap-1 text-slate-400 flex-1">
          <div className="w-8 h-8 rounded-lg bg-[#1c2636] flex items-center justify-center border border-white/10 group-active:border-[#10b981] transition-colors">
            <User size={16} />
          </div>
          <span className="text-[9px] font-black uppercase italic tracking-tighter">Account</span>
        </button>

      </div>
      
      {/* Safe Area Spacer for modern iPhones */}
      <div className="h-safe-bottom bg-[#111926]/95 w-full" />
    </nav>
  );
};

export default MobileFooter;
