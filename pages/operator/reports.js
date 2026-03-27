import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  ArrowDownCircle, 
  Monitor, 
  Calendar,
  Filter
} from 'lucide-react';

export default function OperatorReports() {
  const [reportData, setReportData] = useState({
    totalTerminals: 0,
    deployedFloat: 0,
    activeCashiers: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateReport = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch all cashiers under this operator to calculate shop-wide stats
        const { data: cashiers, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('parent_id', user.id)
          .eq('role', 'cashier');

        if (!error && cashiers) {
          const totalFloat = cashiers.reduce((acc, curr) => acc + (curr.balance || 0), 0);
          
          setReportData({
            totalTerminals: cashiers.length,
            deployedFloat: totalFloat,
            activeCashiers: cashiers
          });
        }
      }
      setLoading(false);
    };

    generateReport();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['operator']}>
      <AdminLayout>
        <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white font-sans">
          
          {/* Header & Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Financial Intelligence</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 italic">Shop Performance & Liquidity Audit</p>
            </div>

            <button className="flex items-center gap-2 bg-[#111926] border border-white/5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase italic hover:bg-white hover:text-black transition-all tracking-widest">
              <Download size={16} />
              Export CSV
            </button>
          </div>

          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <QuickStat label="Total Nodes" value={reportData.totalTerminals} icon={<Monitor size={14}/>} />
            <QuickStat label="Network Float" value={`KES ${reportData.deployedFloat.toLocaleString()}`} icon={<TrendingUp size={14}/>} color="text-[#10b981]" />
            <QuickStat label="Avg Node Bal" value={`KES ${(reportData.deployedFloat / (reportData.totalTerminals || 1)).toLocaleString()}`} icon={<Filter size={14}/>} />
            <QuickStat label="Settlement status" value="PENDING" icon={<Calendar size={14}/>} color="text-amber-500" />
          </div>

          {/* Main Report Table */}
          <div className="bg-[#111926] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-[#10b981]" />
                <h2 className="font-black uppercase text-sm italic tracking-widest">Terminal Liquidity Ledger</h2>
              </div>
              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest italic">Updated: {new Date().toLocaleTimeString()}</span>
            </div>

            <table className="w-full text-left">
              <thead className="bg-[#0b0f1a]/50 text-slate-500 uppercase text-[9px] font-black tracking-[0.2em] italic">
                <tr>
                  <th className="p-8">Terminal Name</th>
                  <th className="p-8">Last Activity</th>
                  <th className="p-8 text-center">Assigned Float</th>
                  <th className="p-8 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reportData.activeCashiers.map((cashier) => (
                  <tr key={cashier.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-8 font-black italic uppercase text-sm tracking-tight text-white">
                      {cashier.username}
                    </td>
                    <td className="p-8 text-xs font-bold text-slate-500 uppercase italic">
                      {new Date(cashier.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-8 text-center">
                      <span className="font-mono font-black text-[#10b981] bg-[#10b981]/5 px-4 py-2 rounded-xl border border-[#10b981]/10">
                        KES {parseFloat(cashier.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="p-8 text-right">
                      <div className="flex items-center justify-end gap-2">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                         <span className="text-[9px] font-black text-emerald-500 uppercase italic tracking-widest">In Sync</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {reportData.activeCashiers.length === 0 && (
              <div className="p-24 text-center">
                <ArrowDownCircle size={40} className="mx-auto text-slate-800 mb-4 opacity-20" />
                <p className="text-slate-700 font-black uppercase text-[10px] tracking-[0.4em] italic">No Terminal Data Found</p>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

function QuickStat({ label, value, icon, color = "text-white" }) {
  return (
    <div className="bg-[#111926] p-6 rounded-3xl border border-white/5 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-[#0b0f1a] rounded-lg text-slate-500 border border-white/5">
          {icon}
        </div>
        <span className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest">{label}</span>
      </div>
      <h3 className={`text-xl font-black italic tracking-tighter ${color}`}>{value}</h3>
    </div>
  );
}
