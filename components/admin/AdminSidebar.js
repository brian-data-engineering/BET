import { useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AdminContext } from './AdminLayout'; 
import { 
  LayoutDashboard, 
  Wallet, 
  LogOut, 
  ShieldCheck, 
  Globe, 
  BarChart3,
  Gavel,
  Database,
  Cpu
} from 'lucide-react';

export default function AdminSidebar() {
  const router = useRouter();
  const { profile, handleSecureSignOut } = useContext(AdminContext);

  // --- LUCRA ADMIN NAVIGATION ---
  const adminMenu = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Operators', path: '/admin/operator', icon: <ShieldCheck size={18} /> },
    { name: 'Settlement', path: '/admin/settle', icon: <Gavel size={18} /> },
    { name: 'League Bridge', path: '/admin/leagues', icon: <Globe size={18} /> },
    { name: 'Funding', path: '/admin/funding', icon: <Wallet size={18} /> },
    { name: 'Network Audit', path: '/admin/reports', icon: <BarChart3 size={18} /> },
  ];

  const isAuthorized = profile?.role === 'super_admin' || profile?.role === 'admin';

  return (
    <div className="w-64 bg-[#0b0f1a] border-r border-white/5 flex flex-col h-screen sticky top-0 shadow-2xl">
      
      {/* Brand Header */}
      <div className="p-8 border-b border-white/5 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-[#10b981] animate-pulse" />
          <h2 className="text-white font-black tracking-tighter text-xl italic uppercase">
            Lucra <span className="text-[#10b981]">Core</span>
          </h2>
        </div>
        <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.4em] mt-1">
          Admin Interface v2.1
        </p>
      </div>

      {/* LEDGER STATUS MODULE */}
      <div className="mx-4 my-6 p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 shadow-inner">
        <div className="flex justify-between items-center">
           <span className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest">Vault Status</span>
           <Database size={12} className="text-[#10b981]/40" />
        </div>
        <div>
           <p className="text-[8px] font-black text-[#10b981] uppercase tracking-widest mb-1">Treasury Float</p>
           <div className="text-2xl font-black text-white italic tracking-tighter leading-none">
             KES {parseFloat(profile?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
           </div>
        </div>
        <div className="pt-2 border-t border-white/5 flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
           <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Synchronized</span>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {isAuthorized ? (
          adminMenu.map((item) => {
            const isActive = router.pathname === item.path;
            return (
              <Link 
                key={item.name} 
                href={item.path}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-black text-[11px] uppercase italic tracking-widest transition-all group ${
                  isActive 
                    ? 'bg-[#10b981] text-black shadow-[0_10px_25px_rgba(16,185,129,0.2)]' 
                    : 'text-slate-500 hover:bg-white/[0.03] hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-black' : 'text-slate-600 group-hover:text-[#10b981] transition-colors'}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            );
          })
        ) : (
          <div className="p-4 text-[9px] font-black text-rose-500 uppercase italic bg-rose-500/5 rounded-xl border border-rose-500/10 text-center tracking-widest">
            Access Denied
          </div>
        )}
      </nav>

      {/* PROFILE & LOGOUT */}
      <div className="p-4 border-t border-white/5 bg-[#080b13]">
        <div className="mb-4 px-4 py-3 rounded-xl bg-slate-900/40 border border-white/5 flex items-center gap-3">
           <div className="w-8 h-8 rounded-lg bg-[#10b981]/10 flex items-center justify-center border border-[#10b981]/20">
              <ShieldCheck size={16} className="text-[#10b981]" />
           </div>
           <div className="flex flex-col min-w-0">
             <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Active Admin</p>
             <p className="text-[11px] font-black text-slate-300 truncate italic">{profile?.username || 'ROOT'}</p>
           </div>
        </div>
        
        <button 
          onClick={handleSecureSignOut}
          className="flex items-center justify-center gap-3 w-full px-4 py-4 text-rose-500 font-black text-[10px] uppercase italic tracking-widest hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20 active:scale-95"
        >
          <LogOut size={16} />
          Terminate Session
        </button>
      </div>
    </div>
  );
}
