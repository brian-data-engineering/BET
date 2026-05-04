import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  BarChart3, TrendingUp, TrendingDown, Calendar, RefreshCcw, 
  ChevronLeft, ChevronRight, Percent, Users, Store, UserCircle, ChevronDown, ChevronUp
} from 'lucide-react';

export default function AdminReports() {
  const [operatorLogs, setOperatorLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [stats, setStats] = useState({ totalSales: 0, totalPayouts: 0, netProfit: 0 });
  
  const [expandedId, setExpandedId] = useState(null); 
  const [chainData, setChainData] = useState([]); 
  const [isExpanding, setIsExpanding] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchGlobalReports = useCallback(async () => {
    setLoading(true);
    // Reset expansion on date change to keep data consistent
    setExpandedId(null);
    setChainData([]);

    try {
      const { data, error } = await supabase.rpc('get_superadmin_operator_report', {
        p_date: selectedDate
      });
      if (error) throw error;

      let sales = 0, payouts = 0;
      const formattedData = data?.map(row => {
        const s = Number(row.total_sales || 0);
        const p = Number(row.total_payouts || 0);
        sales += s; payouts += p;
        return { 
          ...row, 
          margin: s > 0 ? ((s - p) / s) * 100 : 0 
        };
      }) || [];

      setOperatorLogs(formattedData);
      setStats({ totalSales: sales, totalPayouts: payouts, netProfit: sales - payouts });
    } catch (err) { 
      console.error("Report Fetch Error:", err.message); 
    } finally { 
      setLoading(false); 
    }
  }, [selectedDate]);

  const toggleOperatorChain = async (operatorId, tenantId) => {
    if (expandedId === operatorId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(operatorId);
    setIsExpanding(true);
    
    try {
      // searchId fallback if tenantId is missing from the RPC for some reason
      const searchId = tenantId || operatorId;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role, balance, parent_id')
        .eq('tenant_id', searchId)
        .neq('role', 'operator')
        .order('role', { ascending: true });

      if (error) throw error;
      setChainData(data || []);
    } catch (err) {
      console.error("Chain Fetch Error:", err.message);
    } finally {
      setIsExpanding(false);
    }
  };

  useEffect(() => { 
    fetchGlobalReports(); 
  }, [fetchGlobalReports]);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return operatorLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [operatorLogs, currentPage]);

  const totalPages = Math.ceil(operatorLogs.length / itemsPerPage);

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={16} className="text-[#10b981]" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Live Network Audit</span>
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Global <span className="text-slate-700">Ledger</span></h1>
          </div>
          <div className="bg-[#111926] border border-white/5 p-4 rounded-2xl flex items-center gap-3">
             <Calendar size={14} className="text-[#10b981]" />
             <input 
               type="date" 
               value={selectedDate} 
               onChange={(e) => setSelectedDate(e.target.value)} 
               className="bg-transparent text-[10px] font-black uppercase [color-scheme:dark] outline-none cursor-pointer"
             />
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Network Sales" value={stats.totalSales} color="text-[#10b981]" icon={<TrendingUp size={18}/>} />
          <StatCard label="Network Payouts" value={stats.totalPayouts} color="text-rose-500" icon={<TrendingDown size={18}/>} />
          <StatCard label="System Profit" value={stats.netProfit} color="text-blue-400" icon={<Percent size={18}/>} />
        </div>

        {/* TABLE */}
        <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl relative">
          {loading && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10 flex items-center justify-center">
              <RefreshCcw className="animate-spin text-blue-500" size={40} />
            </div>
          )}
          
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[9px] font-black tracking-widest italic">
              <tr>
                <th className="p-8 w-16"></th>
                <th className="p-8">Operator</th>
                <th className="p-8 text-center">Efficiency</th>
                <th className="p-8">Sales</th>
                <th className="p-8 text-right">Net Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedLogs.length > 0 ? paginatedLogs.map((row) => (
                <Fragment key={row.operator_id}>
                  <tr 
                    onClick={() => toggleOperatorChain(row.operator_id, row.tenant_id)}
                    className={`cursor-pointer transition-all group ${expandedId === row.operator_id ? 'bg-blue-600/10' : 'hover:bg-white/[0.02]'}`}
                  >
                    <td className="p-8 text-center">
                      {expandedId === row.operator_id ? <ChevronUp className="text-blue-500" /> : <ChevronDown className="text-slate-600 group-hover:text-white" />}
                    </td>
                    <td className="p-8">
                      <div className="flex flex-col">
                        <span className="text-sm font-black uppercase italic">{row.operator_name}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{row.total_cashiers} Active Nodes</span>
                      </div>
                    </td>
                    <td className="p-8 text-center">
                      <div className={`inline-block px-3 py-1 rounded-full text-[9px] font-black border ${row.margin >= 20 ? 'border-emerald-500/30 text-emerald-500' : 'border-rose-500/30 text-rose-500'}`}>
                        {row.margin.toFixed(1)}%
                      </div>
                    </td>
                    <td className="p-8 text-xs font-black">KES {Number(row.total_sales).toLocaleString()}</td>
                    <td className={`p-8 text-right font-black italic text-lg ${row.net_profit >= 0 ? 'text-[#10b981]' : 'text-rose-500'}`}>
                      {Number(row.net_profit).toLocaleString()}
                    </td>
                  </tr>

                  {expandedId === row.operator_id && (
                    <tr className="bg-[#05070a]">
                      <td colSpan="5" className="p-12">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {isExpanding ? (
                            <div className="col-span-3 py-10 text-center flex flex-col items-center gap-4">
                              <RefreshCcw className="animate-spin text-blue-500" />
                              <span className="text-[10px] uppercase font-black tracking-widest text-slate-600">Syncing Chain Data...</span>
                            </div>
                          ) : (
                            ['agent', 'shop', 'cashier'].map(role => (
                              <div key={role} className="space-y-4">
                                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                                  {role === 'agent' && <Users size={14} className="text-blue-400" />}
                                  {role === 'shop' && <Store size={14} className="text-purple-400" />}
                                  {role === 'cashier' && <UserCircle size={14} className="text-orange-400" />}
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{role}s</h4>
                                </div>
                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                  {chainData.filter(u => u.role === role).map(user => (
                                    <div key={user.id} className="p-4 bg-[#111926] rounded-2xl border border-white/5 flex justify-between items-center hover:border-white/10 transition-colors">
                                      <div className="flex flex-col">
                                        <span className="text-[11px] font-black uppercase tracking-tight">{user.username}</span>
                                        <span className="text-[9px] text-emerald-500 font-bold">KES {Number(user.balance).toLocaleString()}</span>
                                      </div>
                                      <div className="text-[8px] font-black text-slate-700">...{user.id.slice(-5)}</div>
                                    </div>
                                  ))}
                                  {chainData.filter(u => u.role === role).length === 0 && (
                                    <p className="text-[9px] text-slate-700 italic">No {role}s linked.</p>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )) : (
                <tr>
                  <td colSpan="5" className="p-20 text-center text-slate-500 font-black uppercase italic tracking-widest">
                    No Activity Recorded for this Date
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {/* PAGINATION */}
          <div className="p-6 border-t border-white/5 flex justify-center items-center gap-8 bg-[#0b0f1a]/30">
            <button 
              disabled={currentPage === 1 || loading} 
              onClick={() => setCurrentPage(p => p - 1)} 
              className="p-3 rounded-xl border border-white/5 hover:bg-white/5 disabled:opacity-10 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Page <span className="text-white">{currentPage}</span> of {totalPages || 1}
            </span>
            <button 
              disabled={currentPage === totalPages || loading} 
              onClick={() => setCurrentPage(p => p + 1)} 
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

function StatCard({ label, value, color, icon }) {
  return (
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
      <div className="absolute -right-2 -top-2 opacity-5 scale-150 group-hover:scale-125 transition-transform">{icon}</div>
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic mb-2">{label}</p>
      <p className={`text-4xl font-black italic tracking-tighter ${color}`}>
        KES {Number(value || 0).toLocaleString()}
      </p>
    </div>
  );
}
