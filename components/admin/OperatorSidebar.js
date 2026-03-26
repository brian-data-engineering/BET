import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutDashboard, Monitor, Wallet, FileText, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function OperatorSidebar() {
  const router = useRouter();
  const [username, setUsername] = useState('');

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUsername(user.user_metadata?.username || 'Shop Owner');
    };
    getProfile();
  }, []);

  const menuItems = [
    { name: 'Dashboard', path: '/operator/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'My Staff', path: '/operator/staff', icon: <Monitor size={20} /> },
    { name: 'Shop Wallet', path: '/operator/wallet', icon: <Wallet size={20} /> },
    { name: 'Sales Logs', path: '/operator/reports', icon: <FileText size={20} /> },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login'); // Or your specific operator login page
  };

  return (
    <div className="w-64 bg-[#0b0f1a] border-r border-white/5 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-white/5">
        <h2 className="text-[#10b981] font-black tracking-tighter text-xl italic uppercase">LUCRA SHOP</h2>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{username}</p>
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
                  ? 'bg-[#10b981] text-black' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 font-bold text-sm hover:bg-red-400/10 rounded-xl transition-all"
        >
          <LogOut size={20} />
          Logout Shop
        </button>
      </div>
    </div>
  );
}
