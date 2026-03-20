import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { Wallet, Send, ArrowUpRight, UserCheck } from 'lucide-react';

export default function Funding() {
  const [cashiers, setCashiers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch cashiers on load
  const fetchCashiers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'cashier')
      .order('username', { ascending: true });
    setCashiers(data || []);
  };

  useEffect(() => {
    fetchCashiers();
  }, []);

  const handleDispatch = async () => {
    if (!selectedId || !amount || parseFloat(amount) <= 0) {
      alert("Please select a cashier and enter a valid amount.");
      return;
    }

    setIsProcessing(true);
    const cashier = cashiers.find(c => c.id === selectedId);
    const newBalance = parseFloat(cashier.balance || 0) + parseFloat(amount);
    
    const { error } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', selectedId);

    if (error) {
      alert("Transaction failed: " + error.message);
    } else {
      alert(`Successfully dispatched $${amount} to ${cashier.username}`);
      setAmount('');
      fetchCashiers(); // Refresh list to see new balances
    }
    setIsProcessing(false);
  };

  const selectedCashier = cashiers.find(c => c.id === selectedId);

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
            <Wallet className="text-lucra-green" size={32} />
            Funding Portal
          </h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Manage Cashier Float & Liquidity</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Dispatch Form */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-gray-800 shadow-2xl space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase ml-1">Target Cashier</label>
              <select 
                className="w-full bg-black border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-lucra-green transition-all appearance-none"
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
              >
                <option value="">Select an account...</option>
                {cashiers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.username} (Balance: ${parseFloat(c.balance).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase ml-1">Funding Amount ($)</label>
              <div className="relative">
                <input 
                  type="number" 
                  className="w-full bg-black border border-gray-800 p-4 pl-10 rounded-xl text-lucra-green font-black text-xl outline-none focus:border-lucra-green transition-all"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold">$</span>
              </div>
            </div>

            <button 
              onClick={handleDispatch}
              disabled={isProcessing}
              className="w-full bg-lucra-green hover:bg-white text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-lucra-green/10"
            >
              <Send size={18} className={isProcessing ? 'animate-ping' : ''} />
              {isProcessing ? 'DISPATCHING...' : 'CONFIRM FUNDING'}
            </button>
          </div>

          {/* Transfer Preview Card */}
          <div className="flex flex-col justify-center">
            {selectedId ? (
              <div className="bg-gradient-to-br from-lucra-green/20 to-transparent p-1 rounded-3xl border border-lucra-green/20 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="bg-slate-950 p-8 rounded-[22px] space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-lucra-green rounded-2xl flex items-center justify-center text-black">
                      <UserCheck size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-black uppercase">Recipient</p>
                      <h3 className="text-xl font-black text-white uppercase italic">{selectedCashier?.username}</h3>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-800 pt-4 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-gray-500 font-black uppercase">New Projected Balance</p>
                      <p className="text-2xl font-black text-white">
                        ${(parseFloat(selectedCashier?.balance || 0) + (parseFloat(amount) || 0)).toFixed(2)}
                      </p>
                    </div>
                    <ArrowUpRight className="text-lucra-green mb-1" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center text-center p-8">
                <Wallet size={48} className="text-gray-800 mb-4" />
                <p className="text-gray-600 text-xs font-black uppercase tracking-widest">Select a cashier to preview transaction</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
