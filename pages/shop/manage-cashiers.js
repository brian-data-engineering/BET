import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ShopLayout from '../../components/shop/ShopLayout';
import { 
  Users, Loader2, PlusSquare, X, ShieldCheck, Search, Banknote 
} from 'lucide-react';

export default function ManageCashiers() {
  const [cashiers, setCashiers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [shopProfile, setShopProfile] = useState(null);
  const [fetching, setFetching] = useState(true);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', displayName: '' });
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
      setShopProfile(profile);
      const { data: cashierData } = await supabase.from('profiles')
        .select('*')
        .eq('parent_id', user.id)
        .eq('role', 'cashier')
        .order('username', { ascending: true });

      if (cashierData) setCashiers(cashierData);
    }
    setFetching(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateCashier = async (e) => {
    e.preventDefault();
    setCreating(true);
    // Cashiers use the .internal domain for ghost logic
    const ghostEmail = `${form.username.toLowerCase().trim()}@lucra.internal`;

    try {
      const response = await fetch('/api/admin/create-cashier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ghostEmail,
          password: form.password,
          username: form.username.trim(),
          displayName: form.displayName,
          shopId: shopProfile.id,
          tenantId: shopProfile.tenant_id,
        }),
      });

      if (!response.ok) throw new Error("Cashier provisioning failed");

      setForm({ username: '', password: '', displayName: '' });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      alert(error.message);
    } finally {
      setCreating(false);
    }
  };

  const filtered = cashiers.filter(c => 
    c.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (fetching) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <ShopLayout profile={shopProfile}>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white">
        
        {/* HEADER */}
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px] italic mb-1 tracking-widest">
              <Users size={12} /> Counter Staff
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Manage Cashiers</h1>
          </div>
          
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className={`${showAddForm ? 'bg-red-500/20 text-red-500' : 'bg-emerald-600 text-black'} px-8 py-4 rounded-2xl font-black italic uppercase text-xs transition-all flex items-center gap-2`}
          >
            {showAddForm ? <X size={16} /> : <PlusSquare size={16} />}
            {showAddForm ? 'Cancel' : 'Register Cashier'}
          </button>
        </div>

        {/* ADD FORM */}
        {showAddForm && (
          <form onSubmit={handleCreateCashier} className="bg-[#111926] p-8 rounded-[2.5rem] border border-emerald-500/20 flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-2">Username</label>
              <input required className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-2">Full Name</label>
              <input required className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500" value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-2">Passcode</label>
              <input required type="password" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <button disabled={creating} className="bg-[#10b981] text-black h-[56px] px-10 rounded-2xl font-black uppercase italic text-xs">
              {creating ? <Loader2 className="animate-spin" size={16} /> : 'Activate'}
            </button>
          </form>
        )}

        {/* TABLE */}
        <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[9px] font-black tracking-[0.3em] italic">
              <tr>
                <th className="p-8">Cashier Identifier</th>
                <th className="p-8 text-center">Holding Float</th>
                <th className="p-8 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="p-8 font-black uppercase italic text-xl">{c.username}</td>
                  <td className="p-8 text-center font-black text-emerald-500 text-2xl italic">
                    KES {parseFloat(c.balance || 0).toLocaleString()}
                  </td>
                  <td className="p-8 text-right">
                    <span className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase italic border border-emerald-500/20">Active Node</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ShopLayout>
  );
}
