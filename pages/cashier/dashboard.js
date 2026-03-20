import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { Ticket, Search, User, LogOut } from 'lucide-react';

export default function CashierDashboard() {
  const [matches, setMatches] = useState([]);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Security Check: Only let Cashiers in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.app_metadata.role !== 'cashier') {
        router.push('/admin/login');
      }
    };
    checkUser();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Top Bar */}
      <nav className="border-b border-gray-800 p-4 flex justify-between items-center bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-lucra-green rounded-lg flex items-center justify-center">
            <Ticket size={20} className="text-black" />
          </div>
          <span className="font-black italic uppercase tracking-tighter">Lucra Cashier</span>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="text-gray-400 hover:text-white">
          <LogOut size={20} />
        </button>
      </nav>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Booking Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-4 text-gray-500" size={20} />
              <input 
                type="text" 
                placeholder="Search Match (Team, League, ID)..." 
                className="w-full bg-slate-900 border border-gray-800 p-4 pl-12 rounded-2xl focus:border-lucra-green outline-none"
              />
            </div>
            
            {/* Match List Placeholder */}
            <div className="bg-slate-900 border border-gray-800 rounded-[2rem] p-6 text-center text-gray-500">
              Live Matches will appear here for booking...
            </div>
          </div>

          {/* Current Slip */}
          <div className="bg-slate-900 border border-gray-800 rounded-[2rem] p-6 h-fit sticky top-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Ticket className="text-lucra-green" /> Betslip
            </h2>
            <div className="space-y-4 py-10 text-center border-2 border-dashed border-gray-800 rounded-2xl">
              <p className="text-xs text-gray-600 uppercase font-black">Empty Slip</p>
            </div>
            <button className="w-full mt-6 bg-lucra-green text-black font-black py-4 rounded-xl opacity-50 cursor-not-allowed">
              PRINT TICKET
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
