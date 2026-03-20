import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import MatchCard from '../../components/cashier/MatchCard';
import BetSlip from '../../components/cashier/BetSlip';
import PrintableTicket from '../../components/cashier/PrintableTicket';
import { Search, Zap } from 'lucide-react';

export default function CashierDashboard() {
  const [matches, setMatches] = useState([]);
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState(100);
  const [bookingInput, setBookingInput] = useState('');
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);

  useEffect(() => {
    const fetchMatches = async () => {
      const { data } = await supabase.from('matches').select('*').eq('status', 'open');
      setMatches(data || []);
    };
    fetchMatches();
  }, []);

  // 1. Load Booking Code Logic
  const loadBookingCode = async () => {
    if (!bookingInput) return;
    setIsLoadingCode(true);
    
    const { data, error } = await supabase
      .from('booking_codes')
      .select('*')
      .eq('code', bookingInput.toUpperCase())
      .single();

    if (data) {
      // items in booking_codes matches the format expected by the cart
      setCart(data.selections); 
      setBookingInput('');
    } else {
      alert("Invalid or Expired Booking Code");
    }
    setIsLoadingCode(false);
  };

  const addToSlip = (match, selection, odd) => {
    const exists = cart.find(item => item.matchId === match.id);
    if (exists) return; 
    setCart([...cart, { 
      matchId: match.id, 
      matchName: `${match.home_team} vs ${match.away_team}`, 
      selection, 
      odds: odd 
    }]);
  };

  const removeFromSlip = (id) => setCart(cart.filter(item => item.matchId !== id));

  // 2. Final Print & Save Logic
  const handlePrint = async () => {
    if (cart.length === 0) return;

    const ticketId = 'LC-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const totalOdds = cart.reduce((acc, item) => acc * parseFloat(item.odds), 1).toFixed(2);
    const payout = (totalOdds * stake).toFixed(2);

    const ticketData = {
      id: ticketId,
      cashier_id: (await supabase.auth.getUser()).data.user.id,
      selections: cart,
      stake: parseFloat(stake),
      total_odds: parseFloat(totalOdds),
      payout: parseFloat(payout),
      status: 'pending'
    };

    const { error } = await supabase.from('tickets').insert([ticketData]);

    if (!error) {
      setCurrentTicket(ticketData);
      // Trigger browser print
      setTimeout(() => {
        window.print();
        setCart([]);
        setCurrentTicket(null);
      }, 500);
    } else {
      alert("Error saving ticket: " + error.message);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-screen overflow-hidden">
        
        {/* Main Feed */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter">Live Terminal</h1>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Select events or enter a booking code</p>
            </div>

            {/* Booking Code Search Bar */}
            <div className="flex gap-2 bg-slate-900 p-2 rounded-2xl border border-gray-800 w-72 shadow-xl">
              <input 
                placeholder="ENTER BOOKING CODE" 
                className="bg-transparent border-none outline-none text-xs font-black px-2 flex-1 tracking-widest"
                value={bookingInput}
                onChange={(e) => setBookingInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadBookingCode()}
              />
              <button 
                onClick={loadBookingCode}
                disabled={isLoadingCode}
                className="bg-lucra-green text-black p-2 rounded-xl hover:bg-white transition-all disabled:opacity-50"
              >
                {isLoadingCode ? <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" /> : <Search size={16} />}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {matches.map(m => (
              <MatchCard key={m.id} match={m} onSelect={addToSlip} />
            ))}
          </div>
        </div>

        {/* Sidebar Slip */}
        <div className="w-96 border-l border-gray-800 p-6 bg-slate-950/50 shadow-2xl">
          <BetSlip 
            cart={cart} 
            onRemove={removeFromSlip} 
            stake={stake} 
            setStake={setStake} 
            onPrint={handlePrint} 
          />
        </div>
      </div>

      {/* Invisible Printable Component */}
      <PrintableTicket ticket={currentTicket} />
      
    </CashierLayout>
  );
}
