import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import Betslip from '../../components/cashier/BetSlip'; 
import PrintableTicket from '../../components/cashier/PrintableTicket'; 
import { Loader2, Search } from 'lucide-react';

export default function CashierDashboard() {
  const [cart, setCart] = useState([]);
  const [stake, setStake] = useState("");
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTicket, setCurrentTicket] = useState(null);
  const [userProfile, setUserProfile] = useState(null); 
  const [allProfiles, setAllProfiles] = useState([]); 
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const initTerminal = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (profile) setUserProfile(profile);
    const { data: profiles } = await supabase.from('profiles').select('id, username, shop_name');
    if (profiles) setAllProfiles(profiles);
  }, []);

  useEffect(() => { initTerminal(); }, [initTerminal]);

  const handlePrint = () => {
    setTimeout(() => { window.print(); }, 800);
  };

  const handleLoadTicket = async () => {
    if (!searchQuery || isSearching) return;
    setIsSearching(true);
    const input = searchQuery.trim().toUpperCase();
    try {
      const { data: ticket, error } = await supabase
        .from('betsnow')
        .select('*')
        .or(`booking_code.eq.${input},ticket_serial.eq.${input}`)
        .single();

      if (error || !ticket) {
        alert("⚠️ INVALID CODE");
        setSearchQuery('');
        return;
      }

      let rawSelections = ticket.selections 
        ? (typeof ticket.selections === 'string' ? JSON.parse(ticket.selections) : ticket.selections)
        : [];

      const matchIds = rawSelections.map(s => s.matchId);
      const { data: eventData } = await supabase.from('api_events').select('id, display_league').in('id', matchIds);

      const enrichedSelections = rawSelections.map(sel => ({
        ...sel,
        leagueName: eventData?.find(e => String(e.id) === String(sel.matchId))?.display_league || "Soccer"
      }));

      setCurrentTicket({ ...ticket, selections: enrichedSelections });
      if (ticket.ticket_serial) {
        if (confirm("🎟️ REPRINT TICKET?")) handlePrint();
      } else {
        setCart(enrichedSelections);
        setStake(ticket.stake?.toString() || "100");
      }
      setSearchQuery('');
    } catch (err) { console.error(err); } finally { setIsSearching(false); }
  };

  const handleProcessPayment = async () => {
    const numStake = parseFloat(stake);
    if (!numStake || numStake <= 0 || numStake > (userProfile?.balance || 0)) return alert("❌ CHECK STAKE/FLOAT");
    setIsProcessing(true);
    try {
      const newSerial = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const { error: rpcError } = await supabase.rpc('process_lucra_payment', {
        p_booking_code: currentTicket.booking_code.toString(),
        p_cashier_id: userProfile.id,
        p_generated_serial: newSerial,
        p_stake: numStake
      });
      if (rpcError) throw rpcError;

      setCurrentTicket({ ...currentTicket, ticket_serial: newSerial, selections: cart, stake: numStake });
      setCart([]);
      setStake("");
      handlePrint();
      initTerminal();
      setTimeout(() => setCurrentTicket(null), 10000);
    } catch (err) { alert("ERROR: " + err.message); } finally { setIsProcessing(false); }
  };

  return (
    <CashierLayout>
      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-white text-xl font-black mb-4 flex items-center gap-2 italic">
              <Search className="text-yellow-500" /> LOAD CODE
            </h2>
            <div className="flex gap-2">
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLoadTicket()} placeholder="Booking Code..." className="flex-1 bg-black border-2 border-zinc-700 rounded-xl px-4 py-4 text-white font-mono text-xl outline-none" />
              <button onClick={handleLoadTicket} disabled={isSearching} className="bg-yellow-500 text-black font-black px-8 rounded-xl">{isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
              <p className="text-zinc-500 text-[10px] font-black uppercase">Float</p>
              <p className="text-white text-3xl font-black italic">KSh {userProfile?.balance?.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <Betslip cart={cart} setCart={setCart} stake={stake} onStakeChange={setStake} onRemove={(idx) => setCart(prev => prev.filter((_, i) => i !== idx))} onClear={() => {setCart([]); setCurrentTicket(null);}} onProcess={handleProcessPayment} isProcessing={isProcessing} user={userProfile} />
        </div>
      </div>

      {/* THE FIX: Invisible but NOT display:none */}
      {currentTicket && (
        <div className="print-engine-container">
          <PrintableTicket ticket={currentTicket} profiles={allProfiles} user={userProfile} />
        </div>
      )}

      <style jsx>{`
        @media screen {
          .print-engine-container { position: absolute; left: -9999px; top: -9999px; }
        }
        @media print {
          .no-print { display: none !important; }
          .print-engine-container { position: static; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </CashierLayout>
  );
}
