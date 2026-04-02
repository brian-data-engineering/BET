import { useEffect, useState, useContext, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout, { AdminContext } from '../../components/admin/AdminLayout';
import { Ticket, Users, Wallet, TrendingUp, Activity, ShieldCheck, Zap, Database } from 'lucide-react';

export default function AdminDashboard() {
  const { profile } = useContext(AdminContext);
  const [stats, setStats] = useState({ 
    totalBets: 0, 
    networkVolume: 0, 
    managedAccounts: 0, 
    adminBalance: 0,
    recentBets: [] 
  });
  const [loading, setLoading] = useState(true);

  const fetchGlobalState = useCallback(async () => {
    try {
      // 1. Fetch Ledger entries to compute TRUTH for everyone
      // 2. Fetch Profiles for node count
      // 3. Fetch Bets for transmission data
      const [ledgerRes, profileRes, betsCount, recentBets] = await Promise.all([
        supabase.from('ledger').select('user_id, type, amount'),
        supabase.from('profiles').select('id, role').neq('role', 'super_admin'),
        supabase.from('betsnow').select('*', { count: 'exact', head: true }),
        supabase.from('betsnow').select('id, ticket_serial, stake, created_at').order('created_at', { ascending: false }).limit(8)
      ]);

      // COMPUTE BALANCES FROM LEDGER
      const calculateNet = (rows) => rows.reduce((acc, row) => 
        row.type === 'credit' ? acc + Number(row.amount) : acc - Number(row.amount), 0
      );

      // Total money circulating in the entire system (all non-admins)
      const totalNetworkVolume = calculateNet(ledgerRes.data || []);
      
      // Super Admin's specific balance
      const adminLedger = (ledgerRes.data || []).filter(r => r.user_id === profile?.id);
      const adminBalance = calculateNet(adminLedger);

      setStats({
        totalBets: betsCount.count || 0,
        networkVolume: totalNetworkVolume,
        managedAccounts: profileRes.data?.length || 0,
        adminBalance: adminBalance,
        recentBets: recentBets.data || []
      });
    } catch (e) {
      console.error("Lucra Global Sync Error:", e);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchGlobalState();

    // High-Frequency Realtime: Watch the Ledger and the Bets
    const sub = supabase.channel('lucra-core-stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ledger' }, () => fetchGlobalState())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'betsnow' }, () => fetchGlobalState())
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [fetchGlobalState]);

  return (
    <AdminLayout>
      <div className="p-8 space-y-10 bg-[#06080f] min-h-screen text-white font-sans">
        
        {/* TOP NAV / HEADER */}
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="bg-blue-500 p-1 rounded-sm">
                <Database size={14} className="text-white" />
              </div>
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] italic">Ledger Verified Engine</span>
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">
              Lucra Core
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-[9px] font-black text-slate-500 uppercase italic">Admin Authority</p>
                <p className="text-sm font-bold text-blue-500 uppercase">{profile?.username || 'ROOT'}</p>
              </div>
              <div className="h-12 w-[1px] bg-white/10 mx-2" />
              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                 <Activity className="text-blue-500 animate-pulse" size={20} />
              </div>
          </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Master Vault" 
            value={stats.adminBalance.toLocaleString()} 
            icon={<ShieldCheck className="text-blue-400" />} 
            isMoney 
            color="text-blue-400"
          />
          <StatCard 
            title="Network Liquidity" 
            value={stats.networkVolume.toLocaleString()} 
            icon={<TrendingUp className="text-[#10b981]" />} 
            color="text-[#10b981]" 
            isMoney 
          />
          <StatCard 
            title="Total Tickets" 
            value={stats.totalBets.toLocaleString()} 
            icon={<Ticket className="text-purple-400" />} 
          />
          <StatCard 
            title="Active Nodes" 
            value={stats.managedAccounts} 
            icon={<Users className="text-orange-400" />} 
          />
        </div>

        {/* DATA VISUALIZATION SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* RECENT ACTIVITY TABLE */}
          <div className="xl:col-span-2 bg-[#0c101d] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <Zap size={18} className="text-blue-500" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] italic text-slate-400">Live Ledger Feed</h2>
              </div>
              <span className="text-[9px] font-bold bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full uppercase italic">Immutable Logs</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] uppercase text-slate-600 font-black italic tracking-widest border-b border-white/5">
                    <th className="p-6">Ticket Serial</th>
                    <th className="p-6 text-center">Value</th>
                    <th className="p-6 text-right">Transmission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {stats.recentBets.map((bet) => (
                    <tr key={bet.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="p-6 font-black text-white group-hover:text-blue-500 transition-colors uppercase italic text-sm tracking-tight">
                        {bet.ticket_serial}
                      </td>
                      <td className="p-6 text-center">
                        <span className="bg-white/5 px-4 py-2 rounded-xl text-xs font-bold text-slate-300">
                          KES {Number(bet.stake).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-6 text-right text-[10px] font-black text-slate-500 uppercase italic">
                        {new Date(bet.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SIDEBAR ACTIONS */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-900 p-1 rounded-[2rem] shadow-lg shadow-blue-500/10">
              <div className="bg-[#0b0f1a] rounded-[1.9rem] p-8 h-full">
                <h3 className="text-xl font-black uppercase italic tracking-tighter mb-4 leading-none">Global Adjustments</h3>
                <p className="text-[10px] font-bold uppercase text-slate-500 leading-relaxed italic mb-8">
                  Directly modify ledger states for top-tier operators. Use only for manual funding or error corrections.
                </p>
                <button 
                  onClick={() => window.location.href = '/admin/operator'} 
                  className="w-full bg-blue-600 hover:bg-white text-white hover:text-black font-black py-5 rounded-2xl text-[10px] uppercase italic tracking-[0.2em] transition-all shadow-xl"
                >
                  Manage Operators
                </button>
              </div>
            </div>

            <div className="bg-[#0c101d] border border-white/5 rounded-[2rem] p-8">
               <h4 className="text-[10px] font-black text-slate-500 uppercase italic mb-4">Core Integrity</h4>
               <div className="space-y-3">
                  <StatusLine label="Ledger Hash" status="Verified" />
                  <StatusLine label="Transmission Link" status="Active" />
               </div>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}

function StatusLine({ label, status }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[8px] font-black text-blue-500 uppercase italic">{status}</span>
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, isMoney, color = "text-white" }) {
  return (
    <div className="bg-[#0c101d] p-8 rounded-[2rem] border border-white/5 relative group overflow-hidden transition-all hover:border-white/10">
      <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:opacity-20 transition-all group-hover:scale-110">
        {icon && <div className="p-8 scale-[2]">{icon}</div>}
      </div>
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mb-4 italic leading-none">{title}</p>
      <div className="flex items-baseline gap-1">
        {isMoney && <span className="text-[10px] font-black text-slate-600 mb-1">KES</span>}
        <p className={`text-3xl font-black italic tracking-tighter leading-none ${color}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
