import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ShopLayout from '../../components/shop/ShopLayout';
import { 
  Users, 
  Plus, 
  Search, 
  Terminal, 
  ShieldCheck, 
  Activity, 
  X, 
  Loader2, 
  Wallet,
  ArrowRight
} from 'lucide-react';

export default function ManageCashiers() {
  const [cashiers, setCashiers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [form, setForm] = useState({ username: '', displayName: '', password: '' });
  const [processing, setProcessing] = useState(false);

  const fetchCashiers = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch Shop Profile
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(p);

    // Fetch only this shop's cashiers
    const { data: c } = await supabase.from('profiles')
      .select('*')
      .eq('parent_id', user.id)
      .eq('role', 'cashier')
      .order('username', { ascending: true });

    setCashiers(c || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCashiers(); }, [fetchCashiers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setProcessing(true);
    
    // Ghost Logic: Mapping to internal domain
    const ghostEmail = `${form.username.toLowerCase().trim()}@lucra.internal`;

    try {
      const response = await fetch('/api/admin/create-cashier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ghostEmail,
          password: form.password,
          username: form.username.toLowerCase().trim(),
          displayName: form.displayName,
          parentId: profile.id,
          tenantId: profile.tenant_id
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setForm({ username: '', displayName: '', password: '' });
      setIsAdding(false);
      fetchCashiers();
    } catch (err) {
      alert("PROVISIONING FAILED: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ShopLayout profile={profile}>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER SECTION */}
        <header className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px] italic mb-1 tracking-[0.3em]">
              <Terminal size={12} /> Edge Node Management
            </div>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Cashiers</h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] mt-4 tracking-widest">Active terminal operators in this branch</p>
          </div>
          
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={`flex items-center gap-3 px-8 py-5 rounded-2xl font-black italic uppercase text-xs tracking-widest transition-all ${isAdding ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-600 text-black hover:bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]'}`}
          >
            {isAdding ? <X size={18} /> : <Plus size={18} />}
            {isAdding ? 'Abort Registration' : 'Register New Node'}
          </button>
        </header>

        {/* REGISTRATION FORM (MODAL-ISH) */}
        {isAdding && (
          <div className="bg-[#111926] p-10 rounded-[3rem] border border-emerald-500/20 shadow-2xl animate-in fade-in slide-in-from-top-4">
            <h3 className="text-emerald-500 font-black uppercase italic text-sm mb-8 tracking-widest">Provision New Cashier Terminal</h3>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Terminal Username</label>
                <input 
                  required
                  placeholder="e.g. counter_01"
                  className="w-full bg-[#0b0f1a] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500 font-bold text-white transition-all"
                  value={form.username}
                  onChange={e => setForm({...form, username: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Operator Name</label>
                <input 
                  required
                  placeholder="e.g. John Doe"
                  className="w-full bg-[#0b0f1a] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500 font-bold text-white transition-all"
                  value={form.displayName}
                  onChange={e => setForm({...form, displayName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Access Passcode</label>
                <input 
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-[#0b0f1a] border border-white/5 p-5 rounded-2xl outline-none focus:border-emerald-500 font-bold text-white transition-all"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                />
              </div>
              <div className="md:col-span-3 pt-4">
                <button 
                  disabled={processing}
                  className="w-full bg-emerald-600 text-black font-black py-6 rounded-2xl uppercase italic text-xs tracking-[0.4em] flex items-center justify-center gap-3"
                >
                  {processing ? <Loader2 className="animate-spin" /> : <ShieldCheck size={18} />}
                  {processing ? 'SYNCHRONIZING WITH CORE...' : 'AUTHORIZE & ACTIVATE TERMINAL'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CASHIERS LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-20 text-center text-slate-700 animate-pulse uppercase font-black text-xs tracking-widest">Scanning Network...</div>
          ) : cashiers.length > 0 ? cashiers.map(cashier => (
            <div key={cashier.id} className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
               {/* Background Accent */}
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Activity size={80} className="text-emerald-500" />
               </div>

               <div className="relative z-10 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                        <Users className="text-emerald-500" size={20} />
                    </div>
                    <span className="text-[9px] font-black uppercase text-[#10b981] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/10 tracking-widest">Online</span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tight">{cashier.username}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{cashier.display_name}</p>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex justify-between items-end">
                    <div>
                      <span className="text-[9px] font-black text-slate-600 uppercase block mb-1">Current Float</span>
                      <span className="text-2xl font-black italic text-white tracking-tighter">KES {parseFloat(cashier.balance || 0).toLocaleString()}</span>
                    </div>
                    <button 
                      onClick={() => window.location.href='/shop/funding'}
                      className="p-3 bg-white/5 rounded-xl hover:bg-emerald-600 hover:text-black transition-all"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
               </div>
            </div>
          )) : (
            <div className="col-span-full py-20 bg-[#111926] rounded-[3rem] border border-dashed border-white/10 text-center">
                <Wallet className="mx-auto text-white/5 mb-4" size={48} />
                <p className="text-slate-600 font-black uppercase text-[10px] tracking-[0.4em]">No active cashier nodes found in this branch</p>
            </div>
          )}
        </div>
      </div>
    </ShopLayout>
  );
}
