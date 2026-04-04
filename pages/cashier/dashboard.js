import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import CashierLayout from '../../components/cashier/CashierLayout';
import Betslip from '../../components/cashier/BetSlip'; 
import PrintableTicket from '../../components/cashier/PrintableTicket'; 
import { Loader2, RefreshCw, Zap } from 'lucide-react';

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
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();
      
    if (profile) setUserProfile(profile);

    const { data: profiles } = await supabase.from('profiles').select('id, username, shop_name');
    if (profiles) setAllProfiles(profiles);
  }, []);

  useEffect(() => { 
    initTerminal(); 
  }, [initTerminal]);

  const handleLoadTicket = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    const input = searchQuery.trim().toUpperCase();

    try {
      const { data: ticket, error } = await supabase
        .from('betsnow')
        .select('*')
        .or(`booking_code.eq.${input},ticket_serial.eq.${input}`)
        .single();

      if (error || !ticket) {
        alert("⚠️ INVALID CODE OR TICKET NOT FOUND");
        setSearchQuery('');
        return;
      }

      const rawSelections = Array.isArray(ticket.selections) 
        ? ticket.selections 
        : JSON.parse(ticket.selections || '[]');

      if (ticket.ticket_serial) {
        setCurrentTicket(ticket);
        if (confirm("🎟️ TICKET ALREADY PAID. REPRINT?")) {
          setTimeout(() => { window.print(); }, 500);
        }
      } else {
        const now = new Date().getTime();
        const validSelections = rawSelections.filter(item => {
          if (!item.startTime) return true;
          const matchDate = new Date(item.startTime).getTime();
          return (matchDate - now) > 60000;
        });

        if (validSelections.length === 0) {
          alert("⚠️ ALL MATCHES IN THIS SLIP HAVE EXPIRED/STARTED.");
          return;
        }

        setCurrentTicket(ticket); 
        setCart(validSelections);
        setStake(ticket.stake?.toString() || "100");
      }
      setSearchQuery('');
    } catch (err) {
      console.error("Load Error:", err);
      alert("❌ ERROR LOADING TICKET");
    } finally {
      setIsSearching(false);
    }
  };

  const handleProcessPayment = async () => {
    const numStake = parseFloat(stake);
    if (!numStake || numStake <= 0) return alert("Enter valid stake");
    if (numStake > (userProfile?.balance || 0)) return alert("⚠️ INSUFFICIENT FLOAT");
    
    const targetCode = currentTicket?.booking_code;
    if (!targetCode) return alert("No valid booking code found.");

    setIsProcessing(true);
    try {
      const newSerial = Math.floor(1000000000 + Math.random() * 9000000000).toString();

      const { data: paidTicket, error: rpcError } = await supabase.rpc('process_lucra_payment', {
        p_booking_code: targetCode.toString(),
        p_cashier_id: userProfile.id,
        p_generated_serial: newSerial,
        p_stake: numStake
      });

      if (rpcError) throw rpcError;

      // --- THE FIX STARTS HERE ---
      // 1. Prepare data for the Print component
      setCurrentTicket(paidTicket);
      
      // 2. Wipe the heavy UI data IMMEDIATELY
      // This stops the Betslip's interval timer and re-renders the right panel as "Empty"
      setCart([]);
      setStake("");

      // 3. Wait 600ms for React to finish the "Wipe" re-render before freezing with Print
      setTimeout(() => {
        window.print();
        
        // 4. Cleanup after the print dialog is closed
        initTerminal(); 
        setIsProcessing(false);
        // Optional: Hide printable ticket from DOM after delay
        setTimeout(() => setCurrentTicket(null), 3000);
      }, 600);

    } catch (err) {
      console.error("Payment Error:", err);
      alert("❌ DATABASE REJECTED: " + (err.message || "Check connection"));
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      <div className="flex h-[calc(100vh-64px)] bg-[#080b13] text-white overflow-hidden">
        
        {/* LEFT: SCANNER */}
        <div className="flex-1 p-10 flex flex-col items-center justify-center border-r border-white/5">
          <div className="w-full max-w-xl">
            <div className="flex items-center gap-3 mb-8">
              <Zap className="text-[#10b981]" fill="#10b981" size={24} />
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Lucra Terminal</h2>
            </div>

            <div className="relative">
              <input 
                type="text"
                placeholder="SCAN CODE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadTicket()}
                className="w-full bg-[#111926] border-2 border-white/5 rounded-2xl py-6 pl-6 pr-32 text-2xl font-black outline-none focus:border-[#10b981] transition-all uppercase"
              />
              <button 
                onClick={handleLoadTicket}
                disabled={isSearching}
                className="absolute right-2 top-2 bottom-2 bg-[#10b981] text-black px-6 rounded-xl font-black italic"
              >
                {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-[#111926] p-6 rounded-2xl border border-white/5">
                <p className="text-[10px] font-bold opacity-30 uppercase mb-1 tracking-widest">Active Float</p>
                <p className="text-xl font-black italic text-[#10b981]">
                  KES {(userProfile?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <button 
                onClick={initTerminal}
                className="bg-[#111926] p-6 rounded-2xl border border-white/5 flex items-center justify-center hover:bg-white/5 group"
              >
                <RefreshCw size={24} className={`${isSearching ? "animate-spin" : ""} group-hover:rotate-180 transition-all duration-500`} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: BETSLIP */}
        <div className="w-[420px] flex flex-col bg-[#0b0f1a]">
          <div className="flex-1 overflow-hidden">
            <Betslip 
              cart={cart}
              setCart={setCart} 
              stake={stake}
              onStakeChange={setStake}
              onRemove={(idx) => setCart(prev => prev.filter((_, i) => i !== idx))}
              onClear={() => { setCart([]); setStake(""); setCurrentTicket(null); }}
              isProcessing={isProcessing}
              user={userProfile} 
            />
          </div>
          
          {cart.length > 0 && (
            <div className="p-6 bg-[#0b0f1a] border-t border-white/5">
              <button 
                onClick={handleProcessPayment}
                disabled={isProcessing}
                className="w-full bg-[#10b981] hover:brightness-110 text-black py-5 rounded-xl font-black text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : "CONFIRM & PRINT"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="hidden print:block">
        <PrintableTicket 
          ticket={currentTicket} 
          cart={cart} 
          profiles={allProfiles} 
          user={userProfile} 
        />
      </div>
    </CashierLayout>
  );
}
