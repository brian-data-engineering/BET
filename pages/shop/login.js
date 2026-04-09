import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { Store, Lock, Loader2, ShieldAlert } from 'lucide-react';

export default function ShopLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Check the role to ensure it's a Shop
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role === 'shop') {
        router.push('/shop/dashboard');
      } else {
        await supabase.auth.signOut();
        throw new Error("ACCESS DENIED: Unauthorized Role");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="w-full max-w-md space-y-8 bg-[#111926] p-12 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
        
        {/* Visual Brand Elements */}
        <div className="absolute top-0 right-0 p-8 opacity-10">
            <Store size={120} className="text-emerald-500" />
        </div>

        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                <Store className="text-emerald-500" size={32} />
            </div>
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">Lucra Retail</h1>
          <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.3em] italic">Branch Terminal Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Terminal ID</label>
            <input 
              required
              type="email"
              placeholder="branch@lucra.internal"
              className="w-full bg-[#0b0f1a] border border-white/10 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Access Key</label>
            <div className="relative">
                <input 
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-[#0b0f1a] border border-white/10 p-5 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500 text-xs font-black uppercase italic">
                <ShieldAlert size={16} /> {error}
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full bg-emerald-600 text-black font-black py-6 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all uppercase italic text-xs tracking-widest flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Authorize Terminal'}
          </button>
        </form>
      </div>
    </div>
  );
}
