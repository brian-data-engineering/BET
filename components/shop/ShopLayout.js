import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, 
  Users, 
  Send, 
  History, 
  LogOut, 
  Menu, 
  X, 
  Store,
  Wallet,
  Settings
} from 'lucide-react';

const ShopLayout = ({ children, profile }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const navigation = [
    { name: 'Dashboard', href: '/shop/dashboard', icon: LayoutDashboard },
    { name: 'Manage Cashiers', href: '/shop/manage-cashiers', icon: Users },
    { name: 'Dispatch Float', href: '/shop/funding', icon: Send },
    { name: 'Transactions', href: '/shop/transactions', icon: History },
    { name: 'Settings', href: '/shop/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    // Add your Supabase signOut logic here
    router.push('/shop/login');
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white font-sans flex">
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#111926] border-r border-white/5 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-8">
          {/* BRAND LOGO */}
          <div className="flex items-center gap-4 mb-12 px-2">
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              <Store className="text-emerald-500" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Lucra</h2>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">Retail Node</span>
            </div>
          </div>

          {/* BALANCE CARD (QUICK LOOK) */}
          <div className="bg-black/40 border border-white/5 p-6 rounded-3xl mb-10">
            <div className="flex items-center gap-2 mb-2 text-slate-500">
              <Wallet size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest">Branch Float</span>
            </div>
            <div className="text-xl font-black text-[#10b981] italic tracking-tighter">
              KES {parseFloat(profile?.balance || 0).toLocaleString()}
            </div>
          </div>

          {/* NAV LINKS */}
          <nav className="flex-1 space-y-2">
            {navigation.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div className={`
                    flex items-center gap-4 px-6 py-4 rounded-2xl cursor-pointer transition-all group
                    ${isActive 
                      ? 'bg-emerald-600 text-black font-black italic shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                  `}>
                    <item.icon size={18} className={isActive ? 'text-black' : 'text-slate-500 group-hover:text-emerald-500'} />
                    <span className="text-xs uppercase font-black tracking-widest">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* USER FOOTER & LOGOUT */}
          <div className="mt-auto pt-8 border-t border-white/5">
            <div className="flex items-center gap-4 mb-6 px-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-black text-emerald-500">
                {profile?.username?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div className="overflow-hidden">
                <p className="text-[11px] font-black uppercase italic truncate">{profile?.display_name || 'Branch Manager'}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase truncate">{profile?.username}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all group"
            >
              <LogOut size={18} />
              <span className="text-xs uppercase font-black tracking-widest">Exit Terminal</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* TOP BAR (MOBILE ONLY) */}
        <header className="lg:hidden p-6 bg-[#111926] border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Store className="text-emerald-500" size={20} />
            <h2 className="font-black uppercase italic text-sm">Lucra Retail</h2>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/5 rounded-lg">
            <Menu size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ShopLayout;
