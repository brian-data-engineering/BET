import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ManageCashiers() {
  const [cashiers, setCashiers] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', username: '' });

  const fetchCashiers = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'cashier');
    setCashiers(data || []);
  };

  useEffect(() => { fetchCashiers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password });
    if (error) return alert(error.message);

    await supabase.from('profiles').insert([{ id: data.user.id, username: form.username, role: 'cashier' }]);
    alert("Cashier Created!");
    fetchCashiers();
  };

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-white space-y-8">
      <form onSubmit={handleCreate} className="max-w-md bg-slate-900 p-6 rounded-2xl border border-gray-800 space-y-4">
        <h2 className="font-black uppercase text-sm text-lucra-green">Add New Cashier</h2>
        <input className="w-full bg-black p-3 rounded-lg border border-gray-800" placeholder="Username" onChange={e => setForm({...form, username: e.target.value})} />
        <input className="w-full bg-black p-3 rounded-lg border border-gray-800" placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} />
        <input className="w-full bg-black p-3 rounded-lg border border-gray-800" type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} />
        <button className="w-full bg-lucra-green text-black font-black py-3 rounded-lg">CREATE ACCOUNT</button>
      </form>

      <div className="bg-slate-900 rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-black text-gray-500 uppercase text-[10px]">
            <tr><th className="p-4">Username</th><th className="p-4">Balance</th><th className="p-4">Created</th></tr>
          </thead>
          <tbody>
            {cashiers.map(c => (
              <tr key={c.id} className="border-t border-gray-800">
                <td className="p-4 font-bold">{c.username}</td>
                <td className="p-4 text-lucra-green font-mono">${c.balance.toFixed(2)}</td>
                <td className="p-4 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
