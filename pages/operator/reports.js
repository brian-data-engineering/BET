import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Users, 
  Download,
  Calendar,
  Layers,
  RefreshCcw,
  Target
} from 'lucide-react';

export default function OperatorReports() {
  const [teamLogs, setTeamLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [stats, setStats] = useState({ totalSales: 0, totalPayouts: 0, totalProfit: 0 });

  const fetchTeamPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Calling your new RPC function using the parent_id logic
        const { data, error } = await supabase.rpc('get_operator_team_report', {
          p_operator_id: user.id,
          p_date: selectedDate
        });

        if (error) throw error;

        let sales = 0;
        let payouts = 0;

        const formattedData = data?.map(row => {
          sales += Number(row.total_sales);
          payouts += Number(row.total_payouts);
          return row;
        }) || [];

        setTeamLogs(formattedData);
        setStats({
          totalSales: sales,
          totalPayouts: payouts,
          totalProfit: sales - payouts
        });
      }
    } catch (err) {
      console.error("Audit Fetch Error:", err.message);
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchTeamPerformance();
  }, [fetchTeamPerformance]);

  return (
    <OperatorLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
              <Target className="text-[#10b981]" size={32} />
              Performance <span className="text-slate-700">Audit</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] italic">Consolidated Cashier Analytics</p>
          </div>
          
          <div className="flex gap-3">
            {/* Optimized Date Picker */}
            <div className="bg-[#111926] border border-white/5 px-4 py-2 rounded-xl flex items-center gap-3">
               <Calendar size={14} className="text-[#10b981]" />
               <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent outline-none text-[10px] font-black uppercase text-white cursor-pointer [color-scheme:dark]"
               />
            </div>
            <button onClick={fetchTeamPerformance} className="bg-[#111926] border border-white/5 p-3 rounded-xl hover:bg-white/5 transition-all">
              <RefreshCcw size={14} className={loading ? 'animate-spin text-[#10b981]' : ''} />
            </button>
            <button className="bg-[#111926] border border-white/5 px-6 py-3 rounded-xl text-[10px] font-black uppercase italic tracking-widest hover:bg-[#10b981] hover:text-black transition-all flex items-center gap-2">
              <Download size={14} /> Export XLS
            </button>
          </div>
        </div>

        {/* Global Shop Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ReportCard 
            label="Total Shop Sales" 
            amount={stats.totalSales} 
            icon={<TrendingUp className="text-[#10b981]" />} 
            trend="Gross Collection"
            color="text-[#10b981]"
          />
          <ReportCard 
            label="Total Shop Payouts" 
            amount={stats.totalPayouts} 
            icon={<TrendingDown className="text-rose-500" />} 
            trend="Total Wins Paid"
            color="text-rose-500"
          />
          <ReportCard 
            label="Net Shop Profit" 
            amount={stats.totalProfit} 
            icon={<Layers className="text-blue-500" />} 
            trend="Operator Margin"
            color={stats.totalProfit >= 0 ? "text-blue-500" : "text-rose-600"}
          />
        </div>

        {/* Cashier Leaderboard Table */}
        <div className="bg-[#111926] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 flex items-center gap-3">
             <Users size={16} className="text-[#10b981]" />
             <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Terminal Breakdown</h2>
          </div>
          <table className="w-full text-left">
            <thead className="bg-black/20 text-slate-600 uppercase text-[9px] font-black italic tracking-widest">
              <tr>
                <th className="p-8">Cashier Name</th>
                <th className="p-8">Tickets Issued</th>
                <th className="p-8">Sales</th>
                <th className="p-8">Payouts</th>
                <th className="p-8 text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="5" className="p-20 text-center"><BarChart3 className="animate-spin mx-auto text-[#10b981]" size={32} /></td></tr>
              ) : teamLogs.map((row, index) => (
                <tr key={index} className="hover:bg-white/[0.01] transition-all group">
                  <td className="p-8 font-black uppercase italic text-xs text-white">
                    {row.cashier_name}
                  </td>
                  <td className="p-8 text-xs font-mono text-slate-400">
                    {row.ticket_count}
                  </td>
                  <td className="p-8 text-xs font-black text-white">
                    {Number(row.total_sales).toLocaleString()}
                  </td>
                  <td className="p-8 text-xs font-black text-rose-500/80">
                    {Number(row.total_payouts).toLocaleString()}
                  </td>
                  <td className={`p-8 text-right font-black italic text-lg ${row.net_profit >= 0 ? 'text-[#10b981]' : 'text-rose-500'}`}>
                    {Number(row.net_profit).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </OperatorLayout>
  );
}

function ReportCard({ label, amount, icon, trend, color }) {
  return (
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-xl">
       <div className="relative z-10 space-y-4">
         <div className="flex justify-between items-start">
           <div className="p-3 bg-[#0b0f1a] rounded-xl border border-white/5">
             {icon}
           </div>
           <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">{trend}</span>
         </div>
         <div>
           <p className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest mb-1">{label}</p>
           <h3 className={`text-3xl font-black italic tracking-tighter ${color}`}>
             KSh {amount.toLocaleString()}
           </h3>
         </div>
       </div>
    </div>
  );
}
