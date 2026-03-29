import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { Monitor, PlusCircle, LayoutDashboard, Database, Ticket, Loader2 } from 'lucide-react';

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
      // FIX: Calling your custom SQL function instead of auth.signUp
      // This happens on the server, keeping your Operator session intact.
      const { error } = await supabase.rpc('admin_create_cashier', {
        target_email: form.email,
        target_password: form.password,
        target_username: form.username,
        op_id: operatorId
      });

      if (error) throw error;

      alert(`Terminal ${form.username} deployed successfully.`);
      setForm({ email: '', password: '', username: '' });
      
      // Refresh list to show the new node
      fetchStaffWithStats(operatorId);
      
    } catch (error) {
      alert("Deployment Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalShopFloat = staff.reduce((acc, s) => acc + parseFloat(s.balance || 0), 0);

  return (
    <ProtectedRoute allowedRoles={['operator']}>
      <AdminLayout>
        <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white font-sans">
          
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
            <div className="lg:col-span-4">
              <form onSubmit={handleCreateCashier} className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 space-y-6 sticky top-8">
                <div className="flex items-center gap-3">
                  <PlusCircle size={20} className="text-blue-500" />
                  <h2 className="font-black uppercase text-xs italic tracking-widest">New Terminal</h2>
                </div>
                
                <input value={form.username} className="w-full bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 text-sm font-bold uppercase text-white" placeholder="NODE NAME" onChange={e => setForm({...form, username: e.target.value})} required />
                <input value={form.email} className="w-full bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 text-sm font-bold text-white" placeholder="EMAIL" onChange={e => setForm({...form, email: e.target.value})} required />
                <input value={form.password} className="w-full bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 text-sm font-bold text-white" type="password" placeholder="PIN/PASSWORD" onChange={e => setForm({...form, password: e.target.value})} required />

                <button disabled={loading} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:scale-105 transition-all italic text-xs uppercase">
                  {loading ? <Loader2 className="animate-spin mx-auto" /> : "DEPLOY TERMINAL"}
                </button>
              </form>
            </div>

            <div className="lg:col-span-8">
              <div className="bg-[#111926] rounded-[2.5rem] border border-white/5 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-black/20 text-slate-500 uppercase text-[9px] font-black italic">
                    <tr>
                      <th className="p-8">Terminal Node</th>
                      <th className="p-8 text-center">Tickets</th>
                      <th className="p-8 text-center">Balance</th>
                      <th className="p-8 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {staff.map(s => (
                      <tr key={s.id} className="hover:bg-white/[0.01] transition-all group">
                        <td className="p-8">
                          <div className="flex items-center gap-4">
                            <Monitor size={20} className="text-slate-600 group-hover:text-blue-500" />
                            <div>
                              <p className="font-black uppercase italic text-lg leading-none">{s.username}</p>
                              <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">ID: {s.id.split('-')[0]}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-8 text-center">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1 text-slate-400">
                              <Ticket size={12} />
                              <span className="text-sm font-black italic">{s.ticketCount}</span>
                            </div>
                            <span className="text-[8px] font-bold uppercase opacity-30 tracking-tighter">Total Lifetime</span>
                          </div>
                        </td>
                        <td className="p-8 text-center">
                          <span className="text-sm font-black italic text-blue-400">KES {parseFloat(s.balance || 0).toLocaleString()}</span>
                        </td>
                        <td className="p-8 text-right">
                           <span className="text-[9px] font-black uppercase italic text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {fetching && <div className="p-10 text-center text-slate-500 italic text-xs uppercase font-bold">Synchronizing Network...</div>}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
