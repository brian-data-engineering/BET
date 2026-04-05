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

  /**
   * PRODUCTION AUTO-PRINT LOGIC
   * Uses Body-Injection to bypass Layout restrictions.
   */
  useEffect(() => {
    if (currentTicket && shouldPrintRef.current && currentTicket.ticket_serial) {
      const timer = setTimeout(() => {
        // 1. Capture the working HTML from the visible preview
        const previewElement = document.getElementById('visible-preview');
        if (!previewElement) return;
        const ticketContent = previewElement.innerHTML;

        // 2. Create the portal outside of the React tree
        const printContainer = document.createElement('div');
        printContainer.id = 'temp-print-portal';
        
        // We wrap it in a div to ensure background is white and clean
        printContainer.innerHTML = `
          <div style="background: white; width: 100%;">
            ${ticketContent}
          </div>
        `;

        // 3. Inject to Body
        document.body.appendChild(printContainer);

        // 4. Print
        window.focus();
        window.print();

        // 5. Cleanup
        setTimeout(() => {
          if (document.getElementById('temp-print-portal')) {
            document.body.removeChild(printContainer);
          }
          shouldPrintRef.current = false;
        }, 1000);

      }, 2000); // 2s is enough for barcodes to stabilize
      return () => clearTimeout(timer);
    }
  }, [currentTicket]);

  const handleLoadTicket = async () => {
    if (!searchQuery || isSearching) return;
    setIsSearching(true);
    const input = searchQuery.trim().toUpperCase();
    try {
      const { data: printedTicket } = await supabase
        .from('print')
        .select('*')
        .or(`ticket_serial.eq.${input},booking_code.eq.${input}`)
        .maybeSingle();

      if (printedTicket) {
        shouldPrintRef.current = true; 
        setCurrentTicket(printedTicket); 
        setSearchQuery('');
        return;
      }

      const { data: booking } = await supabase.from('betsnow').select('*').eq('booking_code', input).maybeSingle();
      if (!booking) return alert("⚠️ NOT FOUND");

      const rawSelections = typeof booking.selections === 'string' ? JSON.parse(booking.selections) : booking.selections;
      setCart(rawSelections || []);
      setStake(booking.stake?.toString() || "100");
      shouldPrintRef.current = false; 
      setCurrentTicket(booking); 
      setSearchQuery('');
    } catch (err) { console.error(err); } finally { setIsSearching(false); }
  };

  const handleProcessPayment = async () => {
    const numStake = parseFloat(stake);
    if (!numStake || numStake <= 0 || numStake > (userProfile?.balance || 0)) return alert("Check Stake/Balance");
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

      await new Promise(res => setTimeout(res, 1500));
      const { data: officialTicket } = await supabase.from('print').select('*').eq('ticket_serial', newSerial).single();

      if (officialTicket) {
        shouldPrintRef.current = true;
        setCurrentTicket(officialTicket);
        setCart([]);
        setStake("");
        initTerminal(); 
      }
    } catch (err) { alert(err.message); } finally { setIsProcessing(false); }
  };

  return (
    <>
      <CashierLayout>
        <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
          <div className="lg:col-span-2 space-y-6">
            {/* Terminal Input */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
               <h2 className="text-white text-xl font-black mb-4 flex items-center gap-2 italic uppercase">
                <Search className="text-[#10b981]" /> Terminal Load
              </h2>
              <div className="flex gap-2">
                <input 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadTicket()} 
                  placeholder="Enter Code..." 
                  className="flex-1 bg-black border-2 border-zinc-700 rounded-xl px-4 py-4 text-white font-mono text-xl focus:border-[#10b981] outline-none" 
                />
                <button onClick={handleLoadTicket} disabled={isSearching} className="bg-[#10b981] text-black font-black px-8 rounded-xl hover:bg-[#059669] transition-colors">
                  {isSearching ? <Loader2 className="animate-spin" /> : "LOAD"}
                </button>
              </div>
            </div>

            {/* Float Info */}
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
                 <p className="text-zinc-500 text-[10px] font-black uppercase">Available Float</p>
                 <p className="text-white text-3xl font-black">KSh {userProfile?.balance?.toLocaleString() || "0.00"}</p>
               </div>
               <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800">
                 <p className="text-zinc-500 text-[10px] font-black uppercase">Shop</p>
                 <p className="text-[#10b981] text-xl font-black">{userProfile?.shop_name || "LUCRA"}</p>
               </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Betslip 
              cart={cart} 
              setCart={setCart} 
              stake={stake} 
              onStakeChange={setStake} 
              onRemove={(idx) => setCart(prev => prev.filter((_, i) => i !== idx))} 
              onClear={() => {setCart([]); setCurrentTicket(null);}} 
              onProcess={handleProcessPayment} 
              isProcessing={isProcessing} 
              user={userProfile} 
            />
          </div>
        </div>

        {/* --- LIVE PREVIEW (Used as Source for Printer) --- */}
        {currentTicket && (
          <div className="lucra-preview-container no-print pb-20">
            <div className="bg-white p-4 shadow-2xl border-2 border-[#10b981] max-w-[320px] mx-auto mt-10 rounded-lg">
              <p className="text-[10px] text-gray-400 text-center mb-4 font-mono font-bold uppercase tracking-tighter border-b pb-2">
                --- Printer Snapshot ---
              </p>
              <div id="visible-preview" className="bg-white">
                <PrintableTicket ticket={currentTicket} />
              </div>
            </div>
          </div>
        )}
      </CashierLayout>

      {/* Note: We keep the styles here as a backup, 
          but your globals.css should handle the heavy lifting. 
      */}
      <style jsx global>{`
        @media screen {
          #temp-print-portal { display: none !important; }
        }
        @media print {
          #__next, .no-print { display: none !important; }
          #temp-print-portal { 
            display: block !important; 
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
