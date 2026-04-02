import { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout, { AdminContext } from '../../components/admin/AdminLayout';
import { Wallet, Send, UserCheck, ShieldCheck, Zap } from 'lucide-react';

export default function MasterFunding() {
  const { profile: adminProfile } = useContext(AdminContext);
  const [accounts, setAccounts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const fetchTargets = async () => {
    // If we don't have a profile yet, stop and wait.
    if (!adminProfile?.role) return;

    try {
      setLoadingData(true);
      let query = supabase.from('profiles').select('id, username, balance, role, parent_id');

      // Matching your JSON exactly: "super_admin"
      if (adminProfile.role === 'super_admin') {
        query = query.eq('role', 'operator');
      } else if (adminProfile.role === 'operator') {
        query = query.eq('role', 'cashier').eq('parent_id', adminProfile.id);
      }

      const { data, error } = await query.order('username', { ascending: true });
      
      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error("Database Error:", err.message);
    } finally {
      setLoadingData(false);
    }
  };

  // Trigger fetch when adminProfile finally loads
  useEffect(() => {
    if (adminProfile) {
      fetchTargets();
    }
  }, [adminProfile]);

  const handleDispatch = async () => {
    const numAmount = parseFloat(amount);
    if (!selectedId || !numAmount || numAmount <= 0) return;

    setIsProcessing(true);
    const { error } = await supabase.rpc('transfer_credits', {
      sender_id: adminProfile.id,
      receiver_id: selectedId,
      amount_to_transfer: numAmount
    });

    if (error) {
      alert("Transfer Error: " + error.message);
    } else {
      setAmount('');
      setSelectedId('');
      fetchTargets(); // Refresh local list
      alert("Injection Successful");
    }
    setIsProcessing(false);
  };

  // 1. If the entire AdminContext is missing (Auth not ready)
  if (!adminProfile) {
    return (
      <AdminLayout>
        <div className="h-screen bg-[#0b0f1a] flex flex-col items-center justify-center space-y-4">
          <Zap className="text-[#10b981] animate-ping" size={40} />
          <p className="text-slate-500 font-black uppercase italic text-[10px] tracking-[0.3em]">Initializing Treasury Auth...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white font-sans">
        
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-[#10b981]" size={16} />
              <span className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">{adminProfile.role} MODE</span>
            </div>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Treasury</h1>
          </div>
          
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-black uppercase italic mb-1">Your Liquidity</p>
            <p className="text-4xl font-black text-[#10b981] italic tracking-tighter">
              KES {Number(adminProfile.balance || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-[#111926] p-10 rounded-[2.5rem] border border-white/5 space-y-8">
            <div className="space-y-3">
              <label className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest ml-2">Select Target Node</label>
              {loadingData ? (
                <div className="w-full bg-[#0b0f1a] p-5 rounded-2xl animate-pulse text-slate-700 text-xs font-bold uppercase italic">Syncing Nodes...</div>
              ) : (
                <select 
                  className="w-full bg-[#0b0f1a] border border-white/10 p-5 rounded-2xl text-sm font-bold uppercase outline-none focus:border-[#10b981] transition-all"
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                >
                  <option value="">-- Choose Recipient --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id} className="bg-[#111926]">
                      {acc.username.toUpperCase()} (Balance: {Number(acc.balance).toLocaleString()})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest ml-2">Injection Amount (KES)</label>
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
              className="w-full bg-[#10b981] hover:bg-white text-black font-black py-6 rounded-2xl transition-all disabled:opacity-20 uppercase italic tracking-widest shadow-xl shadow-[#10b981]/5"
            >
              {isProcessing ? 'AUTHORIZING...' : 'EXECUTE TRANSFER'}
            </button>
          </div>

          <div className="flex items-center justify-center border-2 border-dashed border-white/5 rounded-[2.5rem] p-10 text-center">
            {selectedId ? (
              <div className="space-y-6">
                <div className="bg-[#10b981]/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-[#10b981] border border-[#10b981]/20">
                  <UserCheck size={40} />
                </div>
                <div>
                  <h3 className="text-3xl font-black uppercase italic">{accounts.find(a => a.id === selectedId)?.username}</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Active {accounts.find(a => a.id === selectedId)?.role} Node</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-700 font-black uppercase italic tracking-[0.5em] text-[10px]">Awaiting Target Selection</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
