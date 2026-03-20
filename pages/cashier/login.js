import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { Ticket, Lock, AlertCircle } from 'lucide-react';

export default function CashierLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // 1. Authenticate with Supabase
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (authError) {
      setErrorMsg(authError.message);
      setLoading(false);
      return;
    }

    // 2. Identify Role from Metadata Badge
    const role = user?.app_metadata?.role;

    if (role === 'cashier') {
      router.push('/cashier/dashboard');
    } else if (role === 'admin') {
      // Optional: Allow admins to access cashier terminal too
      router.push('/cashier/dashboard');
    } else {
      await supabase.auth.signOut();
      setErrorMsg("Access Denied: You do not have a Cashier Access Key.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-gray-800 rounded-[2rem] p-8 shadow-xl">
        
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-lucra-green/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-lucra-green/30">
            <Ticket className="text-lucra-green" size={28} />
          </div>
          <h1 className="text-xl font-bold uppercase tracking-tight">Lucra Cashier</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Point of Sale Terminal</p>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={18} />
            <p className="text-xs font-bold text-red-400">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Cashier ID (Email)</label>
            <input 
              type="email" 
              placeholder="cashier@lucra.bet" 
              className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-lucra-green transition-all text-sm" 
              onChange={e => setEmail(e.target.value)} 
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Access Key</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-lucra-green transition-all text-sm" 
              onChange={e => setPassword(e.target.value)} 
              required
            />
          </div>

          <button 
            disabled={loading} 
            className="w-full bg-lucra-green text-black font-black py-4 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Lock size={18} />
                OPEN TERMINAL
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
