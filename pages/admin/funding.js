import { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout, { AdminContext } from '../../components/admin/AdminLayout';
import { ShieldCheck, Send, UserCheck, Zap, History } from 'lucide-react';

export default function MasterFunding() {
  const { profile: adminProfile } = useContext(AdminContext);
  const [accounts, setAccounts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchTargets = async () => {
    if (!adminProfile?.id) return;

    try {
      // Direct query based on your confirmed SQL results
      let query = supabase.from('profiles').select('id, username, balance, role, parent_id');

      if (adminProfile.role === 'super_admin') {
        query = query.eq('role', 'operator');
      } else {
        query = query.eq('role', 'cashier').eq('parent_id', adminProfile.id);
      }

      const { data, error } = await query.order('username', { ascending: true });
      if (error) throw error;

      console.table(data); // This will show your operators in the F12 console
      setAccounts(data || []);
    } catch (err) {
      console.error("Fetch failed:", err.message);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, [adminProfile]);

  const handleDispatch = async () => {
    const numAmount = parseFloat(amount);
    const myBalance = Number(adminProfile?.balance || 0);

    if (!selectedId || isNaN(numAmount) || numAmount <= 0) {
      alert("Invalid Amount");
      return;
    }

    if (numAmount > myBalance) {
      alert("Insufficient Treasury Funds");
      return;
    }

    setIsProcessing(true);
    const { error } = await supabase.rpc('transfer_credits', {
      sender_id: adminProfile.id,
      receiver_id: selectedId,
      amount_to_transfer: numAmount
    });

    if (error) {
      alert("Error: " + error.message);
    } else {
      setAmount('');
      setSelectedId('');
      fetchTargets();
      alert("Injection Complete.");
    }
    setIsProcessing(false);
  };

  if (!adminProfile) return <AdminLayout><div className="h-screen bg-[#0b0f1a]" /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white">
        
        {/* TREASURY HEADER */}
        <div className="flex justify-between items-center bg-[#111926] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-[#10b981]" size={18} />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Node: {adminProfile.username}</span>
            </div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Master Treasury</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#10b981] font-black uppercase italic mb-1">Available Float</p>
            <p className="text-4xl font-black italic tracking-tighter">
              KES {Number(adminProfile.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* FORM AREA */}
          <div className="bg-[#111926] p-10 rounded-[3rem] border border-white/5 space-y-8">
            <div className="space-y-4">
              <label className="text-[9px] font-black text-slate-500 uppercase italic tracking-[0.2em] ml-2">Target Node</label>
              <select 
                className="w-full bg-[#0b0f1a] border border-white/10 p-5 rounded-2xl text-sm font-bold uppercase text-white focus:border-[#10b981] outline-none"
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
              >
                <option value="">Select Account...</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-[#111926]">
                    {acc.username.toUpperCase()} (KES {Number(acc.balance).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <label className="text-[9px] font-black text-slate-500 uppercase italic tracking-[0.2em] ml-2">Funding Volume (KES)</label>
              <input 
                type="number" 
                className="w-full bg-[#0b0f1a] border border-white/10 p-6 rounded-2xl text-[#10b981] font-black text-4xl outline-none focus:border-[#10b981]"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            <button 
              onClick={handleDispatch}
              disabled={isProcessing || !selectedId || !amount}
              className="w-full bg-[#10b981] text-black font-black py-6 rounded-2xl hover:bg-white transition-all disabled:opacity-20 uppercase italic tracking-widest shadow-lg shadow-[#10b981]/5"
            >
              {isProcessing ? 'Authorizing...' : 'Execute Injection'}
            </button>
          </div>

          {/* PREVIEW AREA */}
          <div className="flex items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] p-12">
            {selectedId ? (
              <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="w-24 h-24 bg-[#10b981]/10 rounded-full flex items-center justify-center mx-auto border border-[#10b981]/20">
                  <UserCheck className="text-[#10b981]" size={40} />
                </div>
                <div>
                  <h3 className="text-3xl font-black uppercase italic">{accounts.find(a => a.id === selectedId)?.username}</h3>
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="text-right">
                      <p className="text-[8px] text-slate-500 font-bold uppercase">Current</p>
                      <p className="text-sm font-bold italic">KES {Number(accounts.find(a => a.id === selectedId)?.balance).toLocaleString()}</p>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="text-left">
                      <p className="text-[8px] text-[#10b981] font-bold uppercase">New Total</p>
                      <p className="text-sm font-bold italic text-[#10b981]">
                        KES {(Number(accounts.find(a => a.id === selectedId)?.balance || 0) + (Number(amount) || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="opacity-20 flex flex-col items-center">
                <Zap className="mb-4" size={48} />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] italic">Identify Target Node</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
