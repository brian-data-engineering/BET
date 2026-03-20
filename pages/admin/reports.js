import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminReports() {
  const [bets, setBets] = useState([]);

  useEffect(() => {
    supabase.from('booked_bets').select('*').order('created_at', { ascending: false }).then(({ data }) => setBets(data || []));
  }, []);

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-white">
      <h1 className="text-2xl font-black uppercase mb-8">Master Bet Log</h1>
      <div className="space-y-4">
        {bets.map(bet => (
          <div key={bet.id} className="bg-slate-900 border border-gray-800 p-6 rounded-2xl flex justify-between items-center">
            <div>
              <p className="text-lucra-green font-black text-lg">{bet.booking_code}</p>
              <p className="text-xs text-gray-500">{new Date(bet.created_at).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm">{bet.items.length} Selections</p>
              <p className="text-xs text-gray-400">Total Odds: {parseFloat(bet.total_odds).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
