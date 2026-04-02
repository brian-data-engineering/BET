import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, 
  Monitor, 
  Wallet, 
  FileText, 
  LogOut, 
  UserCircle,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function OperatorSidebar() {
  const router = useRouter();
  const [profile, setProfile] = useState({ username: 'Loading...', balance: 0, role: '' });

  useEffect(() => {
    const fetchFreshProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch from 'profiles' table to avoid stale metadata
        const { data, error } = await supabase
          .from('profiles')
          .select('username, balance, role')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setProfile(data);
        }
      }
    };

    fetchFreshProfile();

    // LIVE REFRESH: If balance changes in DB, update sidebar immediately
    const channel = supabase
      .channel('sidebar-sync')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'profiles' }, 
        (payload) => {
          if (payload.new.id === profile.id) {
            setProfile(prev => ({ ...prev, balance: payload.new.balance }));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // SECURE NAVIGATION: Define which roles see which menus
  const allMenuItems = [
    { name: 'Terminal', path: '/operator/dashboard', icon: <LayoutDashboard size={18} />, roles: ['operator', 'cashier'] },
    { name: 'My Staff', path: '/operator/staff', icon: <Monitor size={18} />, roles: ['operator'] },
    { name: 'Vault', path: '/operator/wallet', icon: <Wallet size={18} />, roles: ['operator'] },
    { name: 'Analytics', path: '/operator/reports', icon: <TrendingUp size={18} />, roles: ['operator', 'cashier'] },
  ];

  const filteredMenu = allMenuItems.filter(item => item.roles.includes(profile.role));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/operator/login'); 
  };

  return (
    <div className="w-72 bg-[#0b0f1a] border-r border-white/5 flex flex-col h-screen sticky top-0 z-50">
      {/* BRANDING & IDENTITY */}
      <div className="p-8 border-b border-white/5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
          <h2 className="text-white font-black tracking-tighter text-2xl italic uppercase">
            LUCRA<span className="text-[#10b981]">SHOP</span>
          </h2>
        </div>
        
        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <UserCircle size={10} className="text-[#10b981]" />
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] italic">
              {profile.role || 'Authenticating'}
            </p>
          </div>
          <p className="text-sm font-bold text-white truncate">{profile.username.toUpperCase()}</p>
          <p className="text-[10px] text-[#10b981] font-black mt-2 tracking-tighter">
            KES {parseFloat(profile.balance || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 p-6 space-y-2">
        {filteredMenu.map((item) => {
          const isActive = router.pathname === item.path;
          return (
            <Link 
              key={item.name} 
              href={item.path}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase italic tracking-widest transition-all group ${
                isActive 
                  ? 'bg-[#10b981] text-black shadow-lg shadow-[#10b981]/20' 
                  : 'text-slate-500 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={isActive ? 'text-black' : 'text-[#10b981] group-hover:text-white transition-colors'}>
                {item.icon}
              </span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* FOOTER ACTION */}
      <div className="p-6 border-t border-white/5">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-4 w-full px-5 py-4 text-red-500/70 font-black text-[11px] uppercase italic tracking-widest hover:bg-red-500/10 rounded-2xl transition-all"
        >
          <LogOut size={18} />
          Terminate Session
        </button>
      </div>
    </div>
  );
}
