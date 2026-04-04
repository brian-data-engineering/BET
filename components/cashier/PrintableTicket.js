import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket, cart, user }) {
  // 1. SAFE DATA EXTRACTION (The "Anti-Crash" Logic)
  // We ensure 'selections' is ALWAYS an array, never 'undefined' or 'null'
  const selections = Array.isArray(ticket?.selections) 
    ? ticket.selections 
    : Array.isArray(cart) 
      ? cart 
      : [];

  // 2. DYNAMIC MAPPING
  const isSaved = !!ticket;
  
  // Guard against missing financial data by providing defaults
  const displayStake = ticket?.stake ?? 0;
  const displayOdds = ticket?.total_odds ?? 1.00;
  const displayPayout = ticket?.potential_payout ?? 0;
  const serialNumber = ticket?.ticket_serial || "TICKET PENDING";
  
  const cashierName = user?.username || user?.email?.split('@')[0] || "Admin";

  // 3. RENDER GUARD
  // If there's no data to show, return null silently instead of crashing
  if (selections.length === 0) return null;

  const formatDate = () => {
    try {
      const dateSource = ticket?.created_at ? new Date(ticket.created_at) : new Date();
      return dateSource.toLocaleDateString('en-GB') + ' ' + dateSource.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "Date Error";
    }
  };

  return (
    <div className="print-only bg-white text-black w-[80mm] font-sans p-1 leading-tight border-none">
      
      {/* BRANDING: CSS-ONLY (Anti-404) */}
      <div className="flex flex-col items-center mb-4 pt-2">
        <div className="border-[4px] border-black px-6 py-1">
          <span className="text-[26px] font-[900] italic tracking-tighter leading-none">LUCRA</span>
        </div>
        <span className="text-[10px] font-bold tracking-[0.4em] uppercase mt-1">Sports</span>
      </div>

      {/* TICKET HEADER */}
      <div className="border-b border-black pb-1 mb-2 text-[11px]">
        <div className="flex justify-between font-bold uppercase">
          <span>Shop: #016</span>
          <span className="truncate max-w-[50%]">Cashier: {cashierName}</span>
        </div>
        <div>Time: {formatDate()}</div>
        <div className="font-black mt-0.5">Ticket: {serialNumber}</div>
      </div>

      {/* SELECTIONS: THE MBOGIBET BOXED GRID */}
      <div className="border-t border-black">
        {selections.map((item, index) => (
          <div key={index} className="border-b border-x border-black p-2 relative text-[11px]">
            {/* League & Time */}
            <div className="flex justify-between text-[9px] font-bold italic mb-1 opacity-70">
              <span className="uppercase truncate max-w-[75%]">
                {item?.display_league || "Soccer"}
              </span>
              <span>
                {item?.startTime ? new Date(item.startTime).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) : ''}
              </span>
            </div>

            {/* Match Name & ID Box */}
            <div className="flex items-start gap-2 mb-1">
              <span className="bg-black text-white px-1.5 py-0.5 rounded-sm text-[9px] font-mono font-bold shrink-0">
                {item?.matchId ? item.matchId.slice(-4) : "0000"}
              </span>
              <span className="font-black uppercase text-[12px] leading-tight">
                {item?.matchName || "Unknown Match"}
              </span>
            </div>

            {/* Selection & Individual Odds */}
            <div className="flex justify-between items-end mt-2">
              <div className="leading-none">
                <div className="text-[10px] font-bold text-gray-700">{item?.marketName || 'Match Result'}</div>
                <div className="text-[11px] font-[900] underline uppercase italic mt-1">
                   {item?.selection || "N/A"}
                </div>
              </div>
              <div className="text-[15px] font-black italic">
                @{parseFloat(item?.odds || 0).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FINANCIAL SUMMARY: PULLS DIRECTLY FROM DB */}
      <div className="mt-2 space-y-1 font-bold text-[12px]">
        <div className="flex justify-between border-b border-black py-1">
          <span className="uppercase text-[10px]">Total Odds:</span>
          <span>{parseFloat(displayOdds).toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-b border-black py-1">
          <span className="uppercase text-[10px]">Total Stake:</span>
          <span>{parseFloat(displayStake).toFixed(2)} KES</span>
        </div>
        
        {/* PAYOUT SECTION */}
        <div className="flex justify-between items-center bg-black text-white px-2 py-2 mt-1">
          <span className="text-[10px] font-bold uppercase">Potential Win</span>
          <span className="text-[19px] font-black italic tabular-nums">
            {parseFloat(displayPayout).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* BARCODE & FOOTER */}
      <div className="mt-4 flex flex-col items-center">
        <Barcode 
          value={serialNumber} 
          width={1.6} 
          height={45} 
          displayValue={false} 
          margin={0}
          lineColor="#000000"
        />
        <div className="text-[10px] font-bold mt-1 tracking-widest">{serialNumber}</div>
        <div className="text-[9px] mt-4 text-center font-bold border-t-2 border-black pt-2 w-full uppercase leading-tight">
          Thank you for choosing Lucra!<br />
          All bets are final. No slip, no pay.<br />
          18+ Play Responsibly.
        </div>
      </div>

      <style jsx>{`
        @media print {
          .print-only {
            display: block !important;
            width: 80mm;
            margin: 0;
            background: white !important;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { position: absolute; left: 0; top: 0; }
        }
      `}</style>
    </div>
  );
}
