import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout'; // You'll create this or use a simple wrapper

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalBets: 0, totalVolume: 0, activeCashiers: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const { count: betsCount } = await supabase.from('booked_bets').select('*', { count: 'exact', head: true });
      const { data: cashiers } = await supabase.from('profiles').select('balance').eq('role', 'cashier');
      
      const volume = cashiers?.reduce((acc, c) => acc + parseFloat(c.balance), 0) || 0;
      setStats({ totalBets: betsCount || 0, totalVolume: volume, activeCashiers: cashiers?.length || 0 });
    };
    fetchStats();
  }, []);

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-white">
      <h1 className="text-2xl font-black uppercase mb-8 text-lucra-green">System Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl border border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase">Total Booked Bets</p>
          <p className="text-3xl font-black">{stats.totalBets}</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase">Cashier Float Pool</p>
          <p className="text-3xl font-black text-lucra-green">${stats.totalVolume.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-gray-800">
          <p className="text-gray-500 text-xs font-bold uppercase">Active Cashiers</p>
          <p className="text-3xl font-black">{stats.activeCashiers}</p>
        </div>
      </div>
    </div>
  );
}
