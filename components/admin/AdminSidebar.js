import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutDashboard, Users, Wallet, FileText, LogOut, Monitor, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminSidebar() {
  const router = useRouter();
  const [role, setRole] = useState(null);

  useEffect(() => {
    const getRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // This pulls 'super_admin' or 'operator' from the metadata badge
      setRole(user?.app_metadata?.role || 'operator');
    };
    getRole();
  }, []);

  // 1. Menu for the SUPER ADMIN (The Boss)
  const adminMenu = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Operators', path: '/admin/operators', icon: <ShieldCheck size={20} /> },
    { name: 'Funding', path: '/admin/funding', icon: <Wallet size={20} /> },
  ];

  // 2. Menu for the OPERATOR (The Shop Owner)
  const operatorMenu = [
    { name: 'Shop Dashboard', path: '/operator/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'My Cashiers', path: '/operator/staff', icon: <Monitor size={20} /> },
    { name: 'Shop Wallet', path: '/operator/wallet', icon: <Wallet size={20} /> },
  ];

  // 3. Switch based on role
  const activeMenu = role === 'super_admin' ? adminMenu : operatorMenu;

  return (
    <div className="w-64 bg-slate-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-[#10b981] font-black tracking-tighter text-xl italic uppercase">
          {role === 'super_admin' ? 'LUCRA ADMIN' : 'SHOP OPERATOR'}
        </h2>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {activeMenu.map((item) => {
          const isActive = router.pathname === item.path;
          return (
            <Link 
              key={item.name} 
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                isActive 
                  ? 'bg-[#10b981] text-black' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/admin/login');
          }}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 font-bold text-sm hover:bg-red-400/10 rounded-xl transition-all"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
}
