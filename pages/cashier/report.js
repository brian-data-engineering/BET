import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  RefreshCcw,
  BarChart3
} from 'lucide-react';

export default function CashierReport() {
  const [stats, setStats] = useState({ sales: 0, payouts: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const fetchTodayStats = async () => {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isoToday = today.toISOString();

    try {
      // 1. Fetch Sales (Stakes) from BOTH tables
      const [salesNow, salesSettled] = await Promise.all([
        supabase.from('betsnow').select('stake').gte('created_at', isoToday),
        supabase.from('tickets').select('stake').gte('created_at', isoToday)
      ]);

      // 2. Fetch Payouts (Paid tickets) from BOTH tables
      const [payoutsNow, payoutsSettled] = await Promise.all([
        supabase.from('betsnow').select('potential_payout').eq('is_paid', true).gte('paid_at', isoToday),
        supabase.from('tickets').select('potential_payout').eq('is_paid', true).gte('paid_at', isoToday)
      ]);

      // Combine Data
      const allSales = [...(salesNow.data || []), ...(salesSettled.data || [])];
      const allPayouts = [...(payoutsNow.data || []), ...(payoutsSettled.data || [])];

      const totalSales = allSales.reduce((acc, curr) => acc + parseFloat(curr.stake || 0), 0);
      const totalPayouts = allPayouts.reduce((acc, curr) => acc + parseFloat(curr.potential_payout || 0), 0);

      setStats({
        sales: totalSales,
        payouts: totalPayouts,
        count: allSales.length
      });
    } catch (error) {
      console.error("Financial Audit Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayStats();
  }, []);

  const netBalance = stats.sales - stats.payouts;

  return (
    <CashierLayout>
      <div className="p-8 max-w-5xl mx-auto bg-[#0b0f1a] min-h-screen text-white">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">Shift Audit</h1>
            <div className="flex items-center gap-2 text-slate-500 mt-1">
              <Calendar size={14} />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Today's Performance</p>
            </div>
          </div>
          <button 
            onClick={fetchTodayStats}
            disabled={loading}
            className="p-4 bg-[#111926] border border-white/5 rounded-2xl hover:bg-white hover:text-black transition-all disabled:opacity-50"
          >
            <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard 
            icon={<TrendingUp className="text-[#10b981]" />} 
            label="Total Sales" 
            value={stats.sales} 
            color="text-white"
          />
          <StatCard 
            icon={<TrendingDown className="text-red-500" />} 
            label="Total Payouts" 
            value={stats.payouts} 
            color="text-red-500"
          />
          <StatCard 
            icon={<Wallet className="text-blue-500" />} 
            label="Net Balance" 
            value={netBalance} 
            color={netBalance >= 0 ? "text-[#10b981]" : "text-red-500"}
          />
        </div>

        {/* Detailed Breakdown Section */}
        <div className="bg-[#111926] border border-white/5 rounded-[3rem] p-10 shadow-2xl">
          <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
            <BarChart3 className="text-slate-500" size={24} />
            <h2 className="text-xl font-black italic uppercase tracking-tight">System Summary</h2>
          </div>

          <div className="space-y-6">
            <ReportLine label="Total Tickets Issued" value={stats.count} />
            <ReportLine label="Cash In (KES)" value={stats.sales.toLocaleString()} />
            <ReportLine label="Cash Out (KES)" value={stats.payouts.toLocaleString()} />
            <div className="pt-6 border-t border-white/5 flex justify-between items-center">
              <span className="text-sm font-black uppercase italic text-slate-400">Drawer Reconciliation</span>
              <span className={`text-2xl font-black italic ${netBalance >= 0 ? 'text-[#10b981]' : 'text-red-500'}`}>
                KES {netBalance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.5em] italic">
            Confidential Financial Record • Lucra Network
          </p>
        </div>
      </div>
    </CashierLayout>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic mb-2">{label}</p>
      <h3 className={`text-3xl font-black italic tracking-tighter ${color}`}>
        <span className="text-xs mr-1 opacity-50">KES</span>
        {parseFloat(value || 0).toLocaleString()}
      </h3>
    </div>
  );
}

function ReportLine({ label, value }) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-300 transition-colors">{label}</span>
      <span className="text-sm font-black italic text-white">{value}</span>
    </div>
  );
}
