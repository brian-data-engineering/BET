import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import OperatorLayout from '../../components/operator/OperatorLayout';
import { Monitor, Loader2, Send, Database, UserPlus } from 'lucide-react';

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [operatorProfile, setOperatorProfile] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // --- NEW STATE FOR CREATING CASHIERS ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [pRes, sRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('profiles')
        .select('*')
        .eq('parent_id', user.id)
        .eq('role', 'cashier')
        .order('username', { ascending: true })
    ]);

    if (pRes.data) setOperatorProfile(pRes.data);
    if (sRes.data) setStaff(sRes.data);
    setFetching(false);
  }, []);

  useEffect(() => { 
    fetchData();
    const channel = supabase
      .channel('staff-mgmt-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // --- NEW FUNCTION: CREATE CASHIER ---
  const handleCreateCashier = async (e) => {
    e.preventDefault();
    setCreating(true);
    
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        // CRITICAL: Prevents the Operator from being logged out
        shouldCreateSession: false, 
        data: { 
          username: form.username,
          role: 'cashier',      
          parent_id: operatorProfile.id 
        }
      }
    });

    if (error) {
      alert(`Provisioning Failed: ${error.message}`);
    } else {
      alert(`CASHIER ACTIVATED: ${form.username.toUpperCase()}`);
      setForm({ email: '', password: '', username: '' });
      setShowAddForm(false);
      fetchData(); // Refresh list
    }
    setCreating(false);
  };

  const handleDispatch = async (id, name) => {
    // ... (Your existing handleDispatch code stays the same)
  };

  return (
    <OperatorLayout profile={operatorProfile}>
      <div className="p-8 space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <div className="flex items-center gap-2 text-blue-500 font-black uppercase text-[10px] italic mb-1 tracking-widest">
              <Database size={12} /> Network Integrity
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Terminal Nodes</h1>
          </div>
          
          <div className="flex gap-4">
            {/* NEW: Toggle Add Form */}
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 px-8 py-4 rounded-2xl font-black italic uppercase text-xs hover:bg-blue-500 transition-all flex items-center gap-2"
            >
              <UserPlus size={16} /> {showAddForm ? 'Cancel' : 'Add Cashier'}
            </button>

            <div className="bg-[#111926] px-10 py-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <span className="text-[9px] font-black text-slate-500 uppercase italic block mb-1">Active Network Float</span>
              <span className="text-3xl font-black text-[#10b981] italic tracking-tighter">
                KES {parseFloat(staff.reduce((acc, s) => acc + (s.balance || 0), 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* NEW: The Provisioning Form UI */}
        {showAddForm && (
          <form onSubmit={handleCreateCashier} className="bg-[#111926] p-10 rounded-[3rem] border border-blue-500/30 grid grid-cols-4 gap-6 items-end animate-in fade-in slide-in-from-top-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase italic text-slate-500 ml-2">Username</label>
              <input 
                required
                className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-sm focus:border-blue-500 outline-none" 
                placeholder="CASHIER_01"
                value={form.username}
                onChange={e => setForm({...form, username: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase italic text-slate-500 ml-2">Email</label>
              <input 
                required
                type="email"
                className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-sm focus:border-blue-500 outline-none" 
                placeholder="cashier@lucra.com"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase italic text-slate-500 ml-2">Access Key (Password)</label>
              <input 
                required
                type="password"
                className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-sm focus:border-blue-500 outline-none" 
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
              />
            </div>
            <button 
              disabled={creating}
              className="bg-[#10b981] text-black p-4 rounded-2xl font-black uppercase italic text-xs hover:scale-[1.02] active:scale-95 transition-all"
            >
              {creating ? 'Initializing...' : 'Confirm Node Activation'}
            </button>
          </form>
        )}

        <div className="bg-[#111926] rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          {/* ... (Rest of your table code remains exactly as it was) */}
        </div>
      </div>
    </OperatorLayout>
  );
}
