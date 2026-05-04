import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { Lock, User, ShieldAlert, Globe } from 'lucide-react';

export default function AgentLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // GHOST LOGIC: Mapping username to internal domain
      const internalEmail = `${username.toLowerCase().trim()}@lucra.internal`;

      // 1. Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email: internalEmail, 
        password 
      });

      if (authError) throw authError;

      // 2. STRICT ROLE GATE: Ensure this is an Agent node
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError || profile?.role !== 'agent') {
        await supabase.auth.signOut();
        throw new Error("UNAUTHORIZED: This terminal is for Agents only.");
      }

      // SUCCESS: Route to Agent specific dashboard
      router.push('/agent/dashboard');
    } catch (err) {
      setErrorMsg("PROTOCOL REJECTION: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Visual background hint: Blue tint for Agents vs Green for Operators */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md bg-[#111926] border border-white/5 rounded-[3rem] p-12 shadow-2xl relative z-10">
        
        <form onSubmit={handleLogin} className="space-y-8">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-lg shadow-blue-500/5">
              <Globe className="text-blue-500" size={40} />
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic text-white">Lucra<span className="text-blue-500">Hub</span></h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] italic">Middleman Agent Access</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-center gap-4">
              <ShieldAlert className="text-red-500 shrink-0" size={20} />
              <p className="text-[11px] font-black uppercase italic text-red-500 leading-tight tracking-wider">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2 italic tracking-widest">Agent Username</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="e.g. agent_kenya" 
                  className="w-full bg-[#0b0f1a] border border-white/10 p-5 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-white placeholder:text-white/10" 
                  onChange={e => setUsername(e.target.value)} 
                  required
                />
                <User className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-800" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] text-slate-500 font-black uppercase ml-2 italic tracking-widest">Access Passcode</label>
              <input 
                type="password" 
                placeholder="••••••••••••" 
                className="w-full bg-[#0b0f1a] border border-white/10 p-5 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-white placeholder:text-white/10" 
                onChange={e => setPassword(e.target.value)} 
                required
              />
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full bg-blue-600 text-white font-black py-6 rounded-2xl hover:bg-blue-500 transition-all active:scale-[0.98] shadow-xl shadow-blue-600/10 flex items-center justify-center gap-3 italic uppercase text-xs tracking-[0.2em]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Lock size={16} />
                Authorize Agent Session
              </>
            )}
          </button>
        </form>
      </div>

      <div className="absolute bottom-10 text-center w-full">
        <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.5em] italic">
          Network Node: Agent Level // Encrypted by Lucra Core
        </p>
      </div>
    </div>
  );
}
