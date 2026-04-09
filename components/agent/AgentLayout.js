import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  LogOut, 
  Monitor, 
  Menu, 
  X,
  Database
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function AgentLayout({ children, profile }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/agent/login');
  };

  const navItems = [
    { name: 'Overview', href: '/agent/dashboard', icon: LayoutDashboard },
    { name: 'Dispatch Float', href: '/agent/funding', icon: Wallet },
    { name: 'Manage Cashiers', href: '/agent/manage-shop', icon: Users },
  ];

  return (
    <div className="flex min-h-screen bg-[#0b0f1a] text-white font-sans">
      {/* SIDEBAR */}
      <aside className="hidden lg:flex w-80 border-r border-white/5 flex-col p-8 bg-[#0b0f1a] sticky top-0 h-screen">
        <div className="mb-12 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center overflow-hidden">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="Brand" className="w-full h-full object-cover" />
            ) : (
              <Database className="text-blue-500" size={24} />
            )}
          </div>
          <div>
            <h2 className="font-black italic uppercase tracking-tighter text-2xl leading-none">Lucra<span className="text-blue-500">Hub</span></h2>
            <span className="text-[8px] text-slate-500 font-black uppercase tracking-[0.3em]">{profile?.username || 'Agent Node'}</span>
          </div>
        </div>

        <nav className="flex-1 space-y-3">
          {navItems.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-4 p-5 rounded-2xl font-black italic uppercase text-[10px] tracking-widest transition-all border ${
                  isActive 
                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20' 
                    : 'bg-transparent border-transparent text-slate-500 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center gap-4 p-5 text-rose-500 font-black italic uppercase text-[10px] tracking-widest hover:bg-rose-500/5 rounded-2xl transition-all"
        >
          <LogOut size={18} />
          Terminate Session
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden p-6 border-b border-white/5 flex justify-between items-center bg-[#0b0f1a]">
           <h2 className="font-black italic uppercase text-xl">Lucra<span className="text-blue-500">Hub</span></h2>
           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
             {isMobileMenuOpen ? <X /> : <Menu />}
           </button>
        </header>

        <main className="flex-1 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
