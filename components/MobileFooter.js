import { List, LayoutGrid, Trophy, Clock, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function MobileFooter({ slipCount = 0, onOpenSidebar, onOpenSlip }) {
  const router = useRouter();
  
  // Helper to highlight the active icon based on the current page
  const isActive = (path) => router.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0b0f1a] border-t border-white/10 h-16 flex lg:hidden z-[90] items-center justify-around px-2 shadow-2xl">
      
      {/* A-Z Sports / Sidebar Trigger */}
      <button 
        onClick={onOpenSidebar} 
        className="flex flex-col items-center gap-1 text-slate-400 active:text-[#10b981] transition-colors"
      >
        <List size={20} />
        <span className="text-[9px] font-bold italic">A-Z Sports</span>
      </button>
      
      {/* Home Link */}
      <Link 
        href="/" 
        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/') ? 'text-[#10b981]' : 'text-slate-400'}`}
      >
        <LayoutGrid size={20} />
        <span className="text-[9px] font-bold italic">Home</span>
      </Link>

      {/* Center Floating Trophy (Betslip) */}
      <div className="relative">
        <button 
          onClick={onOpenSlip} 
          className="bg-[#10b981] w-14 h-14 rounded-full -mt-10 border-4 border-[#0b0f1a] flex items-center justify-center text-white shadow-xl shadow-[#10b981]/20 transform active:scale-95 transition-transform"
        >
          <Trophy size={24} />
        </button>
        {slipCount > 0 && (
          <div className="absolute -top-11 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center animate-bounce border-2 border-[#0b0f1a]">
            {slipCount}
          </div>
        )}
      </div>

      {/* Results Link */}
      <Link 
        href="/results" 
        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/results') ? 'text-[#10b981]' : 'text-slate-400'}`}
      >
        <Clock size={20} />
        <span className="text-[9px] font-bold italic">Results</span>
      </Link>

      {/* Account Link */}
      <Link 
        href="/profile" 
        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/profile') ? 'text-[#10b981]' : 'text-slate-400'}`}
      >
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${isActive('/profile') ? 'bg-[#10b981] text-[#0b0f1a]' : 'bg-slate-700 text-white'}`}>
          ME
        </div>
        <span className="text-[9px] font-bold italic">Account</span>
      </Link>
    </div>
  );
}
