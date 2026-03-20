import { Ticket, X, Trash2, Zap, CheckCircle2, Copy } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Betslip({ items = [], setItems }) {
  const [bookingCode, setBookingCode] = useState(null);
  const [isBooking, setIsBooking] = useState(false);

  const removeItem = (id) => setItems(items.filter(item => item.id !== id));
  const clearAll = () => {
    setItems([]);
    setBookingCode(null);
  };

  const totalOdds = items.reduce((acc, item) => acc * parseFloat(item.odds || 1), 1).toFixed(2);

  // 1. Function to save the bet and generate a code
  const handleBookBet = async () => {
    if (items.length === 0) return;
    setIsBooking(true);

    try {
      const { data, error } = await supabase
        .from('booked_bets')
        .insert([{ 
          items: items, 
          total_odds: parseFloat(totalOdds) 
        }])
        .select()
        .single();

      if (error) throw error;
      setBookingCode(data.booking_code);
    } catch (err) {
      console.error("Booking Error:", err.message);
      alert("Failed to book bet. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="bg-lucra-card border border-gray-800 rounded-2xl overflow-hidden flex flex-col h-fit sticky top-24 shadow-2xl">
      
      {/* HEADER */}
      <div className="bg-gray-800/30 p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket size={18} className="text-lucra-green" />
          <h4 className="font-black text-xs uppercase tracking-widest text-gray-100">Betslip</h4>
          {items.length > 0 && (
            <span className="bg-lucra-green text-black text-[10px] font-black px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
        {items.length > 0 && !bookingCode && (
          <button onClick={clearAll} className="text-gray-500 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="p-4">
        {items.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-gray-800">
              <Ticket size={24} className="text-gray-700" />
            </div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-tight">Empty Slip</p>
          </div>
        ) : bookingCode ? (
          /* 2. SUCCESS VIEW (The Booking Code) */
          <div className="py-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center mb-4">
              <CheckCircle2 size={48} className="text-lucra-green" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Bet Booked Successfully</h3>
            <p className="text-[10px] text-gray-500 mb-6 px-4">Present this code to the cashier to print your ticket</p>
            
            <div className="bg-slate-900 border-2 border-dashed border-lucra-green/30 p-6 rounded-2xl mb-6">
              <span className="text-4xl font-black tracking-[0.2em] text-white">
                {bookingCode}
              </span>
            </div>

            <button 
              onClick={clearAll}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-black py-3 rounded-xl text-xs uppercase transition-all"
            >
              Done / New Bet
            </button>
          </div>
        ) : (
          /* 3. ACTIVE SLIP VIEW */
          <div className="space-y-3">
            <div className="max-h-[350px] overflow-y-auto pr-1 custom-scrollbar space-y-2">
              {items.map((item) => (
                <div key={item.id} className="bg-slate-900/80 border border-gray-800 p-3 rounded-xl relative group">
                  <button onClick={() => removeItem(item.id)} className="absolute top-2 right-2 text-gray-600 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                  <span className="text-[9px] text-lucra-green font-black uppercase tracking-tighter">
                    {item.matchName}
                  </span>
                  <div className="flex justify-between items-end mt-1">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-200">{item.selection}</span>
                      <span className="text-[10px] text-gray-500 font-medium">Match Winner</span>
                    </div>
                    <span className="text-sm font-black text-white tabular-nums">
                      {parseFloat(item.odds).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 mt-4 border-t border-gray-800 space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-gray-500 uppercase">Total Odds</span>
                <span className="text-lg font-black text-lucra-green tabular-nums">{totalOdds}</span>
              </div>

              <button 
                onClick={handleBookBet}
                disabled={isBooking}
                className="w-full bg-lucra-green hover:bg-white text-black font-black py-4 rounded-xl mt-2 flex items-center justify-center gap-2 transition-all active:scale-95 group disabled:opacity-50"
              >
                <Zap size={18} className={`${isBooking ? 'animate-pulse' : 'fill-current group-hover:scale-110'}`} />
                {isBooking ? 'BOOKING...' : 'BOOK BET'}
              </button>

              <p className="text-[9px] text-center text-gray-600 uppercase font-bold tracking-widest mt-2">
                Lucra Booking System
              </p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
}
