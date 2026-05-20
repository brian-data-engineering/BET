import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, Wallet, ShieldCheck, 
  Globe, BarChart3, Gavel, Image as ImageIcon,
  Menu, X, Cpu
} from 'lucide-react';

export default function AdminMobileNav({ profile, handleSecureSignOut }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const adminMenu = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Operators', path: '/admin/operator', icon: <ShieldCheck size={18} /> },
    { name: 'Settlement', path: '/admin/settle', icon: <Gavel size={18} /> },
    { name: 'Banners', path: '/admin/banners', icon: <ImageIcon size={18} /> },
    { name: 'League Bridge', path: '/admin/leagues', icon: <Globe size={18} /> },
    { name: 'Funding', path: '/admin/funding', icon: <Wallet size={18} /> },
    { name: 'Network Audit', path: '/admin/reports', icon: <BarChart3 size={18} /> },
  ];

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [router.pathname]);

  return (
    <div className="lg:hidden">
      {/* Top Bar for Mobile */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#0b0f1a] border-b border-white/5 px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-[#10b981]" />
          <h2 className="text-white font-black tracking-tighter text-lg italic uppercase">
            Lucra <span className="text-[#10b981]">Core</span>
          </h2>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Fullscreen Overlay Menu */}
      {isOpen && (
        <div className="fixed inset-0 bg-[#0b0f1a] z-40 pt-20 px-6 overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-6 pb-20">
            {/* Stats Summary in Menu */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <p className="text-[8px] font-black text-[#10b981] uppercase tracking-widest">Treasury Float</p>
              <div className="text-2xl font-black text-white italic tracking-tighter">
                KES {parseFloat(profile?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <nav className="space-y-1">
              {adminMenu.map((item) => {
                const isActive = router.pathname === item.path;
                return (
                  <Link 
                    key={item.name} 
                    href={item.path} 
                    className={`flex items-center gap-4 px-5 py-4 rounded-xl font-black text-[11px] uppercase italic tracking-widest transition-all ${isActive ? 'bg-[#10b981] text-black shadow-[0_10px_25px_rgba(16,185,129,0.2)]' : 'text-slate-500 hover:bg-white/[0.03] hover:text-white'}`}
                  >
                    <span className={isActive ? 'text-black' : 'text-slate-600'}>{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <button 
              onClick={handleSecureSignOut}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 text-rose-500 font-black text-[10px] uppercase italic tracking-widest bg-rose-500/5 rounded-xl border border-rose-500/10"
            >
              Terminate Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
