import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { Lock, ShieldCheck } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Authenticate with Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      alert(authError.message);
      setLoading(false);
      return;
    }

    // 2. Check Role in Profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin') {
      router.push('/admin/dashboard');
    } else {
      // Not an admin? Sign them out immediately.
      await supabase.auth.signOut();
      alert("Access Denied: You do not have Administrative privileges.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-gray-800 rounded-3xl p-10 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-lucra-green/10 rounded-2xl flex items-center justify-center mb-4 border border-lucra-green/20">
            <ShieldCheck size={32} className="text-lucra-green" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Lucra Admin</h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Command Center Login</p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-black uppercase ml-1">Admin Email</label>
            <input 
              type="email" 
              required
              className="w-full bg-black border border-gray-800 p-4 rounded-xl focus:border-lucra-green outline-none transition-all"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-black uppercase ml-1">Secure Key</label>
            <input 
              type="password" 
              required
              className="w-full bg-black border border-gray-800 p-4 rounded-xl focus:border-lucra-green outline-none transition-all"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-lucra-green hover:bg-white text-black font-black py-4 rounded-xl mt-4 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Lock size={18} />
            {loading ? 'VERIFYING...' : 'AUTHORIZE ACCESS'}
          </button>
        </form>
      </div>
    </div>
  );
}
