import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { Wallet, Send, ArrowUpRight, UserCheck, ShieldCheck } from 'lucide-react';

export default function Funding() {
  const [cashiers, setCashiers] = useState([]);
  const [adminProfile, setAdminProfile] = useState(null); // Track your 1T balance
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Fetch Admin Data & Cashiers
  const fetchData = async () => {
    // Get Current Admin (Assuming you are logged in)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setAdminProfile(profile);
    }

    // Get Cashiers to fund
    const { data: accounts } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['operator', 'cashier']) // Admin can fund both
      .order('username', { ascending: true });
    setCashiers(accounts || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDispatch = async () => {
    const numAmount = parseFloat(amount);
    if (!selectedId || !numAmount || numAmount <= 0) {
      alert("Please select an account and enter a valid amount.");
      return;
    }

    if (numAmount > adminProfile.balance) {
      alert("Insufficient Admin Balance!");
      return;
    }

    setIsProcessing(true);
    
    // 2. Use RPC for Atomic Transfer (Deduct Admin, Add Recipient)
    const { error } = await supabase.rpc('transfer_credits', {
      sender_id: adminProfile.id,
      receiver_id: selectedId,
      amount_to_transfer: numAmount
    });

    if (error) {
      alert("Transaction failed: " + error.message);
    } else {
      alert(`Successfully dispatched KES ${numAmount.toLocaleString()} to recipient.`);
      setAmount('');
      fetchData(); // Refresh both Admin and Cashier balances
    }
    setIsProcessing(false);
  };

  const selectedRecipient = cashiers.find(c => c.id === selectedId);

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* HEADER & ADMIN BALANCE */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
              <ShieldCheck className="text-[#10b981]" size={36} />
              Master Funding
            </h1>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-1">Lucra Treasury Control</p>
          </div>

          <div className="bg-[#1c2636] border border-white/5 p-6 rounded-3xl min-w-[300px] shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet size={80} />
             </div>
             <p className="text-[10px] text-[#10b981] font-black uppercase italic mb-1">Your Treasury Balance</p>
             <h2 className="text-3xl font-black text-white italic tracking-tighter">
               KES {adminProfile?.balance?.toLocaleString() || '0.00'}
             </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Dispatch Form */}
          <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/5 shadow-2xl space-y-6 backdrop-blur-md">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase ml-1">Target Account</label>
              <select 
                className="w-full bg-black border border-white/5 p-4 rounded-xl text-white outline-none focus:border-[#10b981] transition-all appearance-none cursor-pointer"
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
              >
                <option value="">Select an operator or cashier...</option>
                {cashiers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.username} ({c.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase ml-1">Dispatch Amount (KES)</label>
              <div className="relative">
                <input 
                  type="number" 
                  className="w-full bg-black border border-white/5 p-5 pl-14 rounded-xl text-[#f59e0b] font-black text-2xl outline-none focus:border-[#10b981] transition-all"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 font-black text-sm">KES</span>
              </div>
            </div>

            <button 
              onClick={handleDispatch}
              disabled={isProcessing || !amount}
              className="w-full bg-[#10b981] hover:bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-20 shadow-xl shadow-[#10b981]/10 uppercase italic text-sm tracking-widest"
            >
              <Send size={20} className={isProcessing ? 'animate-pulse' : ''} />
              {isProcessing ? 'AUTHORIZING...' : 'EXECUTE FUNDING'}
            </button>
          </div>

          {/* Preview Panel */}
          <div className="flex flex-col justify-center">
            {selectedId ? (
              <div className="bg-gradient-to-br from-[#10b981]/10 to-transparent p-[1px] rounded-3xl border border-white/5 animate-in fade-in zoom-in duration-300">
                <div className="bg-slate-950 p-10 rounded-[23px] space-y-6">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-[#10b981]/20 rounded-2xl flex items-center justify-center text-[#10b981] border border-[#10b981]/20">
                      <UserCheck size={32} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-black uppercase">Recipient Details</p>
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                        {selectedRecipient?.username}
                      </h3>
                      <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-gray-400 font-bold uppercase">
                        {selectedRecipient?.role}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <div className="flex justify-between">
                       <span className="text-[10px] font-black uppercase text-gray-500 italic">Current Balance</span>
                       <span className="text-white font-bold">KES {parseFloat(selectedRecipient?.balance || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-[#10b981] font-black uppercase italic">New Total after Transfer</p>
                        <p className="text-4xl font-black text-white tracking-tighter italic">
                          KES {(parseFloat(selectedRecipient?.balance || 0) + (parseFloat(amount) || 0)).toLocaleString()}
                        </p>
                      </div>
                      <ArrowUpRight className="text-[#10b981] mb-2" size={32} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center p-12 opacity-30">
                <Wallet size={64} className="text-gray-500 mb-4" />
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em]">Awaiting Selection</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
