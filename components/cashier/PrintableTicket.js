import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket, cart, user }) {
  // 1. DATA PRIORITIZATION
  // Always use the saved 'ticket' data first. If null, fall back to the live 'cart'.
  const isSavedTicket = !!ticket;
  const selections = ticket?.selections || cart || [];
  
  // Use DB columns specifically: 'stake', 'total_odds', 'potential_payout'
  const displayStake = isSavedTicket ? ticket.stake : 0;
  const displayOdds = isSavedTicket ? ticket.total_odds : 1.00;
  const displayPayout = isSavedTicket ? ticket.potential_payout : 0;
  const serialNumber = ticket?.ticket_serial || "TICKET PENDING";
  
  const cashierName = user?.username || user?.email?.split('@')[0] || "Admin";

  if (selections.length === 0) return null;

  const formatDate = () => {
    const dateSource = ticket?.created_at ? new Date(ticket.created_at) : new Date();
    return dateSource.toLocaleDateString('en-GB') + ' ' + dateSource.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="print-only bg-white text-black w-[80mm] font-sans p-1 leading-tight">
      
      {/* HEADER: CSS-ONLY LOGO */}
      <div className="flex flex-col items-center mb-4">
        <div className="border-[4px] border-black px-6 py-1">
          <span className="text-[26px] font-[900] italic tracking-tighter leading-none">LUCRA</span>
        </div>
        <span className="text-[10px] font-bold tracking-[0.4em] uppercase mt-1">Sports</span>
      </div>

      {/* METADATA */}
      <div className="border-b border-black pb-1 mb-2 text-[11px]">
        <div className="flex justify-between font-bold uppercase">
          <span>Shop: #016</span>
          <span>Cashier: {cashierName}</span>
        </div>
        <div>Time: {formatDate()}</div>
        <div className="font-bold">No.: {serialNumber}</div>
        <div>Total Stake: {displayStake} KSh</div>
      </div>

      {/* SELECTIONS: MATCHING MBOGIBET BOXED LAYOUT */}
      <div className="border-t border-black">
        {selections.map((item, index) => (
          <div key={index} className="border-b border-x border-black p-2 relative text-[11px]">
            {/* League & Start Time */}
            <div className="flex justify-between text-[9px] font-bold italic mb-1 opacity-70">
              <span className="uppercase truncate max-w-[75%]">
                {item.display_league || "Soccer"}
              </span>
              <span>
                {item.startTime ? new Date(item.startTime).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) : ''}
              </span>
            </div>

            {/* Match Name with Black ID Box */}
            <div className="flex items-start gap-2 mb-1">
              <span className="bg-black text-white px-1 py-0.5 rounded-sm text-[10px] font-mono font-bold shrink-0">
                {item.matchId?.slice(-4) || "0000"}
              </span>
              <span className="font-black uppercase text-[12px] leading-tight">
                {item.matchName}
              </span>
            </div>

            {/* Selection & Odds */}
            <div className="flex justify-between items-end mt-2">
              <div className="leading-none">
                <div className="text-[10px] font-bold text-gray-700">{item.marketName || '1X2'}</div>
                <div className="text-[11px] font-[900] underline uppercase italic mt-1">
                   {item.selection}
                </div>
              </div>
              <div className="text-[14px] font-black">
                {parseFloat(item.odds || 0).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FINANCIAL SUMMARY */}
      <div className="mt-2 space-y-1 font-bold text-[12px]">
        <div className="flex justify-between border-b border-black py-0.5">
          <span>Express</span>
          <span>{parseFloat(displayOdds).toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-b border-black py-0.5">
          <span>Total Stake</span>
          <span>{displayStake} KSh</span>
        </div>
        <div className="flex justify-between items-center bg-black text-white px-2 py-1.5 mt-1">
          <span className="text-[11px]">Payout</span>
          <span className="text-[18px] font-black italic">
            {parseFloat(displayPayout).toLocaleString('en-KE')} KSh
          </span>
        </div>
      </div>

      {/* FOOTER & BARCODE */}
      <div className="mt-4 flex flex-col items-center">
        <Barcode 
          value={serialNumber} 
          width={1.6} 
          height={45} 
          displayValue={false} 
          margin={0}
        />
        <div className="text-[10px] font-bold mt-1 uppercase tracking-widest">{serialNumber}</div>
        <div className="text-[9px] mt-3 text-center font-bold border-t border-black pt-2 w-full uppercase">
          Thank you!<br />
          Bets are final. No slip, no pay.<br />
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
