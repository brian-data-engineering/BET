import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, 
  Monitor, 
  Wallet, 
  LogOut, 
  UserCircle,
  TrendingUp,
  Activity,
  Database,
  Settings // Added for the new link
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function OperatorSidebar() {
  const router = useRouter();
  const [profile, setProfile] = useState({ id: null, username: 'Loading...', balance: 0, role: '' });

  useEffect(() => {
    const initSidebar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, balance, role')
        .eq('id', user.id)
        .single();

      if (!error && data) setProfile(data);

      const channel = supabase
        .channel(`sidebar-sync-${user.id}`)
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles',
            filter: `id=eq.${user.id}` 
          }, 
          (payload) => {
            setProfile(prev => ({ ...prev, balance: payload.new.balance }));
          }
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    };

    initSidebar();
  }, []);

  const allMenuItems = [
    { name: 'Terminal', path: '/operator/dashboard', icon: <LayoutDashboard size={18} />, roles: ['operator', 'cashier'] },
    { name: 'Staff Nodes', path: '/operator/staff', icon: <Monitor size={18} />, roles: ['operator'] },
    { name: 'Vault Ledger', path: '/operator/wallet', icon: <Wallet size={18} />, roles: ['operator'] },
    { name: 'Network Intel', path: '/operator/reports', icon: <TrendingUp size={18} />, roles: ['operator', 'cashier'] },
    // ADDED SETTINGS LINK HERE
    { name: 'Config Control', path: '/operator/settings', icon: <Settings size={18} />, roles: ['operator'] },
  ];

  const filteredMenu = allMenuItems.filter(item => item.roles.includes(profile.role));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/operator/login'); 
  };

  return (
    <div className="w-72 bg-[#0b0f1a] border-r border-white/5 flex flex-col h-screen sticky top-0 z-50 shadow-2xl">
      <div className="p-8 border-b border-white/5 space-y-6">
        <div className="flex items-center gap-3">
          <Activity size={18} className="text-[#10b981] animate-pulse" />
          <h2 className="text-white font-black tracking-tighter text-2xl italic uppercase">
            LUCRA<span className="text-[#10b981]">SHOP</span>
          </h2>
        </div>
        
        <div className="bg-[#111926] p-5 rounded-[2rem] border border-white/5 relative overflow-hidden group">
          <Database className="absolute -right-2 -bottom-2 text-white opacity-[0.02] group-hover:opacity-[0.05] transition-opacity" size={60} />
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <UserCircle size={12} className="text-slate-500" />
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] italic">{profile.role || 'Initializing'}</p>
          </div>
          <p className="text-sm font-black text-white truncate uppercase italic tracking-tight relative z-10">{profile.username}</p>
          <div className="mt-4 pt-4 border-t border-white/5 relative z-10">
            <p className="text-[8px] text-[#10b981] font-black uppercase tracking-widest mb-1">Available Liquidity</p>
            <p className="text-xl font-black text-white italic tracking-tighter">
              KES {parseFloat(profile.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
        {filteredMenu.map((item) => {
          const isActive = router.pathname === item.path;
          return (
            <Link key={item.name} href={item.path} className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase italic tracking-widest transition-all group ${isActive ? 'bg-[#10b981] text-black shadow-xl shadow-[#10b981]/10' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
              <span className={isActive ? 'text-black' : 'text-[#10b981] group-hover:text-white transition-colors'}>{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/5 bg-[#080b13]">
        <div className="mb-4 px-4 py-2 flex items-center justify-between text-[8px] font-black uppercase tracking-widest italic">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
            <span className="text-slate-600">Node Online</span>
          </div>
          <span className="text-slate-700 text-[10px]">v2.1</span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-4 w-full px-5 py-4 text-rose-500/80 font-black text-[10px] uppercase italic tracking-widest hover:bg-rose-500/10 rounded-2xl transition-all active:scale-95">
          <LogOut size={16} /> Terminate Session
        </button>
      </div>
    </div>
  );
}
