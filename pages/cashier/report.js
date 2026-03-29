import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  RefreshCcw,
  BarChart3,
  ShieldCheck
} from 'lucide-react';

export default function CashierReport() {
  const [stats, setStats] = useState({ sales: 0, payouts: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const fetchTodayStats = useCallback(async () => {
    setLoading(true);
    
    // Set Time to exactly 00:00:00 of the current day in local time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isoToday = today.toISOString();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch all ACTIVE tickets (Sales) for THIS cashier today
      const { data: salesData, error: salesErr } = await supabase
        .from('betsnow')
        .select('stake')
        .eq('cashier_id', user.id)
        .eq('status', 'active') // Only count real tickets, not bookings
        .gte('created_at', isoToday);

      // 2. Fetch all PAYOUTS (Winnings paid out) for THIS cashier today
      // Note: This uses 'paid_at' to track when the cash actually left the drawer
      const { data: payoutData, error: payErr } = await supabase
        .from('betsnow')
        .select('potential_payout')
        .eq('paid_by', user.id) // Track who actually gave the customer the cash
        .eq('is_paid', true)
        .gte('paid_at', isoToday);

      if (salesErr || payErr) throw new Error("Data Retrieval Failed");

      // Calculate Totals
      const totalSales = (salesData || []).reduce((acc, curr) => acc + parseFloat(curr.stake || 0), 0);
      const totalPayouts = (payoutData || []).reduce((acc, curr) => acc + parseFloat(curr.potential_payout || 0), 0);

      setStats({
        sales: totalSales,
        payouts: totalPayouts,
        count: (salesData || []).length
      });
    } catch (error) {
      console.error("Shift Audit Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayStats();
  }, [fetchTodayStats]);

  const netBalance = stats.sales - stats.payouts;

  return (
    <CashierLayout>
      <div className="p-8 max-w-5xl mx-auto bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* Header Section */}
        <div className="flex justify-between items-end mb-12">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#10b981] mb-2">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Secure Terminal Report</span>
            </div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white">Shift Audit</h1>
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar size={14} />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] italic">Station: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          
          <button 
            onClick={fetchTodayStats}
            disabled={loading}
            className="group p-5 bg-[#111926] border border-white/5 rounded-3xl hover:border-[#10b981]/30 transition-all disabled:opacity-50 shadow-xl"
          >
            <RefreshCcw size={22} className={`${loading ? "animate-spin" : "group-hover:rotate-180"} transition-transform duration-500 text-[#10b981]`} />
          </button>
        </div>

        {/* High-Level Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard 
            icon={<TrendingUp size={24} className="text-[#10b981]" />} 
            label="Total Stakes (In)" 
            value={stats.sales} 
            trend="Gross Revenue"
          />
          <StatCard 
            icon={<TrendingDown size={24} className="text-red-500" />} 
            label="Total Payouts (Out)" 
            value={stats.payouts} 
            trend="Winnings Paid"
          />
          <StatCard 
            icon={<Wallet size={24} className="text-blue-500" />} 
            label="Drawer Net" 
            value={netBalance} 
            isHighlight
            color={netBalance >= 0 ? "text-[#10b981]" : "text-red-500"}
          />
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-[#111926] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />
          
          <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-8">
            <div className="p-3 bg-white/5 rounded-2xl">
              <BarChart3 className="text-blue-500" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tight text-white">Reconciliation Summary</h2>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Valid for current session only</p>
            </div>
          </div>

          <div className="space-y-8">
            <ReportLine label="Tickets Issued (Volume)" value={stats.count} />
            <ReportLine label="Total Cash Collected" value={`KES ${stats.sales.toLocaleString(undefined, {minimumFractionDigits: 2})}`} />
            <ReportLine label="Total Cash Disbursed" value={`KES ${stats.payouts.toLocaleString(undefined, {minimumFractionDigits: 2})}`} />
            
            <div className="pt-10 border-t border-white/5 flex justify-between items-end">
              <div>
                <span className="text-[10px] font-black uppercase italic text-slate-500 block mb-1">Expected Drawer Cash</span>
                <span className="text-sm font-bold text-slate-400">Total Sales - Total Payouts</span>
              </div>
              <div className="text-right">
                <span className={`text-4xl font-black italic tabular-nums ${netBalance >= 0 ? 'text-[#10b981]' : 'text-red-500'}`}>
                  KES {netBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center gap-2 opacity-30">
          <div className="h-[1px] w-24 bg-slate-700" />
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.6em] italic text-center">
            Lucra Terminal OS • Secure Audit Path
          </p>
        </div>
      </div>
    </CashierLayout>
  );
}

function StatCard({ icon, label, value, color = "text-white", isHighlight = false, trend }) {
  return (
    <div className={`bg-[#111926] p-8 rounded-[2.5rem] border ${isHighlight ? 'border-blue-500/20' : 'border-white/5'} shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all`}>
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 bg-[#0b0f1a] rounded-2xl border border-white/5">
          {icon}
        </div>
        <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">{trend}</span>
      </div>
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic mb-1">{label}</p>
      <h3 className={`text-3xl font-black italic tracking-tighter ${color} tabular-nums`}>
        <span className="text-xs mr-2 opacity-40 not-italic font-bold">KES</span>
        {parseFloat(value || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
      </h3>
    </div>
  );
}

function ReportLine({ label, value }) {
  return (
    <div className="flex justify-between items-center group py-1">
      <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors italic">{label}</span>
      <span className="text-lg font-black italic text-white tabular-nums">{value}</span>
    </div>
  );
}
