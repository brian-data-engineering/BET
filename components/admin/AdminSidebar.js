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
  Gavel 
} from 'lucide-react';

export default function AdminSidebar() {
  const router = useRouter();
  const { profile, handleSecureSignOut } = useContext(AdminContext);

  // --- CLEAN ADMIN MENU (LUCRA CORE ONLY) ---
  const adminMenu = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Operators', path: '/admin/operator', icon: <ShieldCheck size={18} /> },
    { name: 'Settlement', path: '/admin/settle', icon: <Gavel size={18} /> },
    { name: 'League Bridge', path: '/admin/leagues', icon: <Globe size={18} /> },
    { name: 'Funding', path: '/admin/funding', icon: <Wallet size={18} /> },
    { name: 'Network Audit', path: '/admin/reports', icon: <BarChart3 size={18} /> },
  ];

  // We only render this if the user is an admin/super_admin
  const isAuthorized = profile?.role === 'super_admin' || profile?.role === 'admin';

  return (
    <div className="w-64 bg-[#0b0f1a] border-r border-white/5 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-white/5">
        <h2 className="text-[#10b981] font-black tracking-tighter text-xl italic uppercase">
          LUCRA ADMIN
        </h2>
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">
          v2.1 Stable Core
        </p>
      </div>

      {/* REAL-TIME BALANCE DISPLAY */}
      <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
        <span className="text-[10px] font-black text-slate-500 uppercase italic">Treasury Float</span>
        <div className="text-xl font-black text-[#10b981] italic tracking-tighter">
          KES {profile?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {isAuthorized ? (
          adminMenu.map((item) => {
            const isActive = router.pathname === item.path;
            return (
              <Link 
                key={item.name} 
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all group ${
                  isActive 
                    ? 'bg-[#10b981] text-black shadow-[0_10px_20px_rgba(16,185,129,0.2)]' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-black' : 'text-slate-500 group-hover:text-[#10b981]'}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            );
          })
        ) : (
          <div className="p-4 text-[10px] font-black text-rose-500 uppercase italic bg-rose-500/5 rounded-xl border border-rose-500/10">
            Access Denied: Admin Privileges Required
          </div>
        )}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-white/5 space-y-2">
        <div className="px-4 py-2 rounded-lg bg-slate-900/50 border border-white/5">
           <p className="text-[9px] font-black text-slate-600 uppercase">Logged as:</p>
           <p className="text-[11px] font-bold text-slate-300 truncate">{profile?.username || 'ROOT_USER'}</p>
        </div>
        
        <button 
          onClick={handleSecureSignOut}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-500 font-bold text-sm hover:bg-red-500/10 rounded-xl transition-all"
        >
          <LogOut size={18} />
          Logout System
        </button>
      </div>
    </div>
  );
}
