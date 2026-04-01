import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, 
  Wallet, 
  LogOut, 
  Monitor, 
  ShieldCheck, 
  Globe, 
  BarChart3 
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminSidebar() {
  const router = useRouter();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const currentRole = user?.app_metadata?.role || user?.user_metadata?.role || 'operator';
          setRole(currentRole);
        } else {
          router.push('/admin/login');
        }
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        setLoading(false);
      }
    };
    getRole();
  }, [router]);

  // --- SUPER ADMIN MENU (LUCRA CORE) ---
  const adminMenu = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Operators', path: '/admin/operator', icon: <ShieldCheck size={20} /> },
    { name: 'League Bridge', path: '/admin/mapping', icon: <Globe size={20} /> },
    { name: 'Funding', path: '/admin/funding', icon: <Wallet size={20} /> },
    { name: 'Network Audit', path: '/admin/reports', icon: <BarChart3 size={20} /> },
  ];

  // --- OPERATOR MENU (SHOP LEVEL) ---
  const operatorMenu = [
    { name: 'Shop Dashboard', path: '/operator/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'My Cashiers', path: '/operator/staff', icon: <Monitor size={20} /> },
    { name: 'Shop Wallet', path: '/operator/wallet', icon: <Wallet size={20} /> },
  ];

  const isSuperAdmin = role === 'super_admin';
  const activeMenu = isSuperAdmin ? adminMenu : operatorMenu;
  const label = isSuperAdmin ? 'LUCRA ADMIN' : 'SHOP OPERATOR';

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    window.location.href = '/admin/login'; 
  };

  if (loading) {
    return (
      <div className="w-64 bg-slate-900 border-r border-gray-800 flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-[#10b981]/20 border-t-[#10b981] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-64 bg-slate-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-[#10b981] font-black tracking-tighter text-xl italic uppercase">
          {label}
        </h2>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {activeMenu.map((item) => {
          const isActive = router.pathname === item.path;
          return (
            <Link 
              key={item.name} 
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                isActive 
                  ? 'bg-[#10b981] text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
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
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 font-bold text-sm hover:bg-red-400/10 rounded-xl transition-all"
        >
          <LogOut size={20} />
          Logout System
        </button>
      </div>
    </div>
  );
}
