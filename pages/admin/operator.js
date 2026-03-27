import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { UserPlus, Briefcase, Wallet, ShieldCheck, ArrowRightLeft, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/router';

export default function ManageOperators() {
  const router = useRouter();
  const [operators, setOperators] = useState([]);
  const [adminId, setAdminId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);

  // 1. Fetch ALL Operators + Calculate Total Float
  const fetchOperators = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'operator')
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
        fetchOperators();
      }
    };
    getSession();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // 2. Register Operator in Auth
    const { data, error } = await supabase.auth.signUp({ 
      email: form.email, 
      password: form.password,
      options: {
        data: { 
          username: form.username,
          role: 'operator',      
          parent_id: adminId // Links them directly to the Super Admin
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

  // Calculate the total money currently held by all operators
  const totalNetworkFloat = operators.reduce((acc, op) => acc + parseFloat(op.balance || 0), 0);

  return (
    <AdminLayout>
      <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white">
        
        {/* Header & Stats */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Network Governance</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 italic">Managing Lucra Master Operators</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-[#1c2636] px-6 py-4 rounded-2xl border border-white/5 flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic mb-1">Total Operator Float</span>
              <span className="text-xl font-black text-[#10b981] italic tracking-tighter">
                KES {totalNetworkFloat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-[#10b981]/10 px-6 py-4 rounded-2xl border border-[#10b981]/20 flex flex-col items-end">
              <span className="text-[9px] font-black text-[#10b981] uppercase tracking-widest italic mb-1">Active Nodes</span>
              <span className="text-xl font-black text-white italic tracking-tighter">{operators.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Registration Form */}
          <div className="lg:col-span-4">
            <form onSubmit={handleCreate} className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl sticky top-8 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-[#10b981] rounded-lg flex items-center justify-center text-black">
                    <UserPlus size={18} />
                </div>
                <h2 className="font-black uppercase text-xs italic tracking-widest text-white">Register Node</h2>
              </div>
              
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Operator Business Name</label>
                <input value={form.username} className="w-full bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 focus:border-[#10b981] outline-none text-sm font-bold uppercase text-white transition-all" placeholder="E.G. LUCRA_NAIROBI_MAIN" onChange={e => setForm({...form, username: e.target.value})} required />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Official Email</label>
                <input value={form.email} className="w-full bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 focus:border-[#10b981] outline-none text-sm font-bold text-white transition-all" placeholder="admin@lucra-node.com" onChange={e => setForm({...form, email: e.target.value})} required />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Secure Access Key</label>
                <input value={form.password} className="w-full bg-[#0b0f1a] p-4 rounded-2xl border border-white/5 focus:border-[#10b981] outline-none text-sm font-bold text-white transition-all" type="password" placeholder="••••••••" onChange={e => setForm({...form, password: e.target.value})} required />
              </div>

              <button disabled={loading} className="w-full bg-[#10b981] text-black font-black py-5 rounded-2xl hover:bg-white transition-all active:scale-95 italic text-sm uppercase tracking-tighter shadow-xl shadow-[#10b981]/10">
                {loading ? "INITIALIZING NODE..." : "ACTIVATE OPERATOR"}
              </button>
            </form>
          </div>

          {/* Operator List */}
          <div className="lg:col-span-8">
            <div className="bg-[#111926] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
                 <TrendingUp size={16} className="text-[#10b981]" />
                 <span className="text-[10px] font-black uppercase italic text-slate-400">Node Performance & Liquidity</span>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0b0f1a]/50 text-slate-500 uppercase text-[9px] font-black tracking-[0.2em] italic">
                  <tr>
                    <th className="p-8">Identity</th>
                    <th className="p-8 text-center">Current Liquidity</th>
                    <th className="p-8 text-right">Accounting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {operators.map(op => (
                    <tr key={op.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#0b0f1a] rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-[#10b981]/30 transition-all">
                            <ShieldCheck size={20} className="text-slate-600 group-hover:text-[#10b981] transition-colors" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-white uppercase italic tracking-tighter text-base">{op.username}</span>
                            <span className="text-[9px] text-slate-500 font-bold tracking-widest italic uppercase">ID: {op.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-8 text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-white font-black text-lg italic tracking-tighter">
                            KES {parseFloat(op.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <div className="w-24 h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                                <div className="bg-[#10b981] h-full" style={{ width: '40%' }}></div>
                            </div>
                        </div>
                      </td>
                      <td className="p-8 text-right">
                        <button 
                          onClick={() => router.push('/admin/funding')} // Navigates to your Funding portal
                          className="flex items-center gap-2 ml-auto text-[10px] font-black text-[#10b981] hover:text-white uppercase tracking-widest italic border border-[#10b981]/20 hover:border-[#10b981] px-5 py-2 rounded-xl transition-all"
                        >
                          <ArrowRightLeft size={14} />
                          Dispatch Funds
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {operators.length === 0 && (
                <div className="p-32 text-center">
                  <Briefcase size={48} className="mx-auto text-slate-800 mb-4 opacity-20" />
                  <p className="text-slate-700 font-black uppercase text-xs tracking-[0.4em] italic opacity-20">
                    No Registered Nodes Found
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
