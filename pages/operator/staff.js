import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { Monitor, PlusCircle, Ticket, Loader2 } from 'lucide-react';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [operatorId, setOperatorId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchStaffWithStats = useCallback(async (id) => {
    setFetching(true);
    try {
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('parent_id', id)
        .eq('role', 'cashier');

      if (pError) throw pError;

      const staffWithCounts = await Promise.all(profiles.map(async (cashier) => {
        const [resNow, resSettled] = await Promise.all([
          supabase.from('betsnow').select('id', { count: 'exact', head: true }).eq('cashier_id', cashier.id),
          supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('cashier_id', cashier.id)
        ]);

        return {
          ...cashier,
          ticketCount: (resNow.count || 0) + (resSettled.count || 0)
        };
      }));

      setStaff(staffWithCounts);
    } catch (err) {
      console.error("Staff Fetch Error:", err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setOperatorId(user.id);
        fetchStaffWithStats(user.id);
      }
    };
    init();
  }, [fetchStaffWithStats]);

  const handleCreateCashier = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calls your custom RPC to create a cashier without breaking operator session
      const { error } = await supabase.rpc('admin_create_cashier', {
        target_email: form.email,
        target_password: form.password,
        target_username: form.username,
        op_id: operatorId
      });

      if (error) throw error;

      alert(`Terminal ${form.username} deployed successfully.`);
      setForm({ email: '', password: '', username: '' });
      fetchStaffWithStats(operatorId);
      
    } catch (error) {
      alert("Deployment Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalShopFloat = staff.reduce((acc, s) => acc + parseFloat(s.balance || 0), 0);

  return (
    <OperatorLayout>
      <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Network Nodes</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 italic">Active Terminal Overview</p>
          </div>

          <div className="bg-[#111926] px-8 py-5 rounded-[2rem] border border-white/5 flex flex-col items-end shadow-2xl">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic mb-1">Total Shop Liquidity</span>
            <span className="text-2xl font-black text-[#10b981] italic tracking-tighter">
              KES {totalShopFloat.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Deployment Form */}
          <div className="lg:col-span-4">
            <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 space-y-6 sticky top-8 shadow-2xl">
              <div className="flex items-center gap-3">
                <PlusCircle size={20} className="text-blue-500" />
                <h2 className="font-black uppercase text-xs italic tracking-widest">Deploy New Terminal</h2>
              </div>
              
              <form onSubmit={handleCreateCashier} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Node Name</label>
                  <input value={form.username} className="w-full bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 text-sm font-bold uppercase text-white outline-none focus:border-blue-500 transition-colors" placeholder="e.g. SHOP_01" onChange={e => setForm({...form, username: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Email Address</label>
                  <input value={form.email} className="w-full bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 text-sm font-bold text-white outline-none focus:border-blue-500 transition-colors" placeholder="terminal@lucra.com" onChange={e => setForm({...form, email: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Access PIN/Password</label>
                  <input value={form.password} className="w-full bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 text-sm font-bold text-white outline-none focus:border-blue-500 transition-colors" type="password" placeholder="••••••••" onChange={e => setForm({...form, password: e.target.value})} required />
                </div>

                <button disabled={loading} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-blue-500 transition-all active:scale-95 italic text-xs uppercase tracking-widest mt-4 shadow-lg shadow-blue-600/10">
                  {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : "INITIALIZE NODE"}
                </button>
              </form>
            </div>
          </div>

          {/* Node Ledger */}
          <div className="lg:col-span-8">
            <div className="bg-[#111926] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                <h2 className="font-black uppercase text-xs italic tracking-widest flex items-center gap-2">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                   Active Terminals
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-black/20 text-slate-500 uppercase text-[9px] font-black italic tracking-widest">
                    <tr>
                      <th className="p-8">Terminal Node</th>
                      <th className="p-8 text-center">Ticket Count</th>
                      <th className="p-8 text-center">Node Float</th>
                      <th className="p-8 text-right">Connectivity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {staff.map(s => (
                      <tr key={s.id} className="hover:bg-white/[0.01] transition-all group">
                        <td className="p-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#0b0f1a] rounded-xl flex items-center justify-center border border-white/5 text-slate-600 group-hover:text-blue-500 group-hover:border-blue-500/20 transition-all">
                               <Monitor size={18} />
                            </div>
                            <div>
                              <p className="font-black uppercase italic text-lg leading-none tracking-tighter text-white">{s.username}</p>
                              <p className="text-[8px] text-slate-600 font-bold uppercase mt-1 italic">ID: {s.id.split('-')[0]}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-8 text-center">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1 text-slate-400">
                              <Ticket size={12} className="text-blue-500/50" />
                              <span className="text-sm font-black italic">{s.ticketCount}</span>
                            </div>
                            <span className="text-[8px] font-bold uppercase opacity-30 tracking-tighter italic">Lifetime Volume</span>
                          </div>
                        </td>
                        <td className="p-8 text-center">
                          <span className="text-sm font-black italic text-[#10b981] bg-[#10b981]/5 px-4 py-2 rounded-xl border border-[#10b981]/10">
                            KES {parseFloat(s.balance || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-8 text-right">
                           <span className="text-[9px] font-black uppercase italic text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/10">Connected</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {fetching && (
                <div className="p-16 text-center space-y-4">
                  <Loader2 className="animate-spin mx-auto text-blue-500" size={32} />
                  <p className="text-slate-500 italic text-[10px] uppercase font-black tracking-[0.3em]">Synchronizing Network Nodes...</p>
                </div>
              )}
              {staff.length === 0 && !fetching && (
                <div className="p-20 text-center text-slate-600 italic text-xs font-bold uppercase tracking-widest">
                  No terminals provisioned for this shop.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
