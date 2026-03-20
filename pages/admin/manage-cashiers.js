import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminDashboard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [initialFund, setInitialFund] = useState(0);

  const createCashier = async (e) => {
    e.preventDefault();
    
    // 1. Create the User in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) return alert(authError.message);

    // 2. Create the Profile with Balance
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{ 
        id: authData.user.id, 
        username, 
        balance: initialFund, 
        role: 'cashier' 
      }]);

    if (profileError) alert("Auth created, but profile failed.");
    else alert(`Cashier ${username} created with $${initialFund}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-10 font-sans">
      <h1 className="text-3xl font-black text-lucra-green mb-8 uppercase italic">Lucra Admin: Personnel</h1>
      
      <form onSubmit={createCashier} className="max-w-md bg-slate-900 p-8 rounded-3xl border border-gray-800 space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Create New Cashier</h2>
        
        <input 
          type="text" placeholder="Cashier Name/ID" 
          className="w-full bg-black border border-gray-800 p-3 rounded-xl"
          onChange={(e) => setUsername(e.target.value)} 
        />
        <input 
          type="email" placeholder="Email (for login)" 
          className="w-full bg-black border border-gray-800 p-3 rounded-xl"
          onChange={(e) => setEmail(e.target.value)} 
        />
        <input 
          type="password" placeholder="Password" 
          className="w-full bg-black border border-gray-800 p-3 rounded-xl"
          onChange={(e) => setPassword(e.target.value)} 
        />
        <div className="space-y-1">
          <label className="text-[10px] text-gray-500 font-bold ml-1">INITIAL FLOAT ($)</label>
          <input 
            type="number" placeholder="0.00" 
            className="w-full bg-black border border-gray-800 p-3 rounded-xl text-lucra-green font-bold"
            onChange={(e) => setInitialFund(e.target.value)} 
          />
        </div>

        <button className="w-full bg-lucra-green text-black font-black py-4 rounded-xl hover:bg-white transition-all">
          CREATE & FUND ACCOUNT
        </button>
      </form>
    </div>
  );
}
