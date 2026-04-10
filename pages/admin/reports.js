import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  BarChart3, TrendingUp, TrendingDown, Globe, Calendar, RefreshCcw, Briefcase,
  ChevronLeft, ChevronRight, Percent, Users, Store, UserCircle, ChevronDown, ChevronUp
} from 'lucide-react';

export default function AdminReports() {
  const [operatorLogs, setOperatorLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [stats, setStats] = useState({ totalSales: 0, totalPayouts: 0, netProfit: 0 });
  
  // DRILL-DOWN STATE
  const [expandedId, setExpandedId] = useState(null); // ID of operator being inspected
  const [chainData, setChainData] = useState([]); // Holds the Agents/Shops/Cashiers
  const [isExpanding, setIsExpanding] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchGlobalReports = useCallback(async () => {
    setLoading(true);
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
        return { ...row, margin: s > 0 ? ((s - p) / s) * 100 : 0 };
      }) || [];

      setOperatorLogs(formattedData);
      setStats({ totalSales: sales, totalPayouts: payouts, netProfit: sales - payouts });
    } catch (err) { console.error(err.message); }
    finally { setLoading(false); }
  }, [selectedDate]);

  // DRILL-DOWN LOGIC: Fetch the chain for a specific operator
  const toggleOperatorChain = async (operatorId, tenantId) => {
    if (expandedId === operatorId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(operatorId);
    setIsExpanding(true);
    
    try {
      // Get all profiles linked to this brand/tenant
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, role, balance, parent_id')
        .eq('tenant_id', tenantId)
        .neq('role', 'operator') // We already know the operator
        .order('role', { ascending: true });

      if (error) throw error;
      setChainData(data || []);
    } catch (err) {
      console.error("Chain Fetch Error:", err.message);
    } finally {
      setIsExpanding(false);
    }
  };

  useEffect(() => { fetchGlobalReports(); }, [fetchGlobalReports]);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return operatorLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [operatorLogs, currentPage]);

  const totalPages = Math.ceil(operatorLogs.length / itemsPerPage);

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER & STATS (Simplified for brevity, keep your existing StatCards here) */}
        <div className="flex justify-between items-end">
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Global <span className="text-slate-700 text-4xl">Audit</span></h1>
            <div className="bg-[#111926] border border-white/5 p-4 rounded-2xl flex items-center gap-3">
               <Calendar size={14} className="text-[#10b981]" />
               <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-[10px] font-black uppercase [color-scheme:dark] outline-none"/>
            </div>
        </div>

        {/* MAIN TABLE */}
        <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[9px] font-black tracking-widest italic">
              <tr>
                <th className="p-8 text-center w-16">Chain</th>
                <th className="p-8">Operator</th>
                <th className="p-8 text-center">Efficiency</th>
                <th className="p-8">Sales</th>
                <th className="p-8 text-right">Net Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedLogs.map((row) => (
                <>
                  <tr 
                    key={row.operator_id} 
                    onClick={() => toggleOperatorChain(row.operator_id, row.tenant_id)}
                    className={`cursor-pointer transition-all ${expandedId === row.operator_id ? 'bg-blue-500/10' : 'hover:bg-white/[0.02]'}`}
                  >
                    <td className="p-8 text-center">
                        {expandedId === row.operator_id ? <ChevronUp className="text-blue-500" /> : <ChevronDown className="text-slate-600" />}
                    </td>
                    <td className="p-8">
                      <div className="flex flex-col">
                        <span className="text-sm font-black uppercase italic">{row.operator_name}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{row.total_cashiers} Terminals</span>
                      </div>
                    </td>
                    <td className="p-8 text-center">
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black border ${row.margin >= 20 ? 'border-emerald-500/30 text-emerald-500' : 'border-rose-500/30 text-rose-500'}`}>
                            {row.margin.toFixed(1)}%
                        </div>
                    </td>
                    <td className="p-8 text-xs font-black">KES {Number(row.total_sales).toLocaleString()}</td>
                    <td className={`p-8 text-right font-black italic text-lg ${row.net_profit >= 0 ? 'text-[#10b981]' : 'text-rose-500'}`}>
                      {Number(row.net_profit).toLocaleString()}
                    </td>
                  </tr>

                  {/* EXPANDED CHAIN VIEW */}
                  {expandedId === row.operator_id && (
                    <tr className="bg-[#0b0f1a]/50">
                      <td colSpan="5" className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                          {isExpanding ? (
                            <div className="col-span-3 py-10 text-center"><RefreshCcw className="animate-spin mx-auto text-blue-500" /></div>
                          ) : (
                            ['agent', 'shop', 'cashier'].map(role => (
                              <div key={role} className="bg-[#111926] border border-white/5 rounded-3xl p-6">
                                <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                                  {role === 'agent' && <Users size={16} className="text-blue-400" />}
                                  {role === 'shop' && <Store size={16} className="text-purple-400" />}
                                  {role === 'cashier' && <UserCircle size={16} className="text-orange-400" />}
                                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">{role}s</h4>
                                </div>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                  {chainData.filter(u => u.role === role).map(user => (
                                    <div key={user.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                      <div className="flex flex-col">
                                        <span className="text-[11px] font-black uppercase tracking-tighter">{user.username}</span>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase">Bal: {Number(user.balance).toLocaleString()}</span>
                                      </div>
                                      <div className="text-[8px] font-black text-slate-600">ID: {user.id.slice(0,5)}</div>
                                    </div>
                                  ))}
                                  {chainData.filter(u => u.role === role).length === 0 && (
                                    <p className="text-[9px] text-slate-600 italic">No {role}s registered</p>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {/* ... PAGINATION CONTROLS ... */}
        </div>
      </div>
    </AdminLayout>
  );
}
