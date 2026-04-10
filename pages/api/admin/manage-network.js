import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout'; // Your operator wrapper
import { 
  UserPlus, 
  Network, 
  Store, 
  Monitor, 
  Search, 
  Database, 
  Activity,
  ChevronRight
} from 'lucide-react';

export default function OperatorNetwork() {
  const [allNodes, setAllNodes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [operator, setOperator] = useState(null);
  const [loading, setLoading] = useState(false);
  const [provisionType, setProvisionType] = useState('agent'); // agent | shop | cashier
  
  const [form, setForm] = useState({ 
    password: '', 
    username: '', 
    displayName: '', 
    selectedAgentId: '',
    selectedShopId: ''
  });

  // Fetch only nodes belonging to THIS operator's tenant
  const syncNetwork = useCallback(async (tenantId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('role', { ascending: true });

    if (!error) setAllNodes(data);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch operator's own profile to get their tenant_id/logo
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setOperator(profile);
        syncNetwork(profile.id);
      }
    };
    getSession();
  }, [syncNetwork]);

  // Logic to filter dropdowns
  const agents = useMemo(() => allNodes.filter(n => n.role === 'agent'), [allNodes]);
  const shops = useMemo(() => allNodes.filter(n => n.role === 'shop'), [allNodes]);

  const handleProvision = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Determine parent based on role
    let parentId = operator.id; // Default for Agent
    if (provisionType === 'shop') parentId = form.selectedAgentId;
    if (provisionType === 'cashier') parentId = form.selectedShopId;

    try {
      const response = await fetch('/api/operator/create-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `${form.username.toLowerCase()}@${operator.username}.internal`,
          password: form.password,
          username: form.username,
          displayName: form.displayName,
          role: provisionType,
          parentId: parentId,
          tenantId: operator.id, // Absolute lock to this operator
          logoUrl: operator.logo_url // Auto-inherit brand logo
        }),
      });

      if (!response.ok) throw new Error("Network expansion failed");
      
      setForm({ password: '', username: '', displayName: '', selectedAgentId: '', selectedShopId: '' });
      syncNetwork(operator.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <OperatorLayout>
      <div className="p-8 space-y-8 bg-[#0a0c14] min-h-screen text-white">
        
        {/* BRAND HEADER */}
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">Network Expansion</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">
              Managing Brand: <span className="text-blue-500">{operator?.display_name}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-slate-600 uppercase block">Total Downline</span>
            <span className="text-3xl font-black italic">{allNodes.length - 1} Nodes</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* FORM PANEL */}
          <div className="lg:col-span-4">
            <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <div className="flex bg-black/40 p-1 rounded-xl mb-6 border border-white/5">
                {[
                  { id: 'agent', icon: Network, label: 'Agent' },
                  { id: 'shop', icon: Store, label: 'Shop' },
                  { id: 'cashier', icon: Monitor, label: 'Cashier' }
                ].map(r => (
                  <button key={r.id} onClick={() => setProvisionType(r.id)} className={`flex-1 py-2 rounded-lg flex flex-col items-center transition-all ${provisionType === r.id ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
                    <r.icon size={14} />
                    <span className="text-[7px] font-black uppercase mt-1">{r.label}</span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleProvision} className="space-y-4">
                {/* HIERARCHY PICKERS */}
                {provisionType === 'shop' && (
                  <select required className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-xs font-bold" value={form.selectedAgentId} onChange={e => setForm({...form, selectedAgentId: e.target.value})}>
                    <option value="">Assign to Agent...</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}
                  </select>
                )}

                {provisionType === 'cashier' && (
                  <select required className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-xs font-bold" value={form.selectedShopId} onChange={e => setForm({...form, selectedShopId: e.target.value})}>
                    <option value="">Assign to Shop...</option>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
                  </select>
                )}

                <input required className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-xs font-bold" placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                <input required type="password" className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-xs font-bold" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                <input required className="w-full bg-[#0b0f1a] p-4 rounded-xl border border-white/5 text-xs font-bold" placeholder="Display Name (e.g. Westlands Branch)" value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} />

                <button disabled={loading} className="w-full bg-blue-600 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] shadow-lg shadow-blue-900/20">
                  {loading ? 'DEPLOYING NODE...' : `ACTIVATE ${provisionType}`}
                </button>
              </form>
            </div>
          </div>

          {/* LIST PANEL */}
          <div className="lg:col-span-8 space-y-4">
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input className="w-full bg-[#111926] py-4 pl-12 pr-4 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest" placeholder="FILTER NETWORK..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
             </div>

             <div className="bg-[#111926] rounded-[2.5rem] border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center gap-2">
                  <Database size={14} className="text-blue-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Active Branch Registry</span>
                </div>
                <div className="divide-y divide-white/5">
                  {allNodes.filter(n => n.id !== operator?.id).map(node => (
                    <div key={node.id} className="p-6 flex justify-between items-center hover:bg-white/[0.01]">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${node.role === 'agent' ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/5'}`}>
                          {node.role === 'agent' ? <Network size={16} className="text-purple-500" /> : <Store size={16} className="text-slate-500" />}
                        </div>
                        <div>
                          <p className="font-black italic uppercase tracking-tighter text-lg">{node.username}</p>
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{node.role} • {node.display_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black italic">KES {parseFloat(node.balance).toLocaleString()}</span>
                        <ChevronRight size={14} className="text-slate-800 ml-auto mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
