import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AgentLayout from '../../components/agent/AgentLayout';
import { 
  Store, Loader2, Send, Database, PlusSquare, X, 
  ShieldCheck, Search, ChevronLeft, ChevronRight, Monitor 
} from 'lucide-react';

export default function ManageShops() {
  const [shops, setShops] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [agentProfile, setAgentProfile] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', displayName: '' });
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Get Agent's own profile to get tenant_id and logo
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
      setAgentProfile(profile);
      // 2. Get all Shops created by this Agent
      const { data: shopData } = await supabase.from('profiles')
        .select('*')
        .eq('parent_id', user.id)
        .eq('role', 'shop')
        .order('username', { ascending: true });

      if (shopData) setShops(shopData);
    }
    setFetching(false);
  }, []);

  useEffect(() => { 
    fetchData();
  }, [fetchData]);

  const handleCreateShop = async (e) => {
    e.preventDefault();
    setCreating(true);
    // Logic: Shops get a @lucra.shop ghost email
    const ghostEmail = `${form.username.toLowerCase().trim()}@lucra.shop`;

    try {
      const response = await fetch('/api/admin/create-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ghostEmail,
          password: form.password,
          username: form.username.trim(),
          displayName: form.displayName,
          agentId: agentProfile.id,
          tenantId: agentProfile.tenant_id,
          logoUrl: agentProfile.logo_url // Pass the brand logo down
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Shop provisioning failed");
      }

      setForm({ username: '', password: '', displayName: '' });
      setShowAddForm(false);
      fetchData(); // Refresh list
    } catch (error) {
      alert(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDispatch = async (id, name) => {
    if (processingId) return;
    const val = prompt(`Enter KES amount to transfer to ${name.toUpperCase()}:`);
    if (!val) return;
    const amount = Math.trunc(Number(val));
    if (!amount || amount <= 0) return;

    setProcessingId(id);
    try {
      // Re-using your existing process_transfer RPC
      const { error } = await supabase.rpc('process_transfer', {
        p_sender_id: agentProfile.id,
        p_receiver_id: id,
        p_amount: amount
      });
      if (error) alert(`Transfer Failed: ${error.message}`);
      else fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  // Search Logic
  const filteredShops = shops.filter(s => 
    s.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.display_name && s.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredShops.length / itemsPerPage);
  const currentShops = filteredShops.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (fetching) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <AgentLayout profile={agentProfile}>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        {/* HEADER */}
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px] italic mb-1 tracking-widest">
              <Store size={12} /> Retail Network
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Manage Shops</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className={`${showAddForm ? 'bg-red-500/20 text-red-500 border-red-500/50' : 'bg-emerald-600 text-black'} px-8 py-4 rounded-2xl font-black italic uppercase text-xs transition-all flex items-center gap-2 border border-transparent`}
            >
              {showAddForm ? <X size={16} /> : <PlusSquare size={16} />}
              {showAddForm ? 'Cancel' : 'Register New Shop'}
            </button>

            <div className="bg-[#111926] px-10 py-6 rounded-[2.5rem] border border-white/5">
              <span className="text-[9px] font-black text-slate-500 uppercase block mb-1 tracking-widest">Total Shop Liquidity</span>
              <span className="text-3xl font-black text-[#10b981] italic tracking-tighter">
                KES {shops.reduce((acc, s) => acc + (parseFloat(s.balance) || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ADD SHOP FORM */}
        {showAddForm && (
          <form onSubmit={handleCreateShop} className="bg-[#111926] p-8 rounded-[2.5rem] border border-emerald-500/20 flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-2">Shop Username</label>
              <input required placeholder="nairobi_cbd_01" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-2">Location Name</label>
              <input required placeholder="CBD Branch Main" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all" value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block ml-2">Access Password</label>
              <input required type="password" placeholder="••••••••" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <button disabled={creating} className="bg-[#10b981] text-black h-[56px] px-10 rounded-2xl font-black uppercase italic text-xs hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
              {creating ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
              {creating ? 'CREATING...' : 'ACTIVATE SHOP'}
            </button>
          </form>
        )}

        {/* TABLE SECTION */}
        <div className="space-y-6">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="SEARCH SHOPS OR BRANCHES..." 
              className="w-full bg-[#111926] border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-xs font-black uppercase tracking-widest outline-none focus:border-emerald-500/50 transition-all"
              value={searchTerm}
              onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
            />
          </div>

          <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[9px] font-black tracking-[0.3em] italic">
                <tr>
                  <th className="p-8">Shop Location</th>
                  <th className="p-8 text-center">Current Float</th>
                  <th className="p-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentShops.map(s => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-all group">
                    <td className="p-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-black border border-white/5 flex items-center justify-center overflow-hidden">
                          {s.logo_url ? <img src={s.logo_url} className="w-full h-full object-cover" /> : <Store className="text-slate-700" size={20} />}
                        </div>
                        <div>
                          <span className="font-black uppercase italic text-xl tracking-tight block text-white">{s.username}</span>
                          <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">{s.display_name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-8 text-center">
                      <span className="font-black text-[#10b981] italic tracking-tighter text-2xl">KES {parseFloat(s.balance || 0).toLocaleString()}</span>
                    </td>
                    <td className="p-8 text-right">
                      <button 
                        onClick={() => handleDispatch(s.id, s.username)}
                        disabled={processingId !== null}
                        className="bg-white/5 p-4 px-8 rounded-xl hover:bg-[#10b981] hover:text-black transition-all text-[10px] font-black uppercase italic group flex items-center gap-2 ml-auto"
                      >
                        {processingId === s.id ? <Loader2 className="animate-spin" size={14} /> : <>DISPATCH FLOAT <Send size={12} /></>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AgentLayout>
  );
}
