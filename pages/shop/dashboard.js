import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ShopLayout from '../../components/shop/ShopLayout';
import { 
  TrendingUp, 
  Users, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Activity,
  Loader2,
  RefreshCcw
} from 'lucide-react';

export default function ShopDashboard() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalCashiers: 0,
    floorFloat: 0,
    recentTransfers: []
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch Shop Profile
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(p);

    // 2. Fetch Cashiers and Calculate Floor Float
    const { data: cashiers } = await supabase.from('profiles')
      .select('balance')
      .eq('parent_id', user.id)
      .eq('role', 'cashier');

    const floorFloat = cashiers?.reduce((acc, c) => acc + (parseFloat(c.balance) || 0), 0) || 0;

    // 3. Fetch Recent Transfers (Last 5)
    const { data: transfers } = await supabase.from('transfers')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(5);

    setStats({
      totalCashiers: cashiers?.length || 0,
      floorFloat,
      recentTransfers: transfers || []
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <ShopLayout profile={profile}>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white">
        
        {/* TOP ROW: HEADER & REFRESH */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Terminal Overview</h1>
            <p className="text-emerald-500 font-black uppercase text-[10px] tracking-[0.3em] mt-2 italic">Branch Management System</p>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="p-4 bg-[#111926] border border-white/5 rounded-2xl hover:bg-emerald-600 hover:text-black transition-all"
          >
            <RefreshCcw size={20} />
          </button>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Available Branch Float" 
            value={`KES ${parseFloat(profile?.balance || 0).toLocaleString()}`} 
            icon={<Wallet className="text-emerald-500" />}
            subtitle="Liquidity ready for dispatch"
          />
          <StatCard 
            title="Active Floor Float" 
            value={`KES ${stats.floorFloat.toLocaleString()}`} 
            icon={<TrendingUp className="text-blue-500" />}
            subtitle={`Distributed across ${stats.totalCashiers} cashiers`}
          />
          <StatCard 
            title="Active Terminals" 
            value={stats.totalCashiers} 
            icon={<Users className="text-purple-500" />}
            subtitle="Registered cashier nodes"
          />
        </div>

        {/* BOTTOM ROW: RECENT ACTIVITY */}
        <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 flex items-center gap-3">
            <Activity size={20} className="text-emerald-500" />
            <h2 className="text-xs font-black uppercase italic tracking-[0.2em]">Recent Network Traffic</h2>
          </div>
          <div className="divide-y divide-white/5">
            {stats.recentTransfers.length > 0 ? stats.recentTransfers.map((tx) => (
              <div key={tx.id} className="p-6 flex justify-between items-center hover:bg-white/[0.01] transition-all">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${tx.sender_id === profile.id ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                    {tx.sender_id === profile.id ? 
                      <ArrowUpRight size={18} className="text-red-500" /> : 
                      <ArrowDownLeft size={18} className="text-emerald-500" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase italic">
                      {tx.sender_id === profile.id ? 'Dispatch to Terminal' : 'Inbound from Agent'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-black italic ${tx.sender_id === profile.id ? 'text-red-500' : 'text-[#10b981]'}`}>
                    {tx.sender_id === profile.id ? '-' : '+'} KES {parseFloat(tx.amount).toLocaleString()}
                  </p>
                </div>
              </div>
            )) : (
              <div className="p-20 text-center text-slate-700 font-black uppercase tracking-[0.4em] text-xs italic">
                No recent transaction logs detected
              </div>
            )}
          </div>
        </div>
      </div>
    </ShopLayout>
  );
}

function StatCard({ title, value, icon, subtitle }) {
  return (
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 shadow-xl space-y-4">
      <div className="flex justify-between items-start">
        <div className="bg-black/40 p-3 rounded-xl border border-white/5">
          {icon}
        </div>
      </div>
      <div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{title}</span>
        <h3 className="text-3xl font-black italic tracking-tighter text-white">{value}</h3>
        <p className="text-[9px] font-bold text-slate-600 uppercase mt-2 tracking-wide">{subtitle}</p>
      </div>
    </div>
  );
}
