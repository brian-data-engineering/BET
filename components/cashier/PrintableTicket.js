import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket, cart, user }) {
  // 1. Data Normalization
  const selections = ticket?.selections || cart || [];
  const displayStake = ticket?.stake || 0;
  const displayPayout = ticket?.potential_payout || 0;
  const totalOdds = ticket?.total_odds || 1;
  const serialNumber = ticket?.ticket_serial || "TICKET PENDING";
  
  // Extract Cashier Name
  const cashierName = user?.username || user?.email?.split('@')[0] || "Admin";

  if (selections.length === 0) return null;

  const formatDate = () => {
    const dateSource = ticket?.created_at ? new Date(ticket.created_at) : new Date();
    return dateSource.toLocaleDateString('en-GB') + ' ' + dateSource.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="print-only bg-white text-black w-[80mm] font-sans text-[11px] leading-tight p-1">
      
      {/* 1. NO-GRAPHICS CSS LOGO HEADER */}
      <div className="flex flex-col items-center mb-3 pt-2">
        <div className="border-[3px] border-black px-4 py-1 flex flex-col items-center">
          <span className="text-[22px] font-black italic tracking-tighter leading-none">LUCRA</span>
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase leading-none mt-1">Sports Betting</span>
        </div>
        <div className="w-full flex items-center gap-2 mt-2">
            <div className="h-[1px] bg-black flex-1"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Official Receipt</span>
            <div className="h-[1px] bg-black flex-1"></div>
        </div>
      </div>

      {/* 2. TICKET METADATA */}
      <div className="px-1 mb-2 space-y-0.5 border-b border-black pb-1">
        <div className="flex justify-between font-bold">
          <span>Shop: #016</span>
          <span className="uppercase">Cashier: {cashierName}</span>
        </div>
        <div className="text-[10px]">Date: {formatDate()}</div>
        <div className="text-[10px] font-mono">Serial: {serialNumber}</div>
      </div>

      {/* 3. SELECTIONS GRID (Boxed Style) */}
      <div className="border-t border-black">
        {selections.map((item, index) => (
          <div key={index} className="border-b border-x border-black p-2 relative">
            
            {/* LEAGUE & TIME */}
            <div className="flex justify-between text-[9px] mb-1 italic">
              <span className="uppercase font-bold truncate max-w-[70%]">
                {item.display_league || "Soccer"}
              </span>
              <span className="font-bold">
                {item.startTime ? new Date(item.startTime).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) : 'LIVE'}
              </span>
            </div>

            {/* MATCH NAME WITH BLACK ID BOX */}
            <div className="flex items-center gap-1.5 font-black text-[12px] mb-1">
              <span className="bg-black text-white px-1.5 py-0.5 rounded-sm text-[9px] font-mono shrink-0">
                {item.matchId?.slice(-4) || "5930"}
              </span>
              <span className="uppercase truncate">{item.matchName}</span>
            </div>

            {/* MARKET & PICK */}
            <div className="flex justify-between items-end mt-1">
              <div className="text-[10px]">
                <div className="font-bold">{item.marketName || '1X2'}</div>
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

      {/* 4. FINANCIAL SUMMARY */}
      <div className="mt-1 px-1">
        <div className="flex justify-between font-bold border-b border-black py-1">
          <span>EXPRESS ODDS:</span>
          <span>{parseFloat(totalOdds).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold border-b border-black py-1 text-[12px]">
          <span>TOTAL STAKE:</span>
          <span>{parseFloat(displayStake).toFixed(2)} KES</span>
        </div>
        
        {/* PAYOUT - Pure CSS High Contrast */}
        <div className="flex justify-between items-center py-2 bg-black text-white px-2 mt-1">
          <span className="font-bold text-[10px]">POTENTIAL WIN:</span>
          <span className="text-[18px] font-black italic">
            {parseFloat(displayPayout).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* 5. BARCODE & FOOTER */}
      <div className="mt-4 flex flex-col items-center">
        <Barcode 
          value={serialNumber} 
          width={1.6} 
          height={45} 
          displayValue={false} 
          margin={0}
          lineColor="#000000"
        />
        <div className="text-[10px] font-bold mt-2 tracking-[0.2em]">{serialNumber}</div>
        <div className="text-[9px] mt-3 uppercase text-center font-bold border-t-2 border-black pt-2 w-full leading-tight">
          BETS ARE FINAL. NO SLIP, NO PAY.<br />
          TICKET EXPIRES IN 7 DAYS. 18+<br />
          <span className="text-[10px] mt-1 block tracking-widest italic">Good Luck!</span>
        </div>
      </div>

      <style jsx>{`
        @media print {
          .print-only {
            display: block !important;
            width: 80mm;
            margin: 0;
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
