import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AgentLayout from '../../components/agent/AgentLayout';
import AgentStatCard from '../../components/agent/AgentStatCard';
import { Wallet, Users, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function AgentDashboard() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ cashierCount: 0, totalNetworkFloat: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAgentData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Get Agent Profile
    const { data: agentProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(agentProfile);

    // 2. Get Cashier Stats
    const { data: cashiers } = await supabase.from('profiles')
      .select('balance')
      .eq('parent_id', user.id)
      .eq('role', 'cashier');

    // 3. Get Recent Activity (Dispatches received and sent)
    const { data: logs } = await supabase.from('ledger')
      .select('*, sender:profiles!ledger_user_id_fkey(username)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    setStats({
      cashierCount: cashiers?.length || 0,
      totalNetworkFloat: cashiers?.reduce((acc, c) => acc + (c.balance || 0), 0) || 0
    });
    setRecentLogs(logs || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgentData();
    // Realtime sync for balance updates
    const channel = supabase.channel('agent-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchAgentData())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchAgentData]);

  if (loading) return <div className="h-screen bg-[#0b0f1a] flex items-center justify-center text-blue-500">Initializing Hub...</div>;

  return (
    <AgentLayout profile={profile}>
      <div className="p-8 space-y-10">
        <header>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter">Network Overview</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Agent Level Operations</p>
        </header>

        {/* STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AgentStatCard 
            label="My Available Float" 
            value={`KES ${parseFloat(profile?.balance || 0).toLocaleString()}`} 
            icon={Wallet} 
            color="green" 
          />
          <AgentStatCard 
            label="Cashiers Deployed" 
            value={stats.cashierCount} 
            icon={Users} 
            color="blue" 
          />
          <AgentStatCard 
            label="Locked in Terminals" 
            value={`KES ${stats.totalNetworkFloat.toLocaleString()}`} 
            icon={Activity} 
            color="blue" 
          />
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-[#111926] rounded-[3rem] border border-white/5 p-10 shadow-2xl">
          <h2 className="text-[10px] font-black uppercase text-slate-500 italic tracking-widest mb-8">Recent Ledger Activity</h2>
          <div className="space-y-4">
            {recentLogs.map(log => (
              <div key={log.id} className="flex justify-between items-center p-6 bg-[#0b0f1a] rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${log.type === 'credit' ? 'bg-green-500/10 text-green-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {log.type === 'credit' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  </div>
                  <div>
                    <span className="font-black uppercase italic text-sm block">
                      {log.type === 'credit' ? 'Float Received' : 'Dispatch to Terminal'}
                    </span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <span className={`text-lg font-black italic ${log.type === 'credit' ? 'text-green-500' : 'text-rose-500'}`}>
                  {log.type === 'credit' ? '+' : '-'}KES {parseFloat(log.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AgentLayout>
  );
}
