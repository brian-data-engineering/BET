import { Ticket, X, Trash2, Zap, CheckCircle2, Copy, Smartphone, AlertTriangle, Lock, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Betslip({ items = [], setItems }) {
  const [bookingCode, setBookingCode] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stake, setStake] = useState(100);
  const [currentTime, setCurrentTime] = useState(new Date());

  const MAX_GAMES = 20;

  // Sync clock every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // --- ROBUST TIME PARSING ---
  const getParsedDate = (dateString) => {
    if (!dateString) return null;
    try {
      // 1. Clean string (Remove Z and +00 offset)
      const clean = dateString.replace('Z', '').split('+')[0].trim();
      // 2. Split parts manually to avoid browser parser bugs
      const [datePart, timePart] = clean.split(/[T ]/);
      if (!datePart || !timePart) return new Date(dateString);

      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds] = timePart.split(':').map(Number);
      
      // Construct local date (Month is 0-indexed)
      return new Date(year, month - 1, day, hours, minutes, seconds || 0);
    } catch (e) {
      return null;
    }
  };

  const isExpired = (startTime) => {
    const matchDate = getParsedDate(startTime);
    return matchDate ? currentTime >= matchDate : false;
  };

  const expiredGames = items.filter(item => isExpired(item.startTime));
  const hasExpired = expiredGames.length > 0;

  const removeItem = (id) => setItems(items.filter(item => item.id !== id));
  
  const removeExpired = () => {
    setItems(items.filter(item => !isExpired(item.startTime)));
  };

  const clearAll = () => {
    setItems([]);
    setBookingCode(null);
    setCopied(false);
  };

  const totalOdds = items.reduce((acc, item) => acc * parseFloat(item.odds || 1), 1).toFixed(2);
  const potentialWinnings = (totalOdds * Number(stake)).toFixed(2);

  const handleBookBet = async () => {
    if (items.length === 0 || items.length > MAX_GAMES || hasExpired) return;
    setIsBooking(true);

    try {
      // 1. CLEANUP: Optional - Purge old codes via RPC or simple delete
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      await supabase.from('betsnow').delete().lt('created_at', tenMinsAgo);

      let isUnique = false;
      let finalCode = '';
      let attempts = 0;

      // 2. UNIQUE CODE GENERATOR
      while (!isUnique && attempts < 10) {
        finalCode = Math.floor(1000 + Math.random() * 9000).toString();
        const { data } = await supabase
          .from('betsnow')
          .select('booking_code')
          .eq('booking_code', finalCode)
          .maybeSingle();

        if (!data) isUnique = true;
        attempts++;
      }

      // 3. INSERT
      const { error } = await supabase
        .from('betsnow')
        .insert([{ 
          booking_code: finalCode,
          selections: items, // JSONB column
          status: 'pending'
        }]);

      if (error) throw error;
      setBookingCode(finalCode);

    } catch (err) {
      console.error("Booking Error:", err.message);
      alert("System Busy: Please try again in a moment.");
    } finally {
      setIsBooking(false);
    }
  };

  const copyToClipboard = () => {
    if (!bookingCode) return;
    navigator.clipboard.writeText(bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#111926] border border-white/5 rounded-2xl overflow-hidden flex flex-col max-h-[85vh] sticky top-24 shadow-2xl w-full">
      
      {/* HEADER */}
      <div className="bg-[#0b0f1a] p-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Ticket size={16} className="text-[#10b981]" />
          <h4 className="font-black text-xs uppercase italic tracking-tighter text-white">
            Betslip ({items.length}/{MAX_GAMES})
          </h4>
        </div>
        {items.length > 0 && !bookingCode && (
          <div className="flex gap-3">
             {hasExpired && (
                <button onClick={removeExpired} className="text-red-500 hover:text-red-400 transition-colors flex items-center gap-1">
                   <RefreshCw size={14} className="animate-spin-slow" />
                   <span className="text-[9px] font-black uppercase">Clear Started</span>
                </button>
             )}
            <button onClick={clearAll} className="text-slate-500 hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {items.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center opacity-30">
            <Ticket size={40} className="text-slate-500 mb-2" />
            <p className="text-slate-500 text-[10px] font-black uppercase italic tracking-widest">Your slip is empty</p>
          </div>
        ) : bookingCode ? (
          <div className="py-4 text-center animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 bg-[#10b981]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#10b981]/20">
              <CheckCircle2 size={28} className="text-[#10b981]" />
            </div>
            <h3 className="text-sm font-black uppercase italic tracking-tighter text-white mb-1">Booking Successful</h3>
            <p className="text-[10px] text-red-500 mb-6 uppercase font-black italic animate-pulse">Valid for 10 minutes</p>
            
            <div onClick={copyToClipboard} className="bg-[#0b0f1a] border-2 border-dashed border-[#10b981]/40 p-6 rounded-xl mb-6 cursor-pointer hover:border-[#10b981] transition-all relative group">
              <span className="text-5xl font-black tracking-[10px] text-[#f59e0b] ml-[10px]">{bookingCode}</span>
              <div className="absolute top-2 right-2 opacity-30 group-hover:opacity-100 transition-opacity text-white"><Copy size={14} /></div>
              {copied && <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#10b981] text-white text-[9px] px-2 py-1 rounded font-black">COPIED!</span>}
            </div>

            <button onClick={clearAll} className="w-full bg-[#1c2636] text-white font-black py-3 rounded-lg text-[10px] uppercase italic hover:bg-slate-700 transition-all">Start New Slip</button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const started = isExpired(item.startTime);
              return (
                <div key={item.id} className={`bg-[#1c2636] border p-3 rounded-xl relative group transition-all ${started ? 'border-red-500/50 bg-red-500/5' : 'border-white/5'}`}>
                  <button onClick={() => removeItem(item.id)} className="absolute top-2 right-2 text-slate-600 hover:text-white transition-colors z-20">
                    <X size={14} />
                  </
