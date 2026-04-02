import { useEffect, useState, useContext } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout, { AdminContext } from '../../components/admin/AdminLayout'; // Import Context
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
  // 1. STALENESS-FREE: Get live profile from our Layout Context
  const { profile } = useContext(AdminContext);
  
  const [stats, setStats] = useState({ 
    totalBets: 0, 
    totalVolume: 0, 
    managedAccounts: 0,
    recentBets: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const fetchLiveStats = async () => {
      try {
        const isSuper = ['admin', 'super_admin'].includes(profile.role);

        // 2. Hierarchy-aware queries
        let profilesQuery = supabase.from('profiles').select('balance', { count: 'exact' });
        
        // Filter managed accounts based on role
        if (!isSuper) {
          profilesQuery = profilesQuery.eq('parent_id', profile.id).eq('role', 'cashier');
        } else {
          profilesQuery = profilesQuery.eq('role', 'operator');
        }

        const [managedRes, betsRes, recentRes] = await Promise.all([
          profilesQuery,
          supabase.from('betsnow').select('*', { count: 'exact', head: true }), // Using betsnow
          supabase.from('betsnow')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(8)
        ]);

        const volume = managedRes.data?.reduce((acc, c) => acc + parseFloat(c.balance || 0), 0) || 0;

        setStats({ 
          totalBets: betsRes.count || 0, 
          totalVolume: volume, 
          managedAccounts: managedRes.count || 0,
          recentBets: recentRes.data || []
        });
      } catch (err) {
        console.error("Dashboard Intelligence Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveStats();

    // 3. REALTIME OBJECTIVE: Listen for new bets across the network
    const betSubscription = supabase
      .channel('live-bets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'betsnow' }, () => {
        fetchLiveStats(); // Refresh stats when a new bet is placed
      })
      .subscribe();

    return () => {
      supabase.removeChannel(betSubscription);
    };
  }, [profile]); // Re-run if profile/session changes

  if (!profile) return <div className="h-screen bg-[#0b0f1a]" />;

  return (
    <AdminLayout>
      <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex flex-col">
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
              System ID: {profile.username || 'NODE-ACTIVE'}
            </span>
          </div>
        </div>

        {/* Master Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Liquidity Reserved" 
            value={(profile.balance || 0).toLocaleString()} // READS FROM LIVE CONTEXT
            icon={<Wallet />} 
            isMoney 
            color="text-white"
          />
          <StatCard 
            title={profile.role?.includes('admin') ? "Network Volume" : "Deployed Float"} 
            value={stats.totalVolume.toLocaleString()} 
            icon={<TrendingUp />} 
            isMoney 
            color="text-[#10b981]"
          />
          <StatCard 
            title="Global Bookings" 
            value={stats.totalBets} 
            icon={<Ticket />} 
          />
          <StatCard 
            title={profile.role?.includes('admin') ? "Active Operators" : "Managed Terminals"} 
            value={stats.managedAccounts} 
            icon={<Users />} 
          />
        </div>

        {/* Dashboard Body */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Live Booking Feed */}
          <div className="xl:col-span-2 bg-[#111926] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <Activity size={20} className="text-[#10b981]" />
                <h2 className="text-sm font-black uppercase tracking-[0.2em] italic">Live Transmission</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#0b0f1a]/50 text-slate-600 text-[9px] font-black uppercase tracking-widest italic">
                  <tr>
                    <th className="p-6">Serial ID</th>
                    <th className="p-6">Stake</th>
                    <th className="p-6">Coefficient</th>
                    <th className="p-6 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.recentBets.map((bet) => (
                    <tr key={bet.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-6 font-black text-[#10b981] tracking-tighter uppercase italic text-sm">{bet.ticket_serial}</td>
                      <td className="p-6 text-slate-200 font-bold text-sm">
                         KES {bet.stake}
                      </td>
                      <td className="p-6 font-mono text-white font-black text-sm">
                        <span className="text-slate-600 mr-1 text-[10px]">@</span>
                        {parseFloat(bet.total_odds || 0).toFixed(2)}
                      </td>
                      <td className="p-6 text-right text-slate-500 text-[10px] font-black uppercase italic tracking-widest">
                        {new Date(bet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#10b981] to-[#059669] p-8 rounded-[2.5rem] text-black relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-20">
                 <PlusCircle size={80} className="rotate-12 group-hover:rotate-45 transition-transform duration-500" />
               </div>
               <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2 relative z-10">Network Hub</h3>
               <p className="text-[10px] font-bold uppercase leading-relaxed mb-6 opacity-80 relative z-10 italic">
                 Manage nodes and distribute float across your network instantly.
               </p>
               <button onClick={() => window.location.href = profile.role?.includes('admin') ? '/admin/operator' : '/operator/staff'} className="w-full bg-white text-black font-black py-4 rounded-2xl text-xs uppercase italic tracking-widest hover:shadow-2xl transition-all active:scale-95 relative z-10">
                 {profile.role?.includes('admin') ? 'Manage Operators' : 'Manage Cashiers'}
               </button>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}

// Sub-component for Stats
function StatCard({ title, value, icon, isMoney, color = "text-white" }) {
  return (
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
      <div className="absolute -top-4 -right-4 p-8 text-white opacity-[0.03] group-hover:opacity-[0.08] transition-opacity scale-150 rotate-12">
        {icon}
      </div>
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-3 italic">{title}</p>
      <p className={`text-3xl font-black tracking-tighter italic ${color}`}>
        {isMoney && <span className="text-sm mr-2 opacity-30 not-italic">KES</span>}
        {value}
      </p>
    </div>
  );
}
