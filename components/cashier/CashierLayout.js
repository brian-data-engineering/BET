import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutDashboard, Receipt, BarChart3, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function CashierLayout({ children }) {
  const router = useRouter();

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
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 border-r border-gray-800 flex flex-col p-4 bg-slate-950">
        <div className="mb-10 text-center md:text-left px-2">
          <h1 className="text-xl font-black italic tracking-tighter uppercase hidden md:block">Lucra<span className="text-lucra-green">.POS</span></h1>
          <div className="md:hidden w-10 h-10 bg-lucra-green rounded-lg mx-auto" />
        </div>
        
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all ${router.pathname === item.path ? 'bg-lucra-green text-black' : 'hover:bg-gray-900 text-gray-400'}`}>
                <item.icon size={20} />
                <span className="font-bold text-sm hidden md:block">{item.name}</span>
              </div>
            </Link>
          ))}
        </nav>

        <button onClick={handleLogout} className="flex items-center gap-3 p-4 rounded-2xl text-gray-500 hover:text-red-500 transition-all">
          <LogOut size={20} />
          <span className="font-bold text-sm hidden md:block">Sign Out</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
