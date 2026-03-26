import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { UserPlus, Briefcase, Wallet, ShieldCheck, Activity } from 'lucide-react';

export default function ManageOperators() {
  const [operators, setOperators] = useState([]);
  const [adminId, setAdminId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);

  // 1. Fetch ALL Operators in the system
  const fetchOperators = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'operator') // We only filter by role 'operator' to see everyone
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Fetch error:", error.message);
      return;
    }
    setOperators(data || []);
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAdminId(user.id);
        fetchOperators(); // No longer need to pass ID here
      }
    };
    getSession();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // 2. Register Operator in Auth
    // The Database Trigger we created handles the 'Email Confirmation' and 'Profile Creation'
    const { data, error } = await supabase.auth.signUp({ 
      email: form.email, 
      password: form.password,
      options: {
        data: { 
          username: form.username,
          role: 'operator',      
          parent_id: adminId     
        }
      }
    });
    
    if (error) {
      alert("Error: " + error.message);
      setLoading(false);
      return;
    }

    alert(`Operator ${form.username} is now ACTIVE and VERIFIED.`);
    setForm({ email: '', password: '', username: '' });
    fetchOperators();
    setLoading(false);
  };

  return (
    <AdminLayout>
      <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">Operator Management</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Register and Monitor Shop Owners</p>
          </div>
          <div className="bg-[#10b981]/10 px-4 py-2 rounded-xl border border-[#10b981]/20 flex items-center gap-2">
            <Briefcase size={14} className="text-[#10b981]" />
            <span className="text-[10px] font-black text-[#10b981] uppercase">{operators.length} Registered Operators</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Registration Form */}
          <div className="lg:col-span-4">
            <form onSubmit={handleCreate} className="bg-[#111926] p-8 rounded-[2rem] border border-white/5 space-y-5 shadow-2xl sticky top-8">
              <div className="flex items-center gap-3 mb-2">
                <UserPlus size={20} className="text-[#10b981]" />
                <h2 className="font-black uppercase text-xs italic tracking-widest text-white">New Operator</h2>
              </div>
              
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Shop Name / Username</label>
                <input value={form.username} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 focus:border-[#10b981] outline-none text-sm font-bold uppercase text-white" placeholder="LUCRA_EAST_SHOP" onChange={e => setForm({...form, username: e.target.value})} required />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Operator Email</label>
                <input value={form.email} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 focus:border-[#10b981] outline-none text-sm font-bold text-white" placeholder="owner@shop.bet" onChange={e => setForm({...form, email: e.target.value})} required />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Access Key</label>
                <input value={form.password} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 focus:border-[#10b981] outline-none text-sm font-bold text-white" type="password" placeholder="••••••••" onChange={e => setForm({...form, password: e.target.value})} required />
              </div>

              <button disabled={loading} className="w-full bg-[#10b981] text-black font-black py-4 rounded-xl hover:bg-white transition-all active:scale-95 italic text-xs uppercase">
                {loading ? "AUTHORIZING..." : "GENERATE OPERATOR ID"}
              </button>
            </form>
          </div>

          {/* Operator List */}
          <div className="lg:col-span-8">
            <div className="bg-[#111926] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0b0f1a]/50 text-slate-500 uppercase text-[10px] font-black tracking-widest italic">
                  <tr>
                    <th className="p-6">Operator Identity</th>
                    <th className="p-6 text-center">Master Float</th>
                    <th className="p-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {operators.map(op => (
                    <tr key={op.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#0b0f1a] rounded-full flex items-center justify-center border border-white/5">
                            <ShieldCheck size={18} className="text-slate-500 group-hover:text-[#10b981] transition-colors" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-white uppercase italic tracking-tighter">{op.username}</span>
                            <span className="text-[10px] text-slate-500 font-bold tracking-tight italic uppercase">{op.role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className="bg-[#10b981]/10 text-[#10b981] px-4 py-2 rounded-xl font-mono font-black text-xs italic border border-[#10b981]/20">
                          KES {parseFloat(op.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <button className="text-[10px] font-black text-[#10b981] hover:text-white uppercase tracking-widest italic border border-[#10b981]/30 px-3 py-1 rounded-lg">
                          Send Funds
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {operators.length === 0 && (
                <div className="p-20 text-center text-slate-700 font-black uppercase text-xs tracking-widest italic opacity-20">
                  No Operators Found in Database
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
