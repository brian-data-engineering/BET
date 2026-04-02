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

  const fetchTargets = async () => {
    // CRITICAL: We fetch everything first to break the "Blank" cycle
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, balance, role')
        .neq('id', adminProfile?.id); // Just get everyone except the logged-in admin

      if (error) throw error;
      console.log("Targets Found:", data); // Check your F12 console for this!
      setAccounts(data || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  useEffect(() => {
    if (adminProfile?.id) {
      fetchTargets();
    }
  }, [adminProfile]);

  const handleDispatch = async () => {
    if (!selectedId || !amount || parseFloat(amount) <= 0) return;
    setIsProcessing(true);
    
    // This calls the SQL function you created in Supabase
    const { error } = await supabase.rpc('transfer_credits', {
      sender_id: adminProfile.id,
      receiver_id: selectedId,
      amount_to_transfer: parseFloat(amount)
    });

    if (error) {
      alert("Transfer Failed: " + error.message);
    } else {
      alert("Transfer Successful!");
      setAmount('');
      fetchTargets(); // Refresh list to see new balances
    }
    setIsProcessing(false);
  };

  if (!adminProfile) return <div className="bg-[#0b0f1a] h-screen" />;

  return (
    <AdminLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10 bg-[#0b0f1a] min-h-screen text-white">
        
        <div className="flex justify-between items-center">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter">Treasury</h1>
          <div className="bg-[#111926] p-6 rounded-2xl border border-[#10b981]/20">
            <p className="text-[10px] text-[#10b981] font-black uppercase tracking-widest">Your Balance</p>
            <p className="text-3xl font-black italic">KES {adminProfile?.balance?.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[#111926] p-10 rounded-[2rem] border border-white/5 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Select Recipient</label>
              <select 
                className="w-full bg-[#0b0f1a] border border-white/10 p-5 rounded-xl text-white font-bold"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">-- Choose Account --</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.username} ({acc.role}) - KES {acc.balance?.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Amount (KES)</label>
              <input 
                type="number" 
                className="w-full bg-[#0b0f1a] border border-white/10 p-5 rounded-xl text-[#10b981] text-2xl font-black"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <button 
              onClick={handleDispatch}
              disabled={isProcessing || !selectedId || !amount}
              className="w-full bg-[#10b981] text-black font-black py-5 rounded-xl uppercase italic tracking-widest disabled:opacity-20"
            >
              {isProcessing ? "Processing..." : "Confirm Transfer"}
            </button>
          </div>

          <div className="border-2 border-dashed border-white/5 rounded-[2rem] flex items-center justify-center">
            {selectedId ? (
              <div className="text-center p-10 space-y-4">
                <UserCheck size={48} className="mx-auto text-[#10b981]" />
                <h2 className="text-2xl font-black uppercase italic">Ready to Fund</h2>
                <p className="text-slate-400 text-sm">Recipient ID: {selectedId}</p>
              </div>
            ) : (
              <p className="text-slate-600 font-black uppercase italic tracking-widest">No Target Selected</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
