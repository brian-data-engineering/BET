import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const shouldPrintRef = useRef(false);

  const initTerminal = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (profile) setUserProfile(profile);
  }, []);

  useEffect(() => { initTerminal(); }, [initTerminal]);

  // 1. DIAGNOSTIC EFFECT (Keeps data on screen for inspection)
  useEffect(() => {
    if (currentTicket && shouldPrintRef.current) {
      console.log("🛠️ [DEBUG] Ticket Data detected in State:", currentTicket);
      // window.print(); // STILL DISABLED - We want to see it on the dashboard first
    }
  }, [currentTicket]);

  // 2. HIGH-INTELLIGENCE SEARCH LOGIC
  const handleLoadTicket = async () => {
    if (!searchQuery || isSearching) return;
    setIsSearching(true);
    const input = searchQuery.trim().toUpperCase();
    
    try {
      console.log("🔍 [DEBUG] Searching for:", input);

      // STEP 1: Check if this is an ALREADY PAID ticket in the 'print' table
      const { data: printedTicket } = await supabase
        .from('print')
        .select('*')
        .or(`ticket_serial.eq.${input},booking_code.eq.${input}`)
        .maybeSingle();

      if (printedTicket) {
        console.log("✅ [DEBUG] Found PAID Ticket. Serial:", printedTicket.ticket_serial);
        shouldPrintRef.current = true; 
        setCurrentTicket(printedTicket); 
        setSearchQuery('');
        return;
      }

      // STEP 2: Check for a new booking in 'betsnow'
      const { data: booking } = await supabase
        .from('betsnow')
        .select('*')
        .eq('booking_code', input)
        .maybeSingle();

      if (!booking) {
        console.error("❌ [DEBUG] No record found in either table.");
        alert("⚠️ CODE NOT FOUND");
        return;
      }

      console.log("🎟️ [DEBUG] Found UNPAID Booking. Loading to slip...");
      const rawSelections = typeof booking.selections === 'string' ? JSON.parse(booking.selections) : booking.selections;
      
      setCart(rawSelections || []);
      setStake(booking.stake?.toString() || "100");
      
      shouldPrintRef.current = false; 
      setCurrentTicket(booking); 
      setSearchQuery('');

    } catch (err) {
      console.error("💥 [DEBUG] Search Crash:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleProcessPayment = async () => {
    const numStake = parseFloat(stake);
    if (!numStake || numStake <= 0 || numStake > (userProfile?.balance || 0)) return alert("Check Stake/Balance");
    
    setIsProcessing(true);
    console.log("💳 [PAYMENT] Initiating transaction...");

    try {
      const newSerial = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      
      const { error: rpcError } = await supabase.rpc('process_lucra_payment', {
        p_booking_code: currentTicket.booking_code.toString(),
        p_cashier_id: userProfile.id,
        p_generated_serial: newSerial,
        p_stake: numStake
      });

      if (rpcError) throw rpcError;

      // Give Supabase a moment to finish the 'print' table insert
      await new Promise(res => setTimeout(res, 1200));

      const { data: officialTicket } = await supabase
        .from('print')
        .select('*')
        .eq('ticket_serial', newSerial)
        .single();

      if (officialTicket) {
        console.log("✅ [PAYMENT] Official Ledger Sync Complete.");
        shouldPrintRef.current = true;
        setCurrentTicket(officialTicket);
        
        setCart([]);
        setStake("");
        initTerminal(); 
      }
    } catch (err) {
      alert("❌ TERMINAL ERROR: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      {/* --- DEBUG VIEW START --- */}
      <div style={{ 
        position: 'relative', zIndex: 9999, background: 'white', padding: '20px', 
        margin: '20px', border: '10px solid #10b981', color: 'black' 
      }}>
        <h1 style={{ fontWeight: '900', color: 'red', fontSize: '24px' }}>DEBUG POWER-ON</h1>
        <p><strong>Ticket ID:</strong> <span style={{ color: 'blue' }}>{currentTicket?.id || "NULL"}</span></p>
        <p><strong>Serial:</strong> <span style={{ color: 'blue' }}>{currentTicket?.ticket_serial || "PENDING (NOT PAID)"}</span></p>
        
        {currentTicket ? (
           <div className="border-4 border-black p-4 mt-4 bg-gray-50">
             <PrintableTicket ticket={currentTicket} />
           </div>
        ) : (
          <div className="p-10 text-center border-2 border-dashed border-gray-300 mt-4 text-gray-400">
            LOAD A CODE TO START DEBUGGING
          </div>
        )}
      </div>
      {/* --- DEBUG VIEW END --- */}

      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-white text-xl font-black mb-4 flex items-center gap-2 italic uppercase tracking-tighter">
              <Search className="text-[#10b981]" /> Load Terminal Code
            </h2>
            <div className="flex gap-2">
              <input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleLoadTicket()} 
                placeholder="Enter Booking Code..." 
                className="flex-1 bg-black border-2 border-zinc-700 rounded-xl px-4 py-4 text-white font-mono text-xl outline-none focus:border-[#10b981]" 
              />
              <button onClick={handleLoadTicket} disabled={isSearching} className="bg-[#10b981] text-black font-black px-8 rounded-xl">
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 text-white">
              <p className="text-zinc-500 text-[10px] uppercase font-black">Float Balance</p>
              <p className="text-3xl font-black italic tabular-nums">KSh {userProfile?.balance?.toLocaleString() || "0.00"}</p>
            </div>
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 text-[#10b981]">
              <p className="text-zinc-500 text-[10px] uppercase font-black">Terminal</p>
              <p className="text-xl font-black truncate">{userProfile?.shop_name || "LUCRA"}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <Betslip 
            cart={cart} setCart={setCart} 
            stake={stake} onStakeChange={setStake} 
            onRemove={(idx) => setCart(prev => prev.filter((_, i) => i !== idx))} 
            onClear={() => {setCart([]); setCurrentTicket(null);}} 
            onProcess={handleProcessPayment} 
            isProcessing={isProcessing} 
            user={userProfile} 
          />
        </div>
      </div>
    </CashierLayout>
  );
}
