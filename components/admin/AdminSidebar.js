import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutDashboard, Users, Wallet, FileText, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminSidebar() {
  const router = useRouter();

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Cashiers', path: '/admin/cashiers', icon: <Users size={20} /> },
    { name: 'Funding', path: '/admin/funding', icon: <Wallet size={20} /> },
    { name: 'Reports', path: '/admin/reports', icon: <FileText size={20} /> },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <div className="w-64 bg-slate-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-lucra-green font-black tracking-tighter text-xl italic">LUCRA ADMIN</h2>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = router.pathname === item.path;
          return (
            <Link 
              key={item.name} 
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                isActive 
                  ? 'bg-lucra-green text-black' 
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
          Logout
        </button>
      </div>
    </div>
  );
}
