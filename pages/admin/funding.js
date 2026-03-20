import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function Funding() {
  const [cashiers, setCashiers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'cashier').then(({ data }) => setCashiers(data || []));
  }, []);

  const addFunds = async () => {
    const cashier = cashiers.find(c => c.id === selectedId);
    const newBalance = parseFloat(cashier.balance) + parseFloat(amount);
    
    const { error } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', selectedId);
    if (!error) alert("Funds Dispatched!");
  };

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-white">
      <div className="max-w-md bg-slate-900 p-8 rounded-3xl border border-gray-800">
        <h1 className="text-xl font-black uppercase text-lucra-green mb-6">Dispatch Funds</h1>
        <select className="w-full bg-black p-4 rounded-xl border border-gray-800 mb-4" onChange={e => setSelectedId(e.target.value)}>
          <option>Select Cashier</option>
          {cashiers.map(c => <option key={c.id} value={c.id}>{c.username} (${c.balance})</option>)}
        </select>
        <input type="number" className="w-full bg-black p-4 rounded-xl border border-gray-800 mb-6" placeholder="Amount to add" onChange={e => setAmount(e.target.value)} />
        <button onClick={addFunds} className="w-full bg-lucra-green text-black font-black py-4 rounded-xl hover:bg-white transition-all">SEND MONEY</button>
      </div>
    </div>
  );
}
