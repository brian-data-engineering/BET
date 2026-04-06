import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Globe, 
  Calendar,
  Download,
  FileText,
  RefreshCcw,
  Briefcase
} from 'lucide-react';

export default function AdminReports() {
  const [operatorLogs, setOperatorLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [stats, setStats] = useState({ totalSales: 0, totalPayouts: 0, netProfit: 0 });

  const fetchGlobalReports = useCallback(async () => {
    setLoading(true);
    try {
      // Calling your newly created SQL function
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
        netProfit: sales - payouts
      });
    } catch (err) {
      console.error("SuperAdmin Audit Error:", err.message);
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchGlobalReports();
  }, [fetchGlobalReports]);

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-[#10b981]" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Network Intelligence</span>
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Global <span className="text-slate-700 text-4xl">Audit</span></h1>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-[#111926] border border-white/5 p-4 rounded-2xl flex items-center gap-3">
               <Calendar size={14} className="text-[#10b981]" />
               <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent outline-none text-[10px] font-black uppercase text-white cursor-pointer [color-scheme:dark]"
               />
            </div>
            <button 
              onClick={fetchGlobalReports}
              className="bg-[#111926] border border-white/5 p-4 rounded-2xl hover:bg-white/5 transition-all"
            >
              <RefreshCcw size={16} className={loading ? 'animate-spin text-[#10b981]' : 'text-white'} />
            </button>
            <button className="bg-white text-black px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-[#10b981] transition-all">
              <Download size={16} />
              <span className="text-[10px] font-black uppercase italic">Master Export</span>
            </button>
          </div>
        </div>

        {/* ANALYTICS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            label="Total Network Sales" 
            value={stats.totalSales} 
            icon={<TrendingUp size={18} className="text-[#10b981]" />} 
            sub="Gross Intake"
            color="text-[#10b981]"
          />
          <StatCard 
            label="Total Network Payouts" 
            value={stats.totalPayouts} 
            icon={<TrendingDown size={18} className="text-rose-500" />} 
            sub="Wins Paid"
            color="text-rose-500"
          />
          <StatCard 
            label="Net System Profit" 
            value={stats.netProfit} 
            icon={<Globe size={18} className="text-blue-400" />} 
            sub="Operator Margin"
            color={stats.netProfit >= 0 ? "text-blue-400" : "text-rose-600"}
          />
        </div>

        {/* OPERATOR BREAKDOWN TABLE */}
        <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center gap-3">
            <Briefcase size={18} className="text-[#10b981]" />
            <h2 className="text-xs font-black uppercase italic tracking-widest">Operator Performance Ledger</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[9px] font-black tracking-widest italic">
                <tr>
                  <th className="p-8">Partner Profile</th>
                  <th className="p-8 text-center">Nodes</th>
                  <th className="p-8">Sales Volume</th>
                  <th className="p-8">Payouts</th>
                  <th className="p-8 text-right">Net Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan="5" className="p-32 text-center"><RefreshCcw className="animate-spin mx-auto text-[#10b981]" size={32} /></td></tr>
                ) : operatorLogs.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-all group">
                    <td className="p-8">
                      <div className="flex flex-col">
                        <span className="text-sm font-black uppercase italic text-white">{row.operator_name}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{row.total_tickets} Slips Issued</span>
                      </div>
                    </td>
                    <td className="p-8 text-center">
                      <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase italic border border-blue-500/20 text-blue-400 bg-blue-500/5">
                        {row.total_cashiers} Active Terminals
                      </span>
                    </td>
                    <td className="p-8 text-xs font-black text-white">
                       KES {Number(row.total_sales).toLocaleString()}
                    </td>
                    <td className="p-8 text-xs font-black text-rose-500/70">
                       KES {Number(row.total_payouts).toLocaleString()}
                    </td>
                    <td className={`p-8 text-right font-black italic text-lg ${row.net_profit >= 0 ? 'text-[#10b981]' : 'text-rose-500'}`}>
                      {Number(row.net_profit).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {operatorLogs.length === 0 && !loading && (
              <div className="p-32 text-center opacity-20">
                <FileText size={48} className="mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase italic tracking-widest">No Operator Data Recorded for this period.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value, icon, sub, color }) {
  return (
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">{label}</span>
        <div className="p-2 bg-black/20 rounded-lg">{icon}</div>
      </div>
      <div>
        <p className={`text-3xl font-black italic tracking-tighter ${color}`}>KES {value.toLocaleString()}</p>
        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em]">{sub}</span>
      </div>
    </div>
  );
}
