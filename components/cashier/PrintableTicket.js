import { useEffect } from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket }) {
  // Log every time this renders to see if it's being "killed" too early
  console.count("🎟️ PrintableTicket Rendered");

  useEffect(() => {
    if (ticket) {
      console.log("📊 [TICKET ENGINE] Serial Number:", ticket.ticket_serial);
    }
  }, [ticket]);

  if (!ticket) {
    console.warn("⚠️ [TICKET ENGINE] Attempted to render but 'ticket' prop is null.");
    return null;
  }

  const selections = Array.isArray(ticket.selections) ? ticket.selections : [];

  return (
    <div className="lucra-print-area">
      <div className="ticket-container bg-white text-black p-4 font-sans text-[12px] leading-tight">
        
        {/* DYNAMIC HEADER */}
        <center className="header-section mb-4">
          {ticket.logo_url && (
            <img 
              src={ticket.logo_url} 
              alt="SHOP LOGO"
              className="h-10 mb-2 grayscale contrast-200"
            />
          )}
          <h1 className="text-sm font-black uppercase tracking-tighter">
            {ticket.shop_name || "LUCRA TERMINAL"}
          </h1>
          <p className="text-[9px] uppercase font-bold opacity-70">Official Betting Receipt</p>
        </center>

        {/* TICKET META */}
        <div className="border-y-2 border-black border-dashed py-2 mb-3 flex justify-between text-[10px] font-bold">
          <span>SERIAL: {ticket.ticket_serial || 'PENDING'}</span>
          <span>CODE: {ticket.booking_code}</span>
        </div>

        {/* SELECTIONS LOOP */}
        <div className="space-y-3 mb-4">
          {selections.length > 0 ? (
            selections.map((sel, i) => (
              <div key={i} className="selection-row">
                <div className="flex justify-between font-black uppercase text-[11px]">
                  <span>{sel.matchName || sel.event}</span>
                  <span>@{parseFloat(sel.odds || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] italic">
                  <span>{sel.marketName || 'Match Result'}: <b>{sel.selection}</b></span>
                  <span className="opacity-60">{sel.leagueName || 'Soccer'}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-[10px]">No selections found.</p>
          )}
        </div>

        {/* FINANCIALS */}
        <div className="border-t-2 border-black pt-2 space-y-1">
          <div className="flex justify-between font-bold text-[10px]">
            <span>TOTAL ODDS:</span>
            <span>{parseFloat(ticket.total_odds || 1).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-black text-xs">
            <span>STAKE:</span>
            <span>{parseFloat(ticket.stake || 0).toLocaleString()} KSh</span>
          </div>
          
          <div className="bg-black text-white p-2 mt-2 text-center rounded-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1">Potential Payout</p>
            <p className="text-lg font-black italic">
              {parseFloat(ticket.potential_payout || 0).toLocaleString()} KSh
            </p>
          </div>
        </div>

        {/* BARCODE & FOOTER */}
        <center className="mt-6 space-y-2">
          <div className="flex justify-center bg-white p-1 min-h-[45px]">
            {ticket.ticket_serial ? (
              <Barcode 
                value={String(ticket.ticket_serial)} 
                width={1.2} 
                height={45} 
                displayValue={false}
                margin={0}
                renderer="canvas"
              />
            ) : (
              <span className="text-[8px] animate-pulse">GENERATING BARCODE...</span>
            )}
          </div>
          <p className="text-[9px] font-mono font-bold tracking-tighter">
            PRINTED: {new Date(ticket.created_at || Date.now()).toLocaleString()}
          </p>
        </center>
      </div>

      <style jsx>{`
        .ticket-container {
          width: 72mm;
          margin: 0 auto;
          background: white;
        }

        @media print {
          .lucra-print-area {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
          }
          .ticket-container { 
            width: 100% !important; 
            padding: 5px !important; 
            margin: 0 !important;
          }
          /* This ensures the test text shows up in the dialog */
          h1 { visibility: visible !important; color: red !important; }
        }
      `}</style>
    </div>
  );
}
