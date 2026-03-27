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
  PieChart
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
      // 1. Fetch all booked bets for the network performance
      const { data: bets, error } = await supabase
        .from('booked_bets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Aggregate Calculations
      const staked = bets?.reduce((acc, b) => acc + parseFloat(b.stake || 0), 0) || 0;
      // Note: Assuming you have a 'payout' or 'status' field to calculate wins
      const payouts = bets?.filter(b => b.status === 'won').reduce((acc, b) => acc + parseFloat(b.potential_payout || 0), 0) || 0;
      
      setReportData({
        totalStaked: staked,
        totalPayouts: payouts,
        netProfit: staked - payouts,
        transactionCount: bets?.length || 0,
        recentLogs: bets?.slice(0, 15) || []
      });
    } catch (err) {
      console.error("Reporting Error:", err.message);
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
        <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white font-sans">
          
          {/* Header & Controls */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">Financial Intelligence</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1 italic">Network-wide P&L Audit</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex bg-[#111926] p-1 rounded-xl border border-white/5">
                {['24h', '7d', '30d', 'All'].map((range) => (
                  <button 
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase italic transition-all ${timeRange === range ? 'bg-[#10b981] text-black' : 'text-slate-500 hover:text-white'}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
              <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all">
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>

          {/* Master KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ReportCard 
              title="Total Network Stake" 
              value={reportData.totalStaked} 
              icon={<DollarSign size={20} />} 
              isMoney 
            />
            <ReportCard 
              title="Potential Liabilities" 
              value={reportData.totalPayouts} 
              icon={<ArrowUpRight size={20} />} 
              isMoney 
              color="text-red-500"
            />
            <ReportCard 
              title="Net GGR (Profit)" 
              value={reportData.netProfit} 
              icon={<TrendingUp size={20} />} 
              isMoney 
              color="text-[#10b981]"
            />
            <ReportCard 
              title="Ticket Volume" 
              value={reportData.transactionCount} 
              icon={<BarChart3 size={20} />} 
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Detailed Transaction Ledger */}
            <div className="xl:col-span-2 bg-[#111926] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PieChart size={20} className="text-[#10b981]" />
                  <h2 className="text-xs font-black uppercase italic tracking-widest">Global Transaction Feed</h2>
                </div>
                <Filter size={16} className="text-slate-600 cursor-pointer hover:text-white" />
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#0b0f1a]/50 text-slate-600 text-[9px] font-black uppercase tracking-widest italic">
                    <tr>
                      <th className="p-6">Reference</th>
                      <th className="p-6">Stake</th>
                      <th className="p-6">Odds</th>
                      <th className="p-6">Potential</th>
                      <th className="p-6 text-right">Date/Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reportData.recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="p-6">
                          <span className="font-black text-[#10b981] tracking-tighter uppercase italic text-sm">
                            {log.booking_code}
                          </span>
                        </td>
                        <td className="p-6 font-bold text-white text-sm">
                          KES {parseFloat(log.stake || 0).toLocaleString()}
                        </td>
                        <td className="p-6 font-mono text-slate-500 text-xs">
                          @{parseFloat(log.total_odds || 0).toFixed(2)}
                        </td>
                        <td className="p-6">
                          <span className={`font-black italic text-sm ${log.status === 'won' ? 'text-[#10b981]' : 'text-slate-400'}`}>
                            KES {parseFloat(log.potential_payout || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-6 text-right text-[10px] text-slate-500 font-bold uppercase italic tracking-widest">
                          {new Date(log.created_at).toLocaleDateString()} <br />
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance Side-Bar */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-[#111926] to-[#0b0f1a] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                <h3 className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">System Health</h3>
                <div className="space-y-4">
                  <HealthBar label="Database Uptime" percentage="99.9%" color="bg-[#10b981]" />
                  <HealthBar label="Scraper Latency" percentage="240ms" color="bg-blue-500" />
                  <HealthBar label="Payout Accuracy" percentage="100%" color="bg-[#10b981]" />
                </div>
              </div>

              <div className="bg-[#10b981] p-8 rounded-[2.5rem] text-black">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar size={20} className="opacity-50" />
                  <h3 className="font-black uppercase italic text-sm tracking-tighter">Next Settlement</h3>
                </div>
                <p className="text-3xl font-black italic tracking-tighter mb-2">MAR 31</p>
                <p className="text-[9px] font-bold uppercase opacity-70 italic tracking-widest leading-relaxed">
                  Monthly reconciliation scheduled for midnight EAT. All node balances will be snapshotted.
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
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group shadow-xl hover:border-white/10 transition-all">
      <div className="absolute top-0 right-0 p-6 opacity-5 text-white group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-3 italic">{title}</p>
      <div className="flex items-baseline gap-2">
        {isMoney && <span className="text-sm font-bold text-slate-600 italic">KES</span>}
        <h3 className={`text-3xl font-black italic tracking-tighter ${color}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
      </div>
    </div>
  );
}

function HealthBar({ label, percentage, color }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[9px] font-black uppercase italic tracking-widest">
        <span className="text-slate-500">{label}</span>
        <span className="text-white">{percentage}</span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} w-full opacity-80`} />
      </div>
    </div>
  );
}
