import { useEffect, useState, useContext } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout, { AdminContext } from '../../components/admin/AdminLayout';
import { 
  Ticket, 
  Users, 
  Wallet, 
  TrendingUp, 
  Activity, 
  PlusCircle, 
  ShieldCheck 
} from 'lucide-react';

export default function AdminDashboard() {
  const context = useContext(AdminContext);
  const profile = context?.profile; 
  
  const [stats, setStats] = useState({ 
    totalBets: 0, 
    totalVolume: 0, 
    managedAccounts: 0,
    recentBets: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // DEBUG 1: Check if context is providing the profile
    console.log("DEBUG: Dashboard Mount. Profile from Context:", profile);

    if (!profile) {
      console.log("DEBUG: Profile is missing. Still waiting for AdminLayout...");
      return;
    }

    const fetchLiveStats = async () => {
      console.log("DEBUG: Profile verified. Initiating data fetch for role:", profile.role);
      try {
        const isSuper = ['admin', 'super_admin'].includes(profile.role);

        let profilesQuery = supabase.from('profiles').select('balance', { count: 'exact' });
        
        if (!isSuper) {
          profilesQuery = profilesQuery.eq('parent_id', profile.id).eq('role', 'cashier');
        } else {
          profilesQuery = profilesQuery.eq('role', 'operator');
        }

        console.log("DEBUG: Executing Promise.all for Stats...");
        const [managedRes, betsRes, recentRes] = await Promise.all([
          profilesQuery,
          supabase.from('betsnow').select('*', { count: 'exact', head: true }),
          supabase.from('betsnow')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(8)
        ]);

        // DEBUG 2: Check for query errors
        if (managedRes.error) console.error("DEBUG: Profiles Query Error:", managedRes.error);
        if (betsRes.error) console.error("DEBUG: Bets Count Error:", betsRes.error);

        const volume = managedRes.data?.reduce((acc, c) => acc + parseFloat(c.balance || 0), 0) || 0;

        console.log("DEBUG: Fetch complete. Updating local state.");
        setStats({ 
          totalBets: betsRes.count || 0, 
          totalVolume: volume, 
          managedAccounts: managedRes.count || 0,
          recentBets: recentRes.data || []
        });
      } catch (err) {
        console.error("DEBUG: Dashboard Sync Catch-Block Error:", err);
      } finally {
        setLoading(false);
        console.log("DEBUG: Loading set to false.");
      }
    };

    fetchLiveStats();

    const betSubscription = supabase
      .channel('dashboard-live-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'betsnow' }, (payload) => {
        console.log("DEBUG: New Bet Inserted. Payload:", payload);
        fetchLiveStats(); 
      })
      .subscribe();

    return () => {
      console.log("DEBUG: Cleaning up Dashboard subscriptions.");
      supabase.removeChannel(betSubscription);
    };
  }, [profile]);

  // Loading Screen (The part that's hanging)
  if (!profile) {
    return (
      <AdminLayout>
        <div className="h-screen bg-[#0b0f1a] flex flex-col items-center justify-center gap-4">
          <Activity size={32} className="text-emerald-500 animate-pulse" />
          <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em]">
            Syncing Lucra Intelligence...
          </div>
          <p className="text-slate-500 text-[9px] italic">Check browser console if stuck here</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={16} className="text-[#10b981]" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">
                Network Intelligence
              </span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none">
              {profile.role?.includes('admin') ? 'Global Control' : 'Shop Command'}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 bg-[#10b981]/5 px-5 py-3 rounded-2xl border border-[#10b981]/10">
            <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-[#10b981] uppercase italic tracking-widest">
              Node: {profile.username || 'CONNECTED'}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Reserved" value={(profile.balance || 0).toLocaleString()} icon={<Wallet />} isMoney />
          <StatCard title="Volume" value={stats.totalVolume.toLocaleString()} icon={<TrendingUp />} isMoney color="text-[#10b981]" />
          <StatCard title="Bookings" value={stats.totalBets} icon={<Ticket />} />
          <StatCard title="Entities" value={stats.managedAccounts} icon={<Users />} />
        </div>

        {/* Table */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-[#111926] border border-white/5 rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center gap-3">
              <Activity size={20} className="text-[#10b981]" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em] italic text-slate-300">Live Transmission</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#0b0f1a]/50 text-slate-600 text-[9px] font-black uppercase tracking-widest italic">
                  <tr>
                    <th className="p-6">Serial</th>
                    <th className="p-6">Stake</th>
                    <th className="p-6 text-center">Odds</th>
                    <th className="p-6 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.recentBets.map((bet) => (
                    <tr key={bet.id} className="hover:bg-white/[0.02]">
                      <td className="p-6 font-black text-[#10b981] tracking-tighter uppercase italic text-sm">{bet.ticket_serial}</td>
                      <td className="p-6 text-slate-200 font-bold text-sm">KES {bet.stake}</td>
                      <td className="p-6 text-center font-mono text-white font-black text-sm">@{parseFloat(bet.total_odds || 0).toFixed(2)}</td>
                      <td className="p-6 text-right text-slate-500 text-[10px] font-black uppercase italic tracking-widest">
                        {new Date(bet.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Card */}
          <div className="bg-gradient-to-br from-[#10b981] to-[#059669] p-8 rounded-[2.5rem] text-black h-fit">
               <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Provisioning</h3>
               <p className="text-[10px] font-bold uppercase mb-6 italic opacity-80">Sync nodes or distribute float.</p>
               <button 
                 onClick={() => window.location.href = profile.role?.includes('admin') ? '/admin/operator' : '/operator/staff'} 
                 className="w-full bg-white text-black font-black py-4 rounded-2xl text-xs uppercase italic tracking-widest"
               >
                 {profile.role?.includes('admin') ? 'Manage Operators' : 'Manage Cashiers'}
               </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon, isMoney, color = "text-white" }) {
  return (
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
      <div className="absolute -top-4 -right-4 p-8 text-white opacity-[0.03] scale-150 rotate-12">{icon}</div>
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-3 italic">{title}</p>
      <p className={`text-3xl font-black tracking-tighter italic ${color}`}>
        {isMoney && <span className="text-sm mr-2 opacity-30 not-italic font-bold">KES</span>}
        {value}
      </p>
    </div>
  );
}
