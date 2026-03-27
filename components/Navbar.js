import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { 
  Search, Trophy, Activity, Rocket, Zap, Gift, Smartphone, X, Lock, Phone, LogOut 
} from 'lucide-react';

const Navbar = ({ onSearch }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('lucra_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('lucra_user');
      }
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const cleanPhone = `254${phoneNumber}`;

    try {
      // Strictly LOGIN LOGIC
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .eq('password', password)
        .single();

      if (error || !data) throw new Error("Invalid phone or password.");
      
      setUser(data);
      localStorage.setItem('lucra_user', JSON.stringify(data));
      setShowAuthModal(false);
      setPhoneNumber('');
      setPassword('');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('lucra_user');
  };

  return (
    <nav className="sticky top-0 z-50 shadow-xl">
      {/* --- LOGIN MODAL ONLY --- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#0b0f1a] border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#004d3d]">
              <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">
                Welcome Back
              </h2>
              <button onClick={() => setShowAuthModal(false)} className="text-white/50 hover:text-white">
                <X size={24}/>
              </button>
            </div>
            
            <form onSubmit={handleAuth} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                  <Phone size={10} /> Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#10b981]">+254</span>
                  <input 
                    type="tel" 
                    placeholder="712345678" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g,''))} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-14 pr-4 text-white font-bold outline-none focus:border-[#10b981]" 
                    required 
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                  <Lock size={10} /> Password
                </label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white font-bold outline-none focus:border-[#10b981]" 
                  required 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-[#10b981] hover:bg-[#0da371] text-white font-black py-4 rounded-xl shadow-lg uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Login to BrianBet"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- TOP BAR --- */}
      <div className="bg-[#0b0f1a] px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1 cursor-pointer">
          <div className="w-9 h-9 border-2 border-[#10b981] rounded-full flex items-center justify-center font-black text-[#10b981] text-lg">bb</div>
          <div className="flex flex-col leading-none">
            <span className="text-2xl font-black tracking-tighter text-white uppercase italic">
              brian<span className="text-[#f59e0b]">bet</span>
            </span>
            <span className="text-[10px] font-bold text-[#f59e0b] ml-auto">.co.ke</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Balance</span>
                <span className="text-sm font-black text-[#10b981]">
                  Ksh {Number(user.balance || 0).toFixed(2)}
                </span>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)} 
              className="bg-[#10b981] text-white text-sm font-bold px-6 py-2 rounded shadow-lg transition-all active:scale-95"
            >
              Login
            </button>
          )}
        </div>
      </div>

      {/* --- QUICK LINKS & SEARCH --- */}
      <div className="bg-[#003d30] px-4 py-2 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-6 text-[11px] font-bold text-slate-400 uppercase italic">
          <button className="hover:text-white flex items-center gap-1.5"><Activity size={14} /> Live Score</button>
          <Link href="/results" className="hover:text-white flex items-center gap-1.5 transition-colors">
            <Trophy size={14} /> Results
          </Link>
          <button className="hover:text-white flex items-center gap-1.5 text-[#f59e0b]"><Smartphone size={14} /> App</button>
        </div>
        
        <div onClick={() => onSearch && onSearch()} className="flex items-center gap-2 text-white/70 hover:text-white cursor-pointer group">
          <Search size={18} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-tight">Search</span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
