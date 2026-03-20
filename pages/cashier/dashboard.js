import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import MatchCard from '../../components/cashier/MatchCard';
import BetSlip from '../../components/cashier/BetSlip';

export default function CashierDashboard() {
  const [matches, setMatches] = useState([]);
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState(100);

  useEffect(() => {
    const fetchMatches = async () => {
      const { data } = await supabase.from('matches').select('*').eq('status', 'open');
      setMatches(data || []);
    };
    fetchMatches();
  }, []);

  const addToSlip = (match, selection, odd) => {
    const exists = cart.find(item => item.matchId === match.id);
    if (exists) return; 
    setCart([...cart, { matchId: match.id, home: match.home_team, away: match.away_team, selection, odd }]);
  };

  const removeFromSlip = (id) => setCart(cart.filter(item => item.matchId !== id));

  const handlePrint = async () => {
    // Logic for saving ticket to Supabase goes here
    alert("Ticket Printed Successfully!");
    setCart([]);
  };

  return (
    <CashierLayout>
      <div className="flex h-screen overflow-hidden">
        {/* Main Feed */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className="mb-8">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Live Terminal</h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Select events to build a slip</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {matches.map(m => (
              <MatchCard key={m.id} match={m} onSelect={addToSlip} />
            ))}
          </div>
        </div>

        {/* Sidebar Slip */}
        <div className="w-96 border-l border-gray-800 p-6 bg-slate-950/50">
          <BetSlip 
            cart={cart} 
            onRemove={removeFromSlip} 
            stake={stake} 
            setStake={setStake} 
            onPrint={handlePrint} 
          />
        </div>
      </div>
    </CashierLayout>
  );
}
