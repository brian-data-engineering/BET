import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { Wallet, Users, LayoutDashboard, ArrowUpRight } from 'lucide-react';

export default function OperatorDashboard() {
  const [stats, setStats] = useState({ balance: 0, staffCount: 0, totalBets: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get Operator Balance
      const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      
      // Count Cashiers owned by this Operator
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
        .eq('parent_id', user.id).eq('role', 'cashier');

      setStats({
        balance: profile?.balance || 0,
        staffCount: count || 0,
        totalBets: 0 // Logic for bets table goes here later
      });
    };
    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div className="p-8 space-y-6 bg-[#0b0f1a] min-h-screen text-white">
        <h1 className="text-2xl font-black uppercase italic tracking-tighter">Shop Command Center</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Current Float" value={`KES ${stats.balance}`} icon={<Wallet className="text-[#10b981]" />} color="border-[#10b981]/20" />
          <StatCard title="Active Terminals" value={stats.staffCount} icon={<Users className="text-blue-500" />} color="border-blue-500/20" />
          <StatCard title="Today's Bets" value={stats.totalBets} icon={<ArrowUpRight className="text-purple-500" />} color="border-purple-500/20" />
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className={`bg-[#111926] p-6 rounded-[2rem] border ${color} shadow-xl`}>
      <div className="flex justify-between items-start mb-4">{icon}</div>
      <p className="text-[10px] font-black text-slate-500 uppercase italic">{title}</p>
      <h3 className="text-2xl font-black italic">{value}</h3>
    </div>
  );
}
