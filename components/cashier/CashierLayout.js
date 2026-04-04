import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutDashboard, Receipt, BarChart3, LogOut, User } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function CashierLayout({ children }) {
  const router = useRouter();
  const [profile, setProfile] = useState({ username: 'Loading...', balance: 0 });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('username, balance')
        .eq('id', user.id)
        .single();

      if (data) setProfile(data);
    };

    fetchProfile();

    const channel = supabase
      .channel('profile_changes')
      .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles' 
      }, (payload) => {
          setProfile(prev => ({ ...prev, balance: payload.new.balance }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/cashier/login');
  };

  const navItems = [
    { name: 'Terminal', icon: LayoutDashboard, path: '/cashier/dashboard' },
    { name: 'Validate', icon: Receipt, path: '/cashier/tickets' },
    { name: 'Reports', icon: BarChart3, path: '/cashier/report' },
  ];

  return (
    /* CRITICAL FIX: 
       1. Added 'print:bg-white' and 'print:text-black' to reset the theme during print.
       2. Added 'print:block' to ensure the main container stays visible.
    */
    <div className="min-h-screen bg-black text-white flex print:bg-white print:text-black print:block">
      
      {/* Sidebar: Added 'print:hidden' so it doesn't push the ticket off the page */}
      <aside className="w-20 md:w-72 border-r border-white/5 flex flex-col p-6 bg-[#0b0f1a] shadow-2xl print:hidden">
        
        <div className="mb-12 px-2">
          <h1 className="text-2xl font-black italic tracking-tighter uppercase hidden md:block">
            Lucra<span className="text-[#10b981]">.POS</span>
          </h1>
          <div className="md:hidden w-10 h-10 bg-[#10b981] rounded-xl mx-auto shadow-lg shadow-[#10b981]/20" />
        </div>

        <div className="hidden md:block mb-10 p-5 bg-white/5 rounded-[2rem] border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#10b981]/10 rounded-lg">
              <User size={16} className="text-[#10b981]" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Operator</p>
              <p className="text-sm font-black italic uppercase text-white truncate">{profile.username}</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/5">
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Available Float</p>
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-bold text-[#10b981]">KES</span>
              <span className="text-xl font-black italic tabular-nums">
                {parseFloat(profile.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 space-y-3">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
                router.pathname === item.path 
                ? 'bg-[#10b981] text-black shadow-lg shadow-[#10b981]/20' 
                : 'hover:bg-white/5 text-slate-400'
              }`}>
                <item.icon size={20} />
                <span className="font-black text-xs uppercase tracking-widest hidden md:block">{item.name}</span>
              </div>
            </Link>
          ))}
        </nav>

        <div className="pt-6 border-t border-white/5">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-slate-500 hover:text-red-500 hover:bg-red-500/5 transition-all group"
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            <span className="font-black text-xs uppercase tracking-widest hidden md:block">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content: Removed overflow-y-auto during print to prevent scroll-clipping */}
      <main className="flex-1 overflow-y-auto bg-[#0b0f1a] print:bg-white print:overflow-visible print:p-0">
        {children}
      </main>
    </div>
  );
}
