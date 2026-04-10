import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AgentLayout from '../../components/agent/AgentLayout';
import { 
  Monitor, Loader2, Store, HardDrive, 
  UserPlus, X, Network 
} from 'lucide-react';

export default function ManageNetwork() {
  const [nodes, setNodes] = useState([]); 
  const [agentProfile, setAgentProfile] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [provisionType, setProvisionType] = useState('shop'); // shop | cashier
  const [form, setForm] = useState({ 
    username: '', 
    password: '', 
    displayName: '',
    selectedParentId: '' 
  });
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile) {
      setAgentProfile(profile);
      // Fetch all Shops and Cashiers belonging to this Agent's tenant
      // And filter specifically for nodes where this agent is the ancestor
      const { data: directNodes } = await supabase.from('profiles')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .neq('id', profile.id) // Don't show self
        .order('role', { ascending: false });

      if (directNodes) setNodes(directNodes);
    }
    setFetching(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- TOP-DOWN LOGIC ---
  const potentialParents = useMemo(() => {
    // If making a Shop, the parent is ALWAYS the Agent (Implicit)
    if (provisionType === 'shop') return []; 
    // If making a Cashier, they MUST report to a Shop owned by this Agent
    if (provisionType === 'cashier') return nodes.filter(n => n.role === 'shop');
    return [];
  }, [provisionType, nodes]);

  const handleCreateNode = async (e) => {
    e.preventDefault();
    setCreating(true);
    
    // Ghost Email remains @lucra.internal as per project standard
    const ghostEmail = `${form.username.toLowerCase().trim()}@lucra.internal`;
    
    // Determine Parent: Shops report to Agent, Cashiers report to selected Shop
    const finalParentId = provisionType === 'shop' ? agentProfile.id : form.selectedParentId;

    if (provisionType === 'cashier' && !finalParentId) {
      alert("Selection Required: Assign this Cashier to a Shop.");
      setCreating(false);
      return;
    }

    try {
      const response = await fetch('/api/agent/create-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ghostEmail,
          password: form.password,
          username: form.username.trim(),
          displayName: form.displayName,
          role: provisionType,
          parentId: finalParentId,
          tenantId: agentProfile.tenant_id, 
          logoUrl: agentProfile.logo_url
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deployment failed");

      setForm({ username: '', password: '', displayName: '', selectedParentId: '' });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      alert(error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <AgentLayout profile={agentProfile}>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white">
        
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">Network Expansion</h1>
            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Agent Portal: {agentProfile?.display_name}</p>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${showAddForm ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-600 text-white'}`}
          >
            {showAddForm ? 'Cancel' : 'Provision Node'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleCreateNode} className="bg-[#111926] p-10 rounded-[2.5rem] border border-emerald-500/20 space-y-8 animate-in slide-in-from-top-4">
            
            {/* ROLE SELECTOR */}
            <div className="flex bg-black/40 p-1.5 rounded-xl w-fit border border-white/5">
              {[
                { id: 'shop', label: 'Shop', icon: Store },
                { id: 'cashier', label: 'Cashier', icon: HardDrive }
              ].map(type => (
                <button 
                  key={type.id} 
                  type="button"
                  onClick={() => { setProvisionType(type.id); setForm({...form, selectedParentId: ''}); }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${provisionType === type.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                  <type.icon size={14} />
                  <span className="text-[10px] font-black uppercase">{type.label}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* DROPDOWN: Only shows when building a Cashier */}
              {provisionType === 'cashier' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 ml-2 italic">Parent Shop</label>
                  <select 
                    required 
                    className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-bold text-white outline-none focus:border-emerald-500"
                    value={form.selectedParentId}
                    onChange={e => setForm({...form, selectedParentId: e.target.value})}
                  >
                    <option value="">Select Shop...</option>
                    {potentialParents.map(p => (
                      <option key={p.id} value={p.id}>{p.username} ({p.display_name})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 ml-2 italic">Username</label>
                <input required className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 ml-2 italic">Display Name</label>
                <input required className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500" value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-500 ml-2 italic">Passcode</label>
                <input required type="password" className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
            </div>

            <button disabled={creating} className="w-full bg-emerald-500 text-black py-5 rounded-2xl font-black uppercase italic text-xs tracking-widest hover:brightness-110 transition-all">
              {creating ? 'SYNCING...' : `AUTHORIZE ${provisionType.toUpperCase()}`}
            </button>
          </form>
        )}

        {/* NETWORK TABLE */}
        <div className="bg-[#111926] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-[#0b0f1a]/50 text-slate-600 uppercase text-[8px] font-black tracking-[0.4em] italic">
              <tr>
                <th className="p-8">Node</th>
                <th className="p-8">Owner/Identity</th>
                <th className="p-8 text-center">Float</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {nodes.map(node => (
                <tr key={node.id} className="hover:bg-white/[0.02]">
                  <td className="p-8">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${node.role === 'shop' ? 'border-purple-500/20 text-purple-500' : 'border-slate-500/20 text-slate-500'}`}>
                      {node.role === 'shop' ? <Store size={16}/> : <HardDrive size={16}/>}
                    </div>
                  </td>
                  <td className="p-8">
                    <span className="font-black uppercase italic text-lg block">{node.username}</span>
                    <span className="text-[8px] font-black text-slate-500 uppercase">{node.role} • {node.display_name}</span>
                  </td>
                  <td className="p-8 text-center font-black text-emerald-500 italic text-2xl">
                    KES {parseFloat(node.balance || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AgentLayout>
  );
}
