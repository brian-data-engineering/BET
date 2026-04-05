import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import { TrendingUp, TrendingDown, RefreshCcw, ShieldCheck, Loader2, BarChart3, Calendar, PieChart } from 'lucide-react';

export default function CashierReport() {
  // Simplified state to match the new 4-column SQL function
  const [stats, setStats] = useState({ 
    sales: 0, 
    payouts: 0, 
    profit: 0, 
    count: 0 
  });
  const [loading, setLoading] = useState(true);
  // Date state for "every single day" reporting (defaults to today)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Passing both cashier_id and the selected date
      const { data, error } = await supabase.rpc('get_daily_cashier_report', { 
        p_cashier_id: user.id,
        p_date: selectedDate
      });

      if (error) throw error;

      if (data && data[0]) {
        setStats({
          count: parseInt(data[0].total_tickets || 0),
          sales: parseFloat(data[0].total_sales || 0),
          payouts: parseFloat(data[0].total_payouts || 0),
          profit: parseFloat(data[0].net_profit || 0)
        });
      }
    } catch (err) {
      console.error("Report Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]); // Re-fetch whenever the date changes

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <CashierLayout>
      <div className="p-8 max-w-5xl mx-auto bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 text-[#10b981] mb-2">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest italic">P&L Audit Mode</span>
            </div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter">Shift Audit</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Picker for Daily Reports */}
            <div className="bg-[#111926] p-4 rounded-3xl border border-white/5 flex items-center gap-3 shadow-xl">
              <Calendar size={18} className="text-[#10b981]" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent outline-none font-black uppercase text-xs text-white cursor-pointer"
              />
            </div>
            
            <button 
              onClick={fetchStats} 
              disabled={loading}
              className="p-5 bg-[#111926] rounded-3xl border border-white/5 hover:border-[#10b981]/30 transition-all shadow-xl"
            >
              {loading ? <Loader2 size={22} className="animate-spin text-[#10b981]" /> : <RefreshCcw size={22} className="text-[#10b981]" />}
            </button>
          </div>
        </div>

        {/* P&L Performance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard 
            icon={<TrendingUp size={24} className="text-[#10b981]" />} 
            label="Gross Sales" 
            value={stats.sales} 
            trend="Total In" 
          />
          <StatCard 
            icon={<TrendingDown size={24} className="text-red-500" />} 
            label="Total Wins" 
            value={stats.payouts} 
            trend="Total Out" 
          />
          <StatCard 
            icon={<PieChart size={24} className="text-blue-500" />} 
            label="Net Profit" 
            value={stats.profit} 
            isHighlight 
            color={stats.profit >= 0 ? "text-[#10b981]" : "text-red-500"} 
            trend="Daily Result"
          />
        </div>

        {/* Detailed Report Breakdown */}
        <div className="bg-[#111926] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
            <BarChart3 className="absolute -right-10 -bottom-10 w-64 h-64 opacity-[0.02] text-white" />
            
            <div className="relative z-10 space-y-6">
               <ReportLine label="Date of Report" value={new Date(selectedDate).toDateString()} />
               <ReportLine label="Total Tickets Issued" value={stats.count.toLocaleString()} />
               <ReportLine label="Sales Performance" value={`KSh ${stats.sales.toLocaleString()}`} />
               <ReportLine label="Payout Expenses" value={`KSh ${stats.payouts.toLocaleString()}`} />
               
               <div className="pt-10 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
                 <div>
                   <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mb-1">Final P&L Margin</p>
                   <span className={`text-5xl font-black italic tracking-tighter ${stats.profit >= 0 ? 'text-[#10b981]' : 'text-red-500'}`}>
                     KSh {stats.profit.toLocaleString()}
                   </span>
                 </div>
                 
                 <div className="text-center md:text-right bg-black/20 p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Database Verified</p>
                    <p className="text-xs font-mono text-zinc-400">SHIFT_ID: {selectedDate.replace(/-/g, '')}</p>
                 </div>
               </div>
            </div>
        </div>
      </div>
    </CashierLayout>
  );
}

// UI Helpers
function StatCard({ icon, label, value, color, isHighlight, trend }) {
  return (
    <div className={`bg-[#111926] p-8 rounded-[2.5rem] border ${isHighlight ? 'border-[#10b981]/20' : 'border-white/5'}`}>
      <div className="flex justify-between mb-6">
        <div className="p-3 bg-[#0b0f1a] rounded-2xl">{icon}</div>
        <span className="text-[8px] font-black opacity-40 uppercase tracking-widest">{trend}</span>
      </div>
      <p className="text-[9px] font-black opacity-50 uppercase mb-1 tracking-wider">{label}</p>
      <h3 className={`text-3xl font-black italic tabular-nums ${color || 'text-white'}`}>
        KSh {value.toLocaleString()}
      </h3>
    </div>
  );
}

function ReportLine({ label, value }) {
  return (
    <div className="flex justify-between items-center border-b border-white/5 pb-4">
      <span className="text-xs font-black opacity-40 uppercase tracking-widest">{label}</span>
      <span className="text-xl font-black italic tracking-tight">{value}</span>
    </div>
  );
}
