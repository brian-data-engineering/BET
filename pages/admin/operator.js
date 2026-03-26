import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { UserPlus, Users, Wallet, ShieldCheck } from 'lucide-react';

export default function ManageOperatorStaff() {
  const [cashiers, setCashiers] = useState([]);
  const [operatorId, setOperatorId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);

  // 1. Fetch only cashiers belonging to this Operator
  const fetchCashiers = async (id) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_id', id)
      .eq('role', 'cashier')
      .order('created_at', { ascending: false });
    
    setCashiers(data || []);
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setOperatorId(user.id);
        fetchCashiers(user.id);
      }
    };
    getSession();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // 2. Create the Auth Account
    const { data, error } = await supabase.auth.signUp({ 
      email: form.email, 
      password: form.password,
      options: {
        data: { username: form.username }
      }
    });
    
    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // 3. Insert into Profiles with the CHAIN link (parent_id)
    const { error: profileError } = await supabase.from('profiles').insert([
      { 
        id: data.user.id, 
        username: form.username, 
        role: 'cashier', 
        parent_id: operatorId, // Crucial for hierarchy
        balance: 0 
      }
    ]);
    
    if (profileError) {
      alert("Auth created, but profile failed: " + profileError.message);
    } else {
      alert("Cashier Terminal Created Successfully!");
      setForm({ email: '', password: '', username: '' });
      fetchCashiers(operatorId);
    }
    setLoading(false);
  };

  return (
    <AdminLayout>
      <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Staff Management</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Terminal Personnel Control</p>
          </div>
          <div className="bg-[#10b981]/10 px-4 py-2 rounded-xl border border-[#10b981]/20 flex items-center gap-2">
            <Users size={14} className="text-[#10b981]" />
            <span className="text-[10px] font-black text-[#10b981] uppercase">{cashiers.length} Active Staff</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Registration Form */}
          <div className="lg:col-span-4">
            <form onSubmit={handleCreate} className="bg-[#111926] p-8 rounded-[2rem] border border-white/5 space-y-5 shadow-2xl sticky top-8">
              <div className="flex items-center gap-3 mb-2">
                <UserPlus size={20} className="text-[#10b981]" />
                <h2 className="font-black uppercase text-xs italic tracking-widest">Register Cashier</h2>
              </div>
              
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Unique Username</label>
                <input value={form.username} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 focus:border-[#10b981] outline-none text-sm font-bold uppercase" placeholder="STAFF_01" onChange={e => setForm({...form, username: e.target.value})} required />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Terminal Email</label>
                <input value={form.email} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 focus:border-[#10b981] outline-none text-sm font-bold" placeholder="staff@lucra.bet" onChange={e => setForm({...form, email: e.target.value})} required />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Access Key</label>
                <input value={form.password} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 focus:border-[#10b981] outline-none text-sm font-bold" type="password" placeholder="••••••••" onChange={e => setForm({...form, password: e.target.value})} required />
              </div>

              <button disabled={loading} className="w-full bg-[#10b981] text-black font-black py-4 rounded-xl hover:bg-white transition-all active:scale-95 italic text-xs uppercase">
                {loading ? "PROCESSING..." : "ACTIVATE TERMINAL"}
              </button>
            </form>
          </div>

          {/* Cashier List */}
          <div className="lg:col-span-8">
            <div className="bg-[#111926] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0b0f1a]/50 text-slate-500 uppercase text-[10px] font-black tracking-widest italic">
                  <tr>
                    <th className="p-6">Staff Identity</th>
                    <th className="p-6 text-center">Available Float</th>
                    <th className="p-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cashiers.map(c => (
                    <tr key={c.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#0b0f1a] rounded-full flex items-center justify-center border border-white/5">
                            <ShieldCheck size={18} className="text-slate-500 group-hover:text-[#10b981] transition-colors" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-white uppercase italic tracking-tighter">{c.username}</span>
                            <span className="text-[10px] text-slate-500 font-bold">{new Date(c.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className="bg-[#10b981]/10 text-[#10b981] px-4 py-2 rounded-xl font-mono font-black text-xs italic border border-[#10b981]/20">
                          KES {parseFloat(c.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <button className="text-[10px] font-black text-[#10b981] hover:text-white uppercase tracking-widest italic border border-[#10b981]/30 px-3 py-1 rounded-lg">
                          Manage Float
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {cashiers.length === 0 && (
                <div className="p-20 text-center text-slate-700 font-black uppercase text-xs tracking-widest italic opacity-20">
                  No Cashiers Assigned to this Shop
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
