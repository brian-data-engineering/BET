import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Search, Trophy, Activity, Rocket, Zap, Gift, Smartphone, X, Lock, Phone, UserCircle, LogOut 
} from 'lucide-react';

const Navbar = ({ onSearch }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [modalMode, setModalMode] = useState('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // User Session State
  const [user, setUser] = useState(null);

  // Check for logged in user on load
  useEffect(() => {
    const savedUser = localStorage.getItem('lucra_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const cleanPhone = `254${phoneNumber}`;

    try {
      if (modalMode === 'register') {
        const { data, error } = await supabase
          .from('profiles')
          .insert([{ phone: cleanPhone, password: password, balance: 0 }])
          .select()
          .single();

        if (error) throw new Error("Number already registered or error occurred.");
        
        loginUser(data);
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', cleanPhone)
          .eq('password', password)
          .single();

        if (error || !data) throw new Error("Invalid phone or password.");
        
        loginUser(data);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loginUser = (userData) => {
    setUser(userData);
    localStorage.setItem('lucra_user', JSON.stringify(userData));
    setShowAuthModal(false);
    setPhoneNumber('');
    setPassword('');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('lucra_user');
  };

  return (
    <nav className="sticky top-0 z-50 shadow-xl">
      {/* --- AUTH MODAL --- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#0b0f1a] border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#004d3d]">
              <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">
                {modalMode === 'login' ? 'Login' : 'Join BrianBet'}
              </h2>
              <button onClick={() => setShowAuthModal(false)} className="text-white/50 hover:text-white transition-colors"><X size={24}/></button>
            </div>
            <form onSubmit={handleAuth} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Phone size={10} /> Mobile Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#10b981]">+254</span>
                  <input type="tel" placeholder="712345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g,''))} className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-14 pr-4 text-white font-bold outline-none focus:border-[#10b981]" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Lock size={10} /> Password</label>
                <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white font-bold outline-none focus:border-[#10b981]" required />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#10b981] hover:bg-[#0da371] text-white font-black py-4 rounded-xl shadow-lg uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50">
                {loading ? "Checking..." : modalMode === 'login' ? "Login" : "Register"}
              </button>
              <button type="button" onClick={() => setModalMode(modalMode === 'login' ? 'register' : 'login')} className="w-full text-xs font-bold text-slate-400 hover:text-[#10b981] transition-colors uppercase">
                {modalMode === 'login' ? "Create a new account" : "Back to Login"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- TOP BAR --- */}
      <div className="bg-[#0b0f1a] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1 cursor-pointer">
          <div className="w-9 h-9 border-2 border-[#10b981] rounded-full flex items-center justify-center font-black text-[#10b981] text-lg">bb</div>
          <div className="flex flex-col leading-none">
            <span className="text-2xl font-black tracking-tighter text-white uppercase italic">brian<span className="text-[#f59e0b]">bet</span></span>
            <span className="text-[10px] font-bold text-[#f59e0b] ml-auto">.co.ke</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Balance</span>
                <span className="text-sm font-black text-[#10b981]">Ksh {user.balance.toFixed(2)}</span>
              </div>
              <div className="h-8 w-[1px] bg-white/10" />
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => {setModalMode('login'); setShowAuthModal(true);}} className="text-sm font-bold text-[#10b981] hover:text-white px-2 transition-colors">Login</button>
              <button onClick={() => {setModalMode('register'); setShowAuthModal(true);}} className="bg-[#10b981] hover:bg-[#059669] text-white text-sm font-bold px-5 py-2 rounded shadow-lg transition-all active:scale-95">Register</button>
            </>
          )}
        </div>
      </div>

      {/* --- FEATURE BAR --- */}
      <div className="bg-[#004d3d] border-t border-white/5 px-4 overflow-x-auto no-scrollbar">
        <div className="max-w-[1440px] mx-auto flex items-center gap-6 py-2.5 whitespace-nowrap">
          <NavItem icon={<Trophy size={16} />} label="Sports" active />
          <NavItem icon={<Activity size={16} />} label="Live" />
          <NavItem icon={<Rocket size={16} />} label="Aviator" isNew />
          <NavItem icon={<Zap size={16} />} label="Crash" />
          <NavItem icon={<Gift size={16} />} label="Promos" />
          <NavItem icon={<Smartphone size={16} />} label="Virtuals" />
        </div>
      </div>

      {/* --- QUICK LINKS --- */}
      <div className="bg-[#003d30] px-4 py-2 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-6 text-[11px] font-bold text-slate-400 uppercase italic">
          <button className="hover:text-white flex items-center gap-1.5"><Activity size={14} /> Live Score</button>
          <button className="hover:text-white flex items-center gap-1.5"><Trophy size={14} /> Results</button>
          <button className="hover:text-white flex items-center gap-1.5 text-[#f59e0b]"><Smartphone size={14} /> App</button>
        </div>
        <div onClick={() => onSearch()} className="flex items-center gap-2 text-white/70 hover:text-white cursor-pointer group">
          <Search size={18} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-tight">Search</span>
        </div>
      </div>
    </nav>
  );
};

const NavItem = ({ icon, label, active = false, isNew = false }) => (
  <button className={`flex items-center gap-1.5 px-1 py-1 transition-all relative ${active ? 'text-white border-b-2 border-white' : 'text-white/70 hover:text-white'}`}>
    {icon}
    <span className="text-xs font-black uppercase tracking-tight">{label}</span>
    {isNew && <span className="bg-red-600 text-[8px] font-black px-1 rounded absolute -top-1 -right-4 animate-bounce shadow-lg">NEW</span>}
  </button>
);

export default Navbar;
