import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout'; // Assuming SuperAdmin uses AdminLayout
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Globe, 
  Download,
  Calendar,
  Layers,
  RefreshCcw,
  Briefcase
} from 'lucide-react';

export default function SuperAdminReports() {
  const [operatorLogs, setOperatorLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [stats, setStats] = useState({ totalSales: 0, totalPayouts: 0, totalProfit: 0 });

  const fetchGlobalPerformance = useCallback(async () => {
    setLoading(true);
    try {
      // SuperAdmin calls the global report without needing a specific ID
      const { data, error } = await supabase.rpc('get_superadmin_operator_report', {
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

      setOperatorLogs(formattedData);
      setStats({
        totalSales: sales,
        totalPayouts: payouts,
        totalProfit: sales - payouts
      });
    } catch (err) {
      console.error("Global Audit Error:", err.message);
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchGlobalPerformance();
  }, [fetchGlobalPerformance]);

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
              <Globe className="text-blue-500" size={32} />
              Network <span className="text-slate-700">Audit</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] italic">Full System Performance Overview</p>
          </div>
          
          <div className="flex gap-3">
            <div className="bg-[#111926] border border-white/5 px-4 py-2 rounded-xl flex items-center gap-3 shadow-lg">
               <Calendar size={14} className="text-blue-500" />
               <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent outline-none text-[10px] font-black uppercase text-white cursor-pointer [color-scheme:dark]"
               />
            </div>
            <button onClick={fetchGlobalPerformance} className="bg-[#111926] border border-white/5 p-3 rounded-xl hover:bg-white/5 transition-all">
              <RefreshCcw size={14} className={loading ? 'animate-spin text-blue-500' : ''} />
            </button>
            <button className="bg-[#111926] border border-white/5 px-6 py-3 rounded-xl text-[10px] font-black uppercase italic tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2">
              <Download size={14} /> Master Export
            </button>
          </div>
        </div>

        {/* Global Network Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ReportCard 
            label="Network Volume" 
            amount={stats.totalSales} 
            icon={<TrendingUp className="text-emerald-500" />} 
            trend="Total Inflow"
            color="text-emerald-500"
          />
          <ReportCard 
            label="Network Payouts" 
            amount={stats.totalPayouts} 
            icon={<TrendingDown className="text-rose-500" />} 
            trend="Total Outflow"
            color="text-rose-500"
          />
          <ReportCard 
            label="System Net" 
            amount={stats.totalProfit} 
            icon={<Layers className="text-blue-500" />} 
            trend="Total Profit Margin"
            color={stats.totalProfit >= 0 ? "text-blue-500" : "text-rose-600"}
          />
        </div>

        {/* Operator Breakdown Table */}
        <div className="bg-[#111926] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 flex items-center gap-3">
             <Briefcase size={16} className="text-blue-500" />
             <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Operator Performance</h2>
          </div>
          <table className="w-full text-left">
            <thead className="bg-black/20 text-slate-600 uppercase text-[9px] font-black italic tracking-widest">
              <tr>
                <th className="p-8">Partner Name</th>
                <th className="p-8 text-center">Active Terminals</th>
                <th className="p-8">Total Sales</th>
                <th className="p-8">Total Tickets</th>
                <th className="p-8 text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="5" className="p-20 text-center"><BarChart3 className="animate-spin mx-auto text-blue-500" size={32} /></td></tr>
              ) : operatorLogs.map((row, index) => (
                <tr key={index} className="hover:bg-white/[0.01] transition-all group">
                  <td className="p-8 font-black uppercase italic text-xs text-white">
                    {row.operator_name}
                  </td>
                  <td className="p-8 text-center">
                    <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-3 py-1 rounded-lg border border-blue-500/20">
                      {row.total_cashiers} Shops
                    </span>
                  </td>
                  <td className="p-8 text-xs font-black text-white">
                    {Number(row.total_sales).toLocaleString()}
                  </td>
                  <td className="p-8 text-xs font-mono text-slate-500">
                    {row.total_tickets}
                  </td>
                  <td className={`p-8 text-right font-black italic text-lg ${row.net_profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {Number(row.net_profit).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {operatorLogs.length === 0 && !loading && (
            <div className="p-20 text-center">
               <p className="text-slate-600 italic text-[10px] uppercase font-black tracking-widest">No Operator Data for this date</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
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
