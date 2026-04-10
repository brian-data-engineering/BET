import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Percent
} from 'lucide-react';

export default function AdminReports() {
  const [operatorLogs, setOperatorLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [stats, setStats] = useState({ totalSales: 0, totalPayouts: 0, netProfit: 0 });
  
  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchGlobalReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_superadmin_operator_report', {
        p_date: selectedDate
      });

      if (error) throw error;

      let sales = 0;
      let payouts = 0;

      const formattedData = data?.map(row => {
        const s = Number(row.total_sales || 0);
        const p = Number(row.total_payouts || 0);
        sales += s;
        payouts += p;
        
        // Inject P&L Margin calculation
        return {
          ...row,
          margin: s > 0 ? ((s - p) / s) * 100 : 0
        };
      }) || [];

      setOperatorLogs(formattedData);
      setStats({ totalSales: sales, totalPayouts: payouts, netProfit: sales - payouts });
      setCurrentPage(1); // Reset to page 1 on new fetch
    } catch (err) {
      console.error("SuperAdmin Audit Error:", err.message);
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchGlobalReports();
  }, [fetchGlobalReports]);

  // PAGINATION LOGIC
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return operatorLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [operatorLogs, currentPage]);

  const totalPages = Math.ceil(operatorLogs.length / itemsPerPage);

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER SECTION */}
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
            <button onClick={fetchGlobalReports} className="bg-[#111926] border border-white/5 p-4 rounded-2xl hover:bg-white/5 transition-all">
              <RefreshCcw size={16} className={loading ? 'animate-spin text-[#10b981]' : 'text-white'} />
            </button>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Total Sales" value={stats.totalSales} icon={<TrendingUp size={18} className="text-[#10b981]" />} sub="Gross Intake" color="text-[#10b981]" />
          <StatCard label="Total Payouts" value={stats.totalPayouts} icon={<TrendingDown size={18} className="text-rose-500" />} sub="Losses/Wins" color="text-rose-500" />
          <StatCard 
            label="Net Profit" 
            value={stats.netProfit} 
            icon={<Percent size={18} className="text-blue-400" />} 
            sub={`Margin: ${stats.totalSales > 0 ? ((stats.netProfit / stats.totalSales) * 100).toFixed(1) : 0}%`}
            color={stats.netProfit >= 0 ? "text-blue-400" : "text-rose-600"}
          />
        </div>

        {/* TABLE SECTION */}
        <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Briefcase size={18} className="text-[#10b981]" />
                <h2 className="text-xs font-black uppercase italic tracking-widest">Operator P&L Ledger</h2>
            </div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Showing {paginatedLogs.length} of {operatorLogs.length} Operators
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[9px] font-black tracking-widest italic">
                <tr>
                  <th className="p-8">Operator</th>
                  <th className="p-8 text-center">Efficiency</th>
                  <th className="p-8">Sales</th>
                  <th className="p-8">Payouts</th>
                  <th className="p-8 text-right">Net Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan="5" className="p-32 text-center"><RefreshCcw className="animate-spin mx-auto text-[#10b981]" size={32} /></td></tr>
                ) : paginatedLogs.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-all group">
                    <td className="p-8">
                      <div className="flex flex-col">
                        <span className="text-sm font-black uppercase italic text-white">{row.operator_name}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{row.total_cashiers} Active Terminals</span>
                      </div>
                    </td>
                    <td className="p-8 text-center">
                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black border ${row.margin >= 20 ? 'border-[#10b981]/30 text-[#10b981] bg-[#10b981]/5' : 'border-rose-500/30 text-rose-500 bg-rose-500/5'}`}>
                            {row.margin.toFixed(1)}% {row.margin >= 20 ? 'OPTIMAL' : 'CRITICAL'}
                        </div>
                    </td>
                    <td className="p-8 text-xs font-black text-white">KES {Number(row.total_sales).toLocaleString()}</td>
                    <td className="p-8 text-xs font-black text-rose-500/70">KES {Number(row.total_payouts).toLocaleString()}</td>
                    <td className={`p-8 text-right font-black italic text-lg ${row.net_profit >= 0 ? 'text-[#10b981]' : 'text-rose-500'}`}>
                      {Number(row.net_profit).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          <div className="p-6 border-t border-white/5 flex justify-center items-center gap-8 bg-[#0b0f1a]/30">
            <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-3 rounded-xl border border-white/5 hover:bg-white/5 disabled:opacity-10 transition-all"
            >
                <ChevronLeft size={20} />
            </button>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                Page <span className="text-white">{currentPage}</span> of {totalPages || 1}
            </span>
            <button 
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-3 rounded-xl border border-white/5 hover:bg-white/5 disabled:opacity-10 transition-all"
            >
                <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value, icon, sub, color }) {
  return (
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 space-y-4 shadow-xl">
      <div className="flex justify-between items-center">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">{label}</span>
        <div className="p-2 bg-black/20 rounded-lg">{icon}</div>
      </div>
      <div>
        <p className={`text-4xl font-black italic tracking-tighter ${color}`}>KES {value.toLocaleString()}</p>
        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em]">{sub}</span>
      </div>
    </div>
  );
}
