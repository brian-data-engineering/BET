import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { Monitor, PlusCircle, Ticket, Loader2, Send, RefreshCw, ShieldCheck } from 'lucide-react';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [operatorId, setOperatorId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // 1. DATA ENGINE: Fetches staff and joins ticket counts from both live and settled tables
  const fetchStaffWithStats = useCallback(async (id) => {
    if (!id) return;
    setFetching(true);
    try {
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('parent_id', id)
        .eq('role', 'cashier')
        .order('username', { ascending: true });

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
      console.error("Critical Node Fetch Error:", err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isMounted) {
        setOperatorId(user.id);
        fetchStaffWithStats(user.id);

        // REAL-TIME LISTENER: Refresh table if cashiers place bets or get funded
        const channel = supabase
          .channel('staff-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            fetchStaffWithStats(user.id);
          })
          .subscribe();

        return () => supabase.removeChannel(channel);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [fetchStaffWithStats]);

  // 2. DEPLOYMENT: Creates a new Cashier Auth & Profile
  const handleCreateCashier = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.rpc('admin_create_cashier', {
        target_email: form.email,
        target_password: form.password,
        target_username: form.username,
        op_id: operatorId
      });

      if (error) throw error;
      setForm({ email: '', password: '', username: '' });
      await fetchStaffWithStats(operatorId);
      alert("Terminal Node Successfully Deployed.");
    } catch (error) {
      alert("Deployment Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. QUICK FUND: Refactored with 'p_' parameters for immediate balance reduction
  const quickFund = async (cashierId, cashierName) => {
    const amount = prompt(`Enter liquidity volume for ${cashierName.toUpperCase()}:`);
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;

    setFetching(true); // Show activity during transfer
    try {
      const { error } = await supabase.rpc('transfer_credits', {
        p_sender_id: operatorId,
        p_receiver_id: cashierId,
        p_amount: parseFloat(amount)
      });

      if (error) throw error;
      
      // Force immediate UI refresh to show reduced operator balance & increased cashier balance
      await fetchStaffWithStats(operatorId);
    } catch (err) {
      alert("Transfer Protocol Failed: " + err.message);
    } finally {
      setFetching(false);
    }
  };

  const totalShopFloat = staff.reduce((acc, s) => acc + parseFloat(s.balance || 0), 0);

  return (
    <OperatorLayout>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-500">
              <RefreshCw size={12} className={fetching ? 'animate-spin' : ''} />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] italic">Infrastructure Management</span>
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Network Nodes</h1>
          </div>

          <div className="bg-[#111926] px-10 py-6 rounded-[2.5rem] border border-white/5 flex flex-col items-end shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#10b981]/5 blur-3xl rounded-full" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] italic mb-1">Consolidated Node Float</span>
            <span className="text-3xl font-black text-[#10b981] italic tracking-tighter tabular-nums">
              KES {totalShopFloat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* DEPLOYMENT FORM */}
          <div className="lg:col-span-4">
             <div className="bg-[#111926] p-10 rounded-[3rem] border border-white/5 space-y-8 sticky top-8 shadow-2xl">
                <div className="flex items-center gap-3 border-b border-white/5 pb-6">
                   <PlusCircle size={18} className="text-blue-500" />
                   <h2 className="font-black uppercase text-xs italic tracking-widest">Deploy Node</h2>
                </div>
                
                <form onSubmit={handleCreateCashier} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic tracking-widest">Node Username</label>
                    <input value={form.username} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all" placeholder="CASHIER_01" onChange={e => setForm({...form, username: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic tracking-widest">Auth Email</label>
                    <input value={form.email} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all" placeholder="terminal@lucra.bet" onChange={e => setForm({...form, email: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic tracking-widest">Access Key</label>
                    <input value={form.password} className="w-full bg-[#0b0f1a] p-5 rounded-2xl border border-white/5 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all" type="password" placeholder="••••••••" onChange={e => setForm({...form, password: e.target.value})} required />
                  </div>

                  <button disabled={loading} className="w-full bg-blue-600 text-white font-black py-6 rounded-2xl hover:bg-white hover:text-black transition-all active:scale-[0.97] italic text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/10">
                    {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Initialize Terminal"}
                  </button>
                </form>
             </div>
          </div>

          {/* LEDGER TABLE */}
          <div className="lg:col-span-8">
            <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
              <div className="p-10 border-b border-white/5 bg-white/[0.01]">
                <h2 className="font-black uppercase text-xs italic tracking-widest flex items-center gap-3">
                   <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
                   Live Terminal Registry
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-black/20 text-slate-600 uppercase text-[9px] font-black italic tracking-widest">
                    <tr>
                      <th className="p-10">Node Identity</th>
                      <th className="p-10 text-center">Bets</th>
                      <th className="p-10 text-center">Liquidity</th>
                      <th className="p-10 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {staff.map(s => (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition-all group">
                        <td className="p-10">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-[#0b0f1a] rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-blue-500/30 transition-all">
                               <Monitor size={20} className="text-slate-600 group-hover:text-blue-500" />
                            </div>
                            <div>
                              <p className="font-black uppercase italic text-xl tracking-tighter text-white">{s.username}</p>
                              <p className="text-[9px] text-slate-600 font-bold uppercase mt-1 italic tracking-widest">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-10 text-center">
                            <div className="flex items-center justify-center gap-2 text-[#10b981]">
                              <Ticket size={14} />
                              <span className="text-base font-black italic">{s.ticketCount}</span>
                            </div>
                        </td>
                        <td className="p-10 text-center">
                          <span className="text-lg font-black italic text-[#10b981] tabular-nums">
                            KES {parseFloat(s.balance || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-10 text-right">
                           <button 
                             onClick={() => quickFund(s.id, s.username)}
                             className="bg-white/5 p-4 px-6 rounded-2xl hover:bg-[#10b981] hover:text-black transition-all border border-white/5 flex items-center gap-2 ml-auto group/btn"
                           >
                             <Send size={14} />
                             <span className="text-[10px] font-black uppercase italic">Fund Node</span>
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {staff.length === 0 && !fetching && (
                   <div className="p-20 text-center text-slate-700 font-black uppercase italic text-xs tracking-widest">
                      Zero Active Terminal Nodes Found
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
