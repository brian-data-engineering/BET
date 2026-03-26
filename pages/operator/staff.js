import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { UserPlus, Monitor, ShieldAlert, BadgeCheck } from 'lucide-react';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [operatorId, setOperatorId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);

  // 1. Fetch only THIS operator's cashiers
  const fetchStaff = async (id) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_id', id)
      .eq('role', 'cashier')
      .order('created_at', { ascending: false });
    
    if (!error) setStaff(data || []);
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setOperatorId(user.id);
        fetchStaff(user.id);
      }
    };
    getSession();
  }, []);

  const handleCreateCashier = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // 2. The magic happens here: role is 'cashier', parent is 'operatorId'
    const { error } = await supabase.auth.signUp({ 
      email: form.email, 
      password: form.password,
      options: {
        data: { 
          username: form.username,
          role: 'cashier',      
          parent_id: operatorId     
        }
      }
    });
    
    if (error) {
      alert("Error: " + error.message);
    } else {
      alert(`Terminal ${form.username} is now ONLINE.`);
      setForm({ email: '', password: '', username: '' });
      fetchStaff(operatorId);
    }
    setLoading(false);
  };

  return (
    <AdminLayout>
      <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* Header */}
        <div className="flex flex-col">
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">Staff Management</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Create and Manage Betting Terminals</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Registration Form */}
          <div className="lg:col-span-4">
            <form onSubmit={handleCreateCashier} className="bg-[#111926] p-8 rounded-[2rem] border border-white/5 space-y-5 shadow-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Monitor size={20} className="text-blue-500" />
                <h2 className="font-black uppercase text-xs italic tracking-widest">New Terminal</h2>
              </div>
              
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Terminal Name (e.g. Counter 1)</label>
                <input value={form.username} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 focus:border-blue-500 outline-none text-sm font-bold uppercase" placeholder="TERMINAL_01" onChange={e => setForm({...form, username: e.target.value})} required />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Cashier Email</label>
                <input value={form.email} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 focus:border-blue-500 outline-none text-sm font-bold" placeholder="cashier1@shop.com" onChange={e => setForm({...form, email: e.target.value})} required />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Terminal Pin / Pass</label>
                <input value={form.password} className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 focus:border-blue-500 outline-none text-sm font-bold" type="password" placeholder="••••••••" onChange={e => setForm({...form, password: e.target.value})} required />
              </div>

              <button disabled={loading} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-white hover:text-black transition-all italic text-xs uppercase">
                {loading ? "CONFIGURING..." : "ACTIVATE TERMINAL"}
              </button>
            </form>
          </div>

          {/* Staff List */}
          <div className="lg:col-span-8">
            <div className="bg-[#111926] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0b0f1a]/50 text-slate-500 uppercase text-[10px] font-black tracking-widest italic">
                  <tr>
                    <th className="p-6">Terminal Identity</th>
                    <th className="p-6 text-center">Float Balance</th>
                    <th className="p-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {staff.map(s => (
                    <tr key={s.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#0b0f1a] rounded-full flex items-center justify-center border border-white/5">
                            <BadgeCheck size={18} className="text-blue-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-white uppercase italic tracking-tighter">{s.username}</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase italic">Role: Cashier</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className="bg-blue-500/10 text-blue-400 px-4 py-2 rounded-xl font-mono font-black text-xs italic border border-blue-500/20">
                          KES {parseFloat(s.balance || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <span className="text-[10px] font-black text-[#10b981] uppercase italic">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {staff.length === 0 && (
                <div className="p-20 text-center text-slate-700 font-black uppercase text-xs tracking-widest italic opacity-20">
                  No Terminals Created Yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
