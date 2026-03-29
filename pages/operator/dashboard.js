import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { Wallet, Users, TrendingUp, Activity, Loader2 } from 'lucide-react';

export default function OperatorDashboard() {
  const [stats, setStats] = useState({ balance: 0, staffCount: 0, totalBets: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async (userId) => {
    try {
      // 1. Fetch Operator Profile for Balance
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single();
      
      if (pError) console.error("Balance Fetch Error:", pError);

      // 2. Count Cashiers owned by this Operator
      const { count, error: cError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', userId)
        .eq('role', 'cashier');

      if (cError) console.error("Staff Count Error:", cError);

      console.log(`Dashboard Sync: Found ${count} nodes for Operator ${userId}`);

      setStats({
        balance: parseFloat(profile?.balance || 0),
        staffCount: count || 0,
        totalBets: 0 
      });
    } catch (err) {
      console.error("Dashboard Logic Crash:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetchStats(user.id);
      } else {
        setLoading(false);
      }
    };
    initDashboard();
  }, [fetchStats]);

  return (
    <ProtectedRoute allowedRoles={['operator']}>
      <AdminLayout>
        <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white font-sans">
          
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Shop Command Center</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 italic">Real-time Terminal Overview</p>
            </div>
            <div className="bg-[#111926] p-2 rounded-2xl border border-white/5 flex items-center gap-3 px-4">
               <div className={`w-2 h-2 rounded-full animate-pulse ${loading ? 'bg-yellow-500' : 'bg-[#10b981]'}`} />
               <span className="text-[10px] font-black uppercase italic text-slate-400 tracking-widest">
                 {loading ? "Synchronizing..." : "System Live"}
               </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard 
              title="Available Shop Float" 
              value={loading ? "---" : `KES ${stats.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
              subtitle="Ready for Distribution"
              icon={<Wallet size={24} className="text-[#10b981]" />} 
              color="border-[#10b981]/10" 
              bg="bg-[#10b981]/5"
            />
            <StatCard 
              title="Active Terminals" 
              value={loading ? "..." : stats.staffCount} 
              subtitle="Provisioned Cashier Nodes"
              icon={<Users size={24} className="text-blue-500" />} 
              color="border-blue-500/10" 
              bg="bg-blue-500/5"
            />
            <StatCard 
              title="Daily Volume" 
              value={stats.totalBets} 
              subtitle="Bets Processed Today"
              icon={<Activity size={24} className="text-purple-500" />} 
              color="border-purple-500/10" 
              bg="bg-purple-500/5"
            />
          </div>

          {/* Main Feed Section */}
          <div className="bg-[#111926] rounded-[2.5rem] border border-white/5 p-12 flex flex-col items-center justify-center text-center">
              {loading ? (
                <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
              ) : (
                <TrendingUp size={48} className="text-slate-800 mb-4 opacity-30" />
              )}
              <h3 className="text-slate-700 font-black uppercase text-xs tracking-[0.3em] italic">
                {loading ? "Fetching Node Data..." : "Live Market Feed Initializing..."}
              </h3>
              <p className="text-[10px] text-slate-800 font-bold uppercase mt-2 italic tracking-widest">
                Connect Scraper to begin data visualization
              </p>
          </div>

        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

function StatCard({ title, value, subtitle, icon, color, bg }) {
  return (
    <div className={`relative overflow-hidden bg-[#111926] p-8 rounded-[2.5rem] border ${color} shadow-2xl transition-transform hover:scale-[1.02] duration-300`}>
      <div className={`absolute top-0 right-0 w-32 h-32 ${bg} rounded-full -mr-16 -mt-16 blur-3xl opacity-50`} />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-[#0b0f1a] rounded-2xl border border-white/5">
            {icon}
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">{title}</p>
          <h3 className="text-3xl font-black italic tracking-tighter text-white">{value}</h3>
          <p className="text-[9px] font-bold text-slate-600 uppercase italic mt-2">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
