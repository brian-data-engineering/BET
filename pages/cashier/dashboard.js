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
  const [isPrinting, setIsPrinting] = useState(false); // ✅ NEW

  const initTerminal = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (profile) setUserProfile(profile);

    const { data: profiles } = await supabase.from('profiles').select('id, username, shop_name');
    if (profiles) setAllProfiles(profiles);
  }, []);

  useEffect(() => { initTerminal(); }, [initTerminal]);

  // ✅ SAFE PRINT FUNCTION (CORE FIX)
  const safePrint = useCallback(() => {
    if (isPrinting) return;

    setIsPrinting(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();

        // unlock after printer stabilizes
        setTimeout(() => {
          setIsPrinting(false);
        }, 3000);
      });
    });
  }, [isPrinting]);

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
        alert("⚠️ INVALID CODE OR TICKET NOT FOUND");
        setSearchQuery('');
        return;
      }

      let rawSelections = ticket.selections 
        ? (typeof ticket.selections === 'string' ? JSON.parse(ticket.selections) : ticket.selections)
        : [];

      const matchIds = rawSelections.map(s => s.matchId);
      const { data: eventData } = await supabase
        .from('api_events')
        .select('id, display_league')
        .in('id', matchIds);

      const enrichedSelections = rawSelections.map(sel => {
        const matchInfo = eventData?.find(e => String(e.id) === String(sel.matchId));
        return { 
          ...sel, 
          leagueName: matchInfo?.display_league || "Soccer" 
        };
      });

      if (ticket.ticket_serial) {
        setCurrentTicket({ ...ticket, selections: enrichedSelections });

        if (confirm("🎟️ TICKET ALREADY PAID. REPRINT?")) {
          setTimeout(() => safePrint(), 500); // ✅ FIXED
        }
      } else {
        const now = new Date().getTime();
        const validSelections = enrichedSelections.filter(item => {
          if (!item.startTime) return true;
          const matchDate = new Date(item.startTime).getTime();
          return (matchDate - now) > -60000; 
        });

        if (validSelections.length === 0) {
          alert("⚠️ ALL MATCHES IN THIS SLIP HAVE EXPIRED/STARTED.");
          return;
        }

        setCurrentTicket({ ...ticket, selections: validSelections }); 
        setCart(validSelections);
        setStake(ticket.stake?.toString() || "100");
      }

      setSearchQuery('');
    } catch (err) {
      console.error("Load Error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleProcessPayment = async () => {
    const numStake = parseFloat(stake);
    if (!numStake || numStake <= 0) return alert("Enter stake");
    if (numStake > (userProfile?.balance || 0)) return alert("⚠️ INSUFFICIENT FLOAT");
    
    const targetCode = currentTicket?.booking_code;
    if (!targetCode) return alert("No booking code.");

    setIsProcessing(true);

    try {
      const savedCartForPrint = [...cart];
      const totalOdds = savedCartForPrint.reduce((acc, item) => acc * parseFloat(item.odds || 1), 1);
      const potentialPayout = numStake * totalOdds;
      const newSerial = Math.floor(1000000000 + Math.random() * 9000000000).toString();

      const { data: paidTicket, error: rpcError } = await supabase.rpc('process_lucra_payment', {
        p_booking_code: targetCode.toString(),
        p_cashier_id: userProfile.id,
        p_generated_serial: newSerial,
        p_stake: numStake
      });

      if (rpcError) throw rpcError;

      setCurrentTicket({
        ...(paidTicket || currentTicket),
        ticket_serial: newSerial, 
        selections: savedCartForPrint, 
        stake: numStake,
        total_odds: totalOdds,
        potential_payout: potentialPayout,
        created_at: new Date().toISOString()
      });
      
      setCart([]);
      setStake("");
      setIsProcessing(false);

      // ✅ SAFE PRINT
      setTimeout(() => {
        safePrint();
        initTerminal();
        setTimeout(() => setCurrentTicket(null), 3000);
      }, 500);

    } catch (err) {
      alert("❌ ERROR: " + err.message);
      setIsProcessing(false);
    }
  };

  return (
    <CashierLayout>
      {/* UI unchanged */}

      {currentTicket && (
        <PrintableTicket ticket={currentTicket} profiles={allProfiles} user={userProfile} />
      )}
    </CashierLayout>
  );
}
