import { useEffect, useState, useContext } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout, { AdminContext } from '../../components/admin/AdminLayout';
import { Ticket, Users, Wallet, TrendingUp, Activity, ShieldCheck } from 'lucide-react';

export default function AdminDashboard() {
  const { profile } = useContext(AdminContext);
  const [stats, setStats] = useState({ 
    totalBets: 0, totalVolume: 0, managedAccounts: 0, recentBets: [] 
  });

  const fetchEverything = async () => {
    try {
      // 1. Get ALL profiles that aren't the superadmin to calculate volume
      const { data: proms } = await supabase.from('profiles').select('balance').neq('role', 'super_admin');
      
      // 2. Get TOTAL bet count
      const { count } = await supabase.from('betsnow').select('*', { count: 'exact', head: true });

      // 3. Get LATEST bets
      const { data: recents } = await supabase.from('betsnow')
        .select('id, ticket_serial, stake, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      const vol = proms?.reduce((acc, curr) => acc + Number(curr.balance || 0), 0) || 0;

      setStats({
        totalBets: count || 0,
        totalVolume: vol,
        managedAccounts: proms?.length || 0,
        recentBets: recents || []
      });
    } catch (e) {
      console.error("System Error:", e);
    }
  };

  useEffect(() => {
    fetchEverything();

    // SIMPLE REALTIME - No complex filters
    const sub = supabase.channel('any').on('postgres_changes', 
      { event: '*', schema: 'public' }, () => fetchEverything()
    ).subscribe();

    return () => supabase.removeChannel(sub);
  }, []);

  return (
    <AdminLayout>
      <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter">System Overview</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Global Volume" value={stats.totalVolume.toLocaleString()} color="text-[#10b981]" isMoney />
          <StatCard title="Total Tickets" value={stats.totalBets} />
          <StatCard title="Active Nodes" value={stats.managedAccounts} />
        </div>

        <div className="bg-[#111926] border border-white/5 rounded-[2.5rem] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-[10px] uppercase text-slate-500 italic">
                <th className="p-6">Ticket</th>
                <th className="p-6">Stake</th>
                <th className="p-6 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.recentBets.map((bet) => (
                <tr key={bet.id}>
                  <td className="p-6 font-black text-[#10b981] italic">#{bet.ticket_serial}</td>
                  <td className="p-6 font-bold text-slate-200">KES {Number(bet.stake).toLocaleString()}</td>
                  <td className="p-6 text-right text-slate-500 text-xs">
                    {new Date(bet.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, color = "text-white", isMoney }) {
  return (
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5">
      <p className="text-slate-500 text-[10px] font-black uppercase italic mb-2">{title}</p>
      <p className={`text-3xl font-black italic ${color}`}>
        {isMoney && "KES "}{value}
      </p>
    </div>
  );
}
