import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutDashboard, Receipt, BarChart3, LogOut, User, RefreshCcw } from 'lucide-react';
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
    { name: 'Spin', icon: RefreshCcw, path: '/cashier/CashierSpin' },
    { name: 'Validate', icon: Receipt, path: '/cashier/tickets' },
    { name: 'Reports', icon: BarChart3, path: '/cashier/report' },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col print:bg-white print:text-black print:block">
      
      {/* Top Navbar: Added 'print:hidden' */}
      <header className="border-b border-white/5 bg-[#0b0f1a] shadow-2xl print:hidden sticky top-0 z-50">
        <div className="max-w-none mx-auto px-4 sm:px-6">
          <div className="h-20 flex items-center justify-between gap-4">
            
            {/* Logo and Desktop Nav */}
            <div className="flex items-center gap-8">
              <Link href="/cashier/dashboard" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-[#10b981] rounded-xl flex items-center justify-center shadow-lg shadow-[#10b981]/20 group-hover:scale-110 transition-transform">
                  <LayoutDashboard size={20} className="text-black" />
                </div>
                <h1 className="text-xl font-black italic tracking-tighter uppercase hidden sm:block">
                  Lucra<span className="text-[#10b981]">.POS</span>
                </h1>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all duration-300 ${
                      router.pathname === item.path 
                      ? 'bg-[#10b981] text-black shadow-lg shadow-[#10b981]/20' 
                      : 'hover:bg-white/5 text-slate-400'
                    }`}>
                      <item.icon size={16} />
                      <span className="font-black text-[10px] uppercase tracking-widest">{item.name}</span>
                    </div>
                  </Link>
                ))}
              </nav>
            </div>

            {/* Profile and Logout */}
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-4 py-2 px-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex flex-col items-end">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1 truncate max-w-[80px] sm:max-w-none">
                    {profile.username}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[9px] font-bold text-[#10b981]">KES</span>
                    <span className="text-sm font-black italic tabular-nums">
                      {parseFloat(profile.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:block p-2 bg-[#10b981]/10 rounded-lg">
                  <User size={16} className="text-[#10b981]" />
                </div>
              </div>

              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 p-3 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-500/5 transition-all group"
              >
                <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
                <span className="font-black text-[10px] uppercase tracking-widest hidden lg:block">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Bar (Lower row) */}
          <nav className="md:hidden border-t border-white/5 flex items-center justify-around py-3">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <div className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${
                  router.pathname === item.path ? 'text-[#10b981]' : 'text-slate-500'
                }`}>
                  <item.icon size={20} />
                  <span className="text-[8px] font-black uppercase tracking-tighter">{item.name}</span>
                </div>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#0b0f1a] print:bg-white print:overflow-visible print:p-0">
        {children}
      </main>
    </div>
  );
}
