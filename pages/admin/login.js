import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { Lock, ShieldCheck } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (profile?.role === 'admin') {
      router.push('/admin/dashboard');
    } else {
      await supabase.auth.signOut();
      alert("Unauthorized: Admin Access Only");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <form onSubmit={handleLogin} className="w-full max-w-md bg-slate-900 border border-gray-800 rounded-3xl p-10 shadow-2xl space-y-6">
        <div className="text-center">
          <ShieldCheck className="mx-auto text-lucra-green mb-2" size={40} />
          <h1 className="text-2xl font-black uppercase tracking-tighter">Lucra Admin</h1>
        </div>
        <input type="email" placeholder="Email" className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-lucra-green" onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full bg-black border border-gray-800 p-4 rounded-xl outline-none focus:border-lucra-green" onChange={e => setPassword(e.target.value)} />
        <button disabled={loading} className="w-full bg-lucra-green text-black font-black py-4 rounded-xl hover:bg-white transition-all">
          {loading ? 'AUTHENTICATING...' : 'LOGIN TO TERMINAL'}
        </button>
      </form>
    </div>
  );
}
