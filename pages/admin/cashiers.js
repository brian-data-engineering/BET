import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
// 1. Import the Layout from your components folder
import AdminLayout from '../../components/admin/AdminLayout';

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
    const { data, error } = await supabase.auth.signUp({ 
      email: form.email, 
      password: form.password,
      options: {
        data: { username: form.username } // Optional: saves to auth metadata too
      }
    });
    
    if (error) return alert(error.message);

    await supabase.from('profiles').insert([
      { id: data.user.id, username: form.username, role: 'cashier', balance: 0 }
    ]);
    
    alert("Cashier Created Successfully!");
    setForm({ email: '', password: '', username: '' }); // Clear the form
    fetchCashiers();
  };

  return (
    // 2. Wrap everything in the AdminLayout
    <AdminLayout>
      <div className="p-8 space-y-8">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black uppercase text-white">Manage Cashiers</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Add or view terminal staff</p>
        </div>

        <form onSubmit={handleCreate} className="max-w-md bg-slate-900 p-6 rounded-2xl border border-gray-800 space-y-4 shadow-xl">
          <h2 className="font-black uppercase text-[10px] text-lucra-green tracking-[0.2em]">New Personnel</h2>
          <input value={form.username} className="w-full bg-black p-3 rounded-lg border border-gray-800 focus:border-lucra-green outline-none" placeholder="Username" onChange={e => setForm({...form, username: e.target.value})} />
          <input value={form.email} className="w-full bg-black p-3 rounded-lg border border-gray-800 focus:border-lucra-green outline-none" placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} />
          <input value={form.password} className="w-full bg-black p-3 rounded-lg border border-gray-800 focus:border-lucra-green outline-none" type="password" placeholder="Password" onChange={e => setForm({...form, password: e.target.value})} />
          <button className="w-full bg-lucra-green text-black font-black py-3 rounded-lg hover:bg-white transition-all active:scale-95">CREATE ACCOUNT</button>
        </form>

        <div className="bg-slate-900 rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/50 text-gray-500 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="p-4">Username</th>
                <th className="p-4 text-center">Current Float</th>
                <th className="p-4 text-right">Registration</th>
              </tr>
            </thead>
            <tbody>
              {cashiers.map(c => (
                <tr key={c.id} className="border-t border-gray-800 hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 font-bold text-gray-200">{c.username}</td>
                  <td className="p-4 text-center">
                    <span className="bg-lucra-green/10 text-lucra-green px-3 py-1 rounded-full font-mono font-bold">
                      ${parseFloat(c.balance || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="p-4 text-right text-gray-500 text-xs">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cashiers.length === 0 && (
            <div className="p-10 text-center text-gray-600 font-bold uppercase text-xs tracking-widest">
              No cashiers found
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
