import { Ticket, X, Trash2, Zap, CheckCircle2, Copy } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Betslip({ items = [], setItems }) {
  const [bookingCode, setBookingCode] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [copied, setCopied] = useState(false);

  const removeItem = (id) => setItems(items.filter(item => item.id !== id));
  const clearAll = () => {
    setItems([]);
    setBookingCode(null);
    setCopied(false);
  };

  const totalOdds = items.reduce((acc, item) => acc * parseFloat(item.odds || 1), 1).toFixed(2);

  // 1. Function to save the bet to 'booking_codes'
  const handleBookBet = async () => {
    if (items.length === 0) return;
    setIsBooking(true);

    try {
      // Generate a unique 6-character alphanumeric code
      const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { error } = await supabase
        .from('booking_codes')
        .insert([{ 
          code: shortCode,
          selections: items, // Passing the array of items
          total_odds: parseFloat(totalOdds) 
        }]);

      if (error) throw error;
      
      setBookingCode(shortCode);
    } catch (err) {
      console.error("Booking Error:", err.message);
      alert("System Busy: Could not generate booking code. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-lucra-card border border-gray-800 rounded-[2rem] overflow-hidden flex flex-col h-fit sticky top-24 shadow-2xl">
      
      {/* HEADER */}
      <div className="bg-gray-800/20 p-5 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-lucra-green/10 rounded-lg flex items-center justify-center">
            <Ticket size={16} className="text-lucra-green" />
          </div>
          <h4 className="font-black text-xs uppercase tracking-[0.2em] text-gray-100">Betslip</h4>
          {items.length > 0 && !bookingCode && (
            <span className="bg-lucra-green text-black text-[10px] font-black px-2 py-0.5 rounded-md">
              {items.length}
            </span>
          )}
        </div>
        {items.length > 0 && !bookingCode && (
          <button onClick={clearAll} className="text-gray-600 hover:text-red-400 transition-colors p-1">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="p-5">
        {items.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <Ticket size={32} className="text-gray-800 mb-3" />
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Slip is Empty</p>
          </div>
        ) : bookingCode ? (
          /* SUCCESS VIEW */
          <div className="py-4 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-lucra-green/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-lucra-green/20">
              <CheckCircle2 size={32} className="text-lucra-green" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white mb-1">Bet Booked</h3>
            <p className="text-[10px] text-gray-500 mb-6 uppercase font-bold tracking-tight">Show this at the Lucra Terminal</p>
            
            <div 
              onClick={copyToClipboard}
              className="bg-black border-2 border-dashed border-lucra-green/40 p-6 rounded-3xl mb-6 cursor-pointer hover:border-lucra-green transition-all relative group"
            >
              <span className="text-4xl font-black tracking-[0.2em] text-white">
                {bookingCode}
              </span>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Copy size={14} className="text-lucra-green" />
              </div>
              {copied && <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-lucra-green text-black text-[10px] px-2 py-1 rounded font-black">COPIED!</span>}
            </div>

            <button 
              onClick={clearAll}
              className="w-full bg-slate-800 text-gray-300 font-black py-4 rounded-2xl text-[10px] uppercase hover:bg-white hover:text-black transition-all"
            >
              Start New Bet
            </button>
          </div>
        ) : (
          /* ACTIVE SLIP VIEW */
          <div className="space-y-4">
            <div className="max-h-[380px] overflow-y-auto pr-1 custom-scrollbar space-y-2">
              {items.map((item) => (
                <div key={item.id} className="bg-slate-900/40 border border-gray-800/60 p-4 rounded-2xl relative group hover:border-gray-700 transition-all">
                  <button onClick={() => removeItem(item.id)} className="absolute top-3 right-3 text-gray-700 hover:text-red-400 transition-colors">
                    <X size={14} />
                  </button>
                  <span className="text-[9px] text-lucra-green font-black uppercase tracking-widest">
                    {item.matchName}
                  </span>
                  <div className="flex justify-between items-end mt-1">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-100 tracking-tight">{item.selection}</span>
                      <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">Match Result</span>
                    </div>
                    <span className="text-sm font-black text-white tabular-nums">
                      {parseFloat(item.odds).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-800 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Odds</span>
                <span className="text-2xl font-black text-lucra-green tabular-nums tracking-tighter italic">{totalOdds}</span>
              </div>

              <button 
                onClick={handleBookBet}
                disabled={isBooking}
                className="w-full bg-lucra-green text-black font-black py-5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.97] hover:bg-white disabled:opacity-50"
              >
                <Zap size={18} className={`${isBooking ? 'animate-pulse' : 'fill-current'}`} />
                <span className="uppercase tracking-tighter italic text-sm">{isBooking ? 'GENERATING...' : 'BOOK BET CODE'}</span>
              </button>

              <div className="flex items-center justify-center gap-2 opacity-20">
                <div className="h-[1px] flex-1 bg-gray-500"></div>
                <span className="text-[8px] font-black uppercase text-gray-500 tracking-[0.3em]">Lucra Terminal System</span>
                <div className="h-[1px] flex-1 bg-gray-500"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
}
