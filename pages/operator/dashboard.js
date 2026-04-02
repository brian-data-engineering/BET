import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { Wallet, Users, TrendingUp, Activity, Loader2, Zap } from 'lucide-react';

export default function OperatorDashboard() {
  const [stats, setStats] = useState({ balance: 0, staffCount: 0, totalBets: 0 });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // 1. Optimized Data Fetcher
  const fetchDashboardData = useCallback(async (userId) => {
    try {
      const [profileRes, staffRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('balance')
          .eq('id', userId)
          .single(),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', userId)
          .eq('role', 'cashier')
      ]);

      setStats({
        balance: parseFloat(profileRes.data?.balance || 0),
        staffCount: staffRes.count || 0,
        totalBets: 0 // Placeholder for future betting logic
      });
    } catch (err) {
      console.error("Critical Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser && isMounted) {
        setUser(authUser);
        await fetchDashboardData(authUser.id);

        // 2. THE STALENESS KILLER: Real-time Subscription
        // Listen for balance updates (from Admin funding or Cashier actions)
        const channel = supabase
          .channel(`operator-sync-${authUser.id}`)
          .on('postgres_changes', 
            { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'profiles', 
              filter: `id=eq.${authUser.id}` 
            }, 
            (payload) => {
              setStats(prev => ({ ...prev, balance: parseFloat(payload.new.balance) }));
            }
          )
          .subscribe();

        return () => supabase.removeChannel(channel);
      }
    };

    init();
    return () => { isMounted = false; };
  }, [fetchDashboardData]);

  return (
    <OperatorLayout>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* Header Section */}
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="text-[#10b981]" size={14} />
              <span className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.4em] italic">Systems Nominal</span>
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">
              Terminal <span className="text-slate-700">01</span>
            </h1>
          </div>
          
          <div className="bg-[#111926] p-4 rounded-2xl border border-white/5 flex items-center gap-3 px-6 shadow-2xl">
              <div className={`w-2 h-2 rounded-full shadow-[0_0_10px] ${loading ? 'bg-yellow-500 shadow-yellow-500' : 'bg-[#10b981] shadow-[#10b981] animate-pulse'}`} />
              <span className="text-[10px] font-black uppercase italic text-slate-400 tracking-widest">
                {loading ? "Syncing..." : "Live Feed Active"}
              </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatCard 
            title="Shop Liquidity" 
            value={loading ? "..." : `KES ${stats.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
            subtitle="Total Available Reservoir"
            icon={<Wallet size={24} className="text-[#10b981]" />} 
            color="border-[#10b981]/20" 
            bg="bg-[#10b981]/10"
          />
          <StatCard 
            title="Provisioned Nodes" 
            value={loading ? "..." : stats.staffCount} 
            subtitle="Active Cashier Terminals"
            icon={<Users size={24} className="text-blue-500" />} 
            color="border-blue-500/20" 
            bg="bg-blue-500/10"
          />
          <StatCard 
            title="Total Volume" 
            value={stats.totalBets} 
            subtitle="Processed Operations"
            icon={<Activity size={24} className="text-purple-500" />} 
            color="border-purple-500/20" 
            bg="bg-purple-500/10"
          />
        </div>

        {/* Market Feed Status */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#10b981]/20 to-blue-500/20 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-[#111926] rounded-[3rem] border border-white/5 p-20 flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden">
              {/* Decorative scanline effect */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20" />
              
              {loading ? (
                <Loader2 className="animate-spin text-[#10b981] mb-6" size={48} />
              ) : (
                <TrendingUp size={48} className="text-[#10b981] mb-6 animate-pulse" />
              )}
              
              <h3 className="text-white font-black uppercase text-sm tracking-[0.5em] italic">
                {loading ? "Establishing Link..." : "Encrypted Market Feed"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-4 italic tracking-widest max-w-sm leading-relaxed">
                Aggregating real-time data from internal scrape nodes. Standby for visualization generation.
              </p>
          </div>
        </div>

      </div>
    </OperatorLayout>
  );
}

function StatCard({ title, value, subtitle, icon, color, bg }) {
  return (
    <div className={`relative overflow-hidden bg-[#111926] p-10 rounded-[3rem] border ${color} shadow-2xl group transition-all hover:scale-[1.02] hover:bg-[#151f2e]`}>
      <div className={`absolute top-0 right-0 w-40 h-40 ${bg} rounded-full -mr-20 -mt-20 blur-[80px] opacity-30 transition-opacity group-hover:opacity-60`} />
      
      <div className="relative z-10 space-y-8">
        <div className="p-4 bg-[#0b0f1a] w-fit rounded-2xl border border-white/5 shadow-inner">
          {icon}
        </div>
        
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase italic tracking-[0.3em]">{title}</p>
          <h3 className="text-4xl font-black italic tracking-tighter text-white">{value}</h3>
          <div className="flex items-center gap-2 mt-4">
             <div className="h-[1px] w-4 bg-[#10b981]/50" />
             <p className="text-[9px] font-bold text-slate-600 uppercase italic tracking-tighter">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
