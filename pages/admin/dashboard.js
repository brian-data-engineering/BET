import { useEffect, useState, useContext } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout, { AdminContext } from '../../components/admin/AdminLayout';
import { Ticket, Users, Wallet, TrendingUp, Activity, ShieldCheck, Zap } from 'lucide-react';

export default function AdminDashboard() {
  const { profile } = useContext(AdminContext);
  const [stats, setStats] = useState({ 
    totalBets: 0, totalVolume: 0, managedAccounts: 0, recentBets: [] 
  });

  const fetchEverything = async () => {
    try {
      // 1. Get ALL profiles except superadmin to calculate Network Volume
      const { data: proms } = await supabase.from('profiles')
        .select('balance, role')
        .neq('role', 'super_admin');
      
      // 2. Get Global Ticket Count
      const { count } = await supabase.from('betsnow').select('*', { count: 'exact', head: true });

      // 3. Get Recent Transmissions
      const { data: recents } = await supabase.from('betsnow')
        .select('id, ticket_serial, stake, created_at')
        .order('created_at', { ascending: false })
        .limit(8);

      const vol = proms?.reduce((acc, curr) => acc + Number(curr.balance || 0), 0) || 0;

      setStats({
        totalBets: count || 0,
        totalVolume: vol,
        managedAccounts: proms?.length || 0,
        recentBets: recents || []
      });
    } catch (e) {
      console.error("Lucra Sync Error:", e);
    }
  };

  useEffect(() => {
    fetchEverything();

    // High-Frequency Realtime Channel
    const sub = supabase.channel('lucra-core-stream')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => fetchEverything())
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, []);

  return (
    <AdminLayout>
      <div className="p-8 space-y-10 bg-[#06080f] min-h-screen text-white font-sans">
        
        {/* TOP NAV / HEADER */}
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="bg-[#10b981] p-1 rounded-sm">
                <ShieldCheck size={14} className="text-black" />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">System Core</span>
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">
              Lucra Engine
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="text-right hidden md:block">
               <p className="text-[9px] font-black text-slate-500 uppercase italic">Operator Signature</p>
               <p className="text-sm font-bold text-[#10b981] uppercase">{profile?.username || 'ROOT_USER'}</p>
             </div>
             <div className="h-12 w-[1px] bg-white/10 mx-2" />
             <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                <Activity className="text-[#10b981] animate-pulse" size={20} />
             </div>
          </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Operational Float" 
            value={(profile?.balance || 0).toLocaleString()} 
            icon={<Wallet className="text-blue-400" />} 
            isMoney 
          />
          <StatCard 
            title="Network Volume" 
            value={stats.totalVolume.toLocaleString()} 
            icon={<TrendingUp className="text-[#10b981]" />} 
            color="text-[#10b981]" 
            isMoney 
          />
          <StatCard 
            title="Total Bookings" 
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
                <Zap size={18} className="text-[#10b981]" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] italic text-slate-400">Live Transmissions</h2>
              </div>
              <span className="text-[9px] font-bold bg-[#10b981]/10 text-[#10b981] px-3 py-1 rounded-full uppercase italic">Realtime Active</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] uppercase text-slate-600 font-black italic tracking-widest border-b border-white/5">
                    <th className="p-6">Serial ID</th>
                    <th className="p-6 text-center">Stake Value</th>
                    <th className="p-6 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {stats.recentBets.map((bet) => (
                    <tr key={bet.id} className="group hover:bg-white/[0.02] transition-colors cursor-crosshair">
                      <td className="p-6 font-black text-white group-hover:text-[#10b981] transition-colors uppercase italic text-sm tracking-tight">
                        {bet.ticket_serial}
                      </td>
                      <td className="p-6 text-center">
                        <span className="bg-white/5 px-4 py-2 rounded-xl text-xs font-bold text-slate-300">
                          KES {Number(bet.stake).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                         <p className="text-[10px] font-black text-slate-500 uppercase italic">
                           {new Date(bet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                         </p>
                      </td>
                    </tr>
                  ))}
                  {stats.recentBets.length === 0 && (
                    <tr>
                      <td colSpan="3" className="p-24 text-center">
                        <p className="text-[10px] font-black text-slate-700 uppercase italic tracking-[0.8em]">Listening for Data...</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SIDEBAR ACTIONS */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#10b981] to-[#059669] p-1 rounded-[2rem] shadow-lg shadow-[#10b981]/10">
              <div className="bg-[#0b0f1a] rounded-[1.9rem] p-8 h-full">
                <h3 className="text-xl font-black uppercase italic tracking-tighter mb-4 leading-none">Node Provisioning</h3>
                <p className="text-[10px] font-bold uppercase text-slate-500 leading-relaxed italic mb-8">
                  Authorize new terminal nodes or manage existing operator credentials across the network.
                </p>
                <button 
                  onClick={() => window.location.href = '/admin/operator'} 
                  className="w-full bg-[#10b981] hover:bg-white text-black font-black py-5 rounded-2xl text-[10px] uppercase italic tracking-[0.2em] transition-all active:scale-95 shadow-xl"
                >
                  Enter Management
                </button>
              </div>
            </div>

            <div className="bg-[#0c101d] border border-white/5 rounded-[2rem] p-8">
               <h4 className="text-[10px] font-black text-slate-500 uppercase italic mb-4">Security Protocol</h4>
               <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[9px] font-bold text-slate-400">SSL ENCRYPTION</span>
                    <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[9px] font-bold text-slate-400">DB HANDSHAKE</span>
                    <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                  </div>
               </div>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
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
