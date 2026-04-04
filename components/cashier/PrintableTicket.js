import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket, cart, user }) {
  // 1. Data Normalization
  // If 'ticket' exists (from betsnow), use it. Otherwise, use 'cart' (the active slip).
  const selections = ticket?.selections || cart || [];
  const displayStake = ticket?.stake || 0;
  const displayPayout = ticket?.potential_payout || 0;
  const totalOdds = ticket?.total_odds || 1;
  const serialNumber = ticket?.ticket_serial || "TICKET PENDING";
  
  // Extract Cashier Name (from profiles id linked to cashier_id)
  const cashierName = user?.username || user?.email?.split('@')[0] || "Admin";

  if (selections.length === 0) return null;

  const formatDate = () => {
    // Uses created_at from DB or current time for new slips
    const dateSource = ticket?.created_at ? new Date(ticket.created_at) : new Date();
    return dateSource.toLocaleDateString('en-GB') + ' ' + dateSource.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="print-only bg-white text-black w-[80mm] font-sans text-[11px] leading-tight p-1">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col items-center mb-2">
        <img 
          src="https://pushvault.shop/logo.png" 
          alt="LUCRA" 
          className="h-12 w-auto object-contain"
        />
        <span className="text-[10px] font-bold mt-1 tracking-widest uppercase">Lucra Sports</span>
      </div>

      {/* TICKET METADATA */}
      <div className="px-1 mb-2 space-y-0.5 border-b border-black pb-1">
        <div className="flex justify-between font-bold">
          <span>Shop: #016</span>
          <span className="uppercase">Cashier: {cashierName}</span>
        </div>
        <div className="text-[10px]">Date: {formatDate()}</div>
        <div className="text-[10px] font-mono">No: {serialNumber}</div>
      </div>

      {/* SELECTIONS GRID (Matching MbogiBet Format) */}
      <div className="border-t border-black">
        {selections.map((item, index) => (
          <div key={index} className="border-b border-x border-black p-2 relative">
            
            {/* LEAGUE & TIME */}
            <div className="flex justify-between text-[9px] mb-1 italic opacity-80">
              <span className="uppercase font-bold truncate max-w-[70%]">
                ⚽ {item.display_league || "Soccer"}
              </span>
              <span>
                {item.startTime ? new Date(item.startTime).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) : 'LIVE'}
              </span>
            </div>

            {/* MATCH NAME WITH BLACK ID BOX */}
            <div className="flex items-center gap-1.5 font-black text-[12px] mb-1">
              <span className="bg-black text-white px-1.5 py-0.5 rounded-sm text-[9px] font-mono shrink-0">
                {item.matchId?.slice(-4) || "0000"}
              </span>
              <span className="uppercase truncate">{item.matchName}</span>
            </div>

            {/* MARKET & PICK */}
            <div className="flex justify-between items-end mt-1">
              <div className="text-[10px]">
                <div className="font-bold text-slate-700">{item.marketName || '1X2'}</div>
                <div className="font-black text-[11px] underline italic uppercase">
                  Pick: {item.selection}
                </div>
              </div>
              <div className="font-black text-[13px]">
                @{parseFloat(item.odds || 0).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FINANCIAL SUMMARY */}
      <div className="mt-1 px-1">
        <div className="flex justify-between font-bold border-b border-black py-1">
          <span>EXPRESS ODDS:</span>
          <span>{parseFloat(totalOdds).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold border-b border-black py-1">
          <span>TOTAL STAKE:</span>
          <span>{parseFloat(displayStake).toFixed(2)} KES</span>
        </div>
        
        {/* PAYOUT - High Contrast */}
        <div className="flex justify-between items-center py-2 bg-black text-white px-2 mt-1">
          <span className="font-bold text-[11px]">POTENTIAL WIN:</span>
          <span className="text-[16px] font-black italic">
            {parseFloat(displayPayout).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* BARCODE & FOOTER */}
      <div className="mt-4 flex flex-col items-center">
        <Barcode 
          value={serialNumber} 
          width={1.6} 
          height={40} 
          displayValue={false} 
          margin={0}
          lineColor="#000000"
          background="#ffffff"
        />
        <div className="text-[10px] font-bold mt-2 tracking-widest">{serialNumber}</div>
        <div className="text-[8px] mt-2 uppercase text-center font-bold border-t border-black pt-2 w-full">
          BETS ARE FINAL. NO SLIP, NO PAY.<br />
          TICKET EXPIRES IN 7 DAYS. 18+
        </div>
      </div>

      <style jsx>{`
        @media print {
          .print-only {
            display: block !important;
            width: 80mm;
            margin: 0;
            padding: 5px;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
          /* Standard thermal print optimization */
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { position: absolute; left: 0; top: 0; }
        }
      `}</style>
    </div>
  );
}
