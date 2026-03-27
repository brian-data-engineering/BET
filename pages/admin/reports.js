import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { 
  BarChart3, 
  Download, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  DollarSign,
  PieChart,
  TrendingUp 
} from 'lucide-react';

export default function AdminReports() {
  const [reportData, setReportData] = useState({
    totalStaked: 0,
    totalPayouts: 0,
    netProfit: 0,
    transactionCount: 0,
    recentLogs: []
  });
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data: bets, error } = await supabase
        .from('booked_bets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const staked = bets?.reduce((acc, b) => acc + parseFloat(b.stake || 0), 0) || 0;
      const payouts = bets?.filter(b => b.status === 'won').reduce((acc, b) => acc + parseFloat(b.potential_payout || 0), 0) || 0;
      
      setReportData({
        totalStaked: staked,
        totalPayouts: payouts,
        netProfit: staked - payouts,
        transactionCount: bets?.length || 0,
        recentLogs: bets?.slice(0, 15) || []
      });
    } catch (err) {
      console.error("Audit Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [timeRange]);

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <AdminLayout>
        <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
          
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div>
              <h1 className="text-5xl font-black uppercase italic tracking-tighter">Network Intelligence</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1 italic">Real-time P&L Audit Dashboard</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex bg-[#111926] p-1 rounded-xl border border-white/5">
                {['24h', '7d', '30d', 'All'].map((range) => (
                  <button 
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase italic transition-all ${timeRange === range ? 'bg-[#10b981] text-black shadow-lg shadow-[#10b981]/20' : 'text-slate-500 hover:text-white'}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
              <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all active:scale-95">
                <Download size={14} /> Generate CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ReportCard title="Total Stakes" value={reportData.totalStaked} icon={<DollarSign size={20} />} isMoney />
            <ReportCard title="Network Liabilities" value={reportData.totalPayouts} icon={<ArrowUpRight size={20} />} isMoney color="text-red-500" />
            <ReportCard title="Gross Profit (GGR)" value={reportData.netProfit} icon={<TrendingUp size={20} />} isMoney color="text-[#10b981]" />
            <ReportCard title="Ticket Count" value={reportData.transactionCount} icon={<BarChart3 size={20} />} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            <div className="xl:col-span-2 bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <PieChart size={20} className="text-[#10b981]" />
                  <h2 className="text-xs font-black uppercase italic tracking-widest">Master Transaction Feed</h2>
                </div>
                <Filter size={16} className="text-slate-600 cursor-pointer hover:text-white" />
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#0b0f1a]/50 text-slate-600 text-[9px] font-black uppercase tracking-[0.3em] italic">
                    <tr>
                      <th className="p-8">Reference</th>
                      <th className="p-8">Stake</th>
                      <th className="p-8">Price/Odds</th>
                      <th className="p-8">Potential</th>
                      <th className="p-8 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reportData.recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="p-8">
                          <span className="font-black text-[#10b981] tracking-tighter uppercase italic text-base">
                            {log.booking_code}
                          </span>
                        </td>
                        <td className="p-8 font-bold text-white text-base italic">
                          KES {parseFloat(log.stake || 0).toLocaleString()}
                        </td>
                        <td className="p-8 font-mono text-slate-500 text-xs">
                          x{parseFloat(log.total_odds || 0).toFixed(2)}
                        </td>
                        <td className="p-8">
                          <span className={`font-black italic text-base ${log.status === 'won' ? 'text-[#10b981]' : 'text-slate-400'}`}>
                            KES {parseFloat(log.potential_payout || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-8 text-right text-[10px] text-slate-500 font-bold uppercase italic tracking-widest leading-tight">
                          {new Date(log.created_at).toLocaleDateString()} <br />
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-[#111926] p-10 rounded-[3rem] border border-white/5 space-y-8">
                <h3 className="text-[10px] font-black text-slate-500 uppercase italic tracking-[0.3em]">Infrastructure Health</h3>
                <div className="space-y-6">
                  <HealthBar label="Database Latency" percentage="18ms" color="bg-[#10b981]" />
                  <HealthBar label="Scraper Accuracy" percentage="100%" color="bg-blue-500" />
                  <HealthBar label="API Availability" percentage="99.99%" color="bg-[#10b981]" />
                </div>
              </div>

              <div className="bg-[#10b981] p-10 rounded-[3rem] text-black shadow-2xl shadow-[#10b981]/10">
                <div className="flex items-center gap-3 mb-6">
                  <Calendar size={20} className="opacity-50" />
                  <h3 className="font-black uppercase italic text-sm tracking-tighter">Settlement Window</h3>
                </div>
                <p className="text-4xl font-black italic tracking-tighter mb-4">MAR 31, 2026</p>
                <p className="text-[10px] font-bold uppercase opacity-80 italic tracking-widest leading-relaxed">
                  Automatic network reconciliation will occur at 23:59 EAT. Ensure all node balances are verified before lockout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

function ReportCard({ title, value, icon, isMoney, color = "text-white" }) {
  return (
    <div className="bg-[#111926] p-10 rounded-[3rem] border border-white/5 relative overflow-hidden group shadow-2xl hover:border-white/10 transition-all">
      <div className="absolute top-0 right-0 p-8 opacity-5 text-white group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mb-4 italic">{title}</p>
      <div className="flex items-baseline gap-2">
        {isMoney && <span className="text-sm font-bold text-slate-700 italic">KES</span>}
        <h3 className={`text-4xl font-black italic tracking-tighter ${color}`}>
          {(value || 0).toLocaleString(undefined, { minimumFractionDigits: isMoney ? 2 : 0 })}
        </h3>
      </div>
    </div>
  );
}

function HealthBar({ label, percentage, color }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[10px] font-black uppercase italic tracking-widest">
        <span className="text-slate-500">{label}</span>
        <span className="text-white">{percentage}</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} w-full opacity-90`} />
      </div>
    </div>
  );
}
