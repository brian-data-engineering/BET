import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket, cart = [], profiles = [], user }) {
  const selections = ticket?.selections 
    ? (typeof ticket.selections === 'string' ? JSON.parse(ticket.selections) : ticket.selections)
    : (cart || []);

  const cashierId = ticket?.paid_by || ticket?.cashier_id;
  const cashierProfile = profiles?.find(p => p.id === cashierId);
  const cashierName = cashierProfile?.username || user?.username || "Staff";
  const shopName = cashierProfile?.shop_name || user?.shop_name || "LUCRA TERMINAL";

  const calculatedOdds = selections.reduce((acc, item) => acc * parseFloat(item.odds || 1), 1);
  const displayOdds = (parseFloat(ticket?.total_odds) || calculatedOdds).toFixed(2);
  const displayStake = parseFloat(ticket?.stake || 0);
  const displayPayout = (parseFloat(ticket?.potential_payout) || (calculatedOdds * displayStake));

  if (!selections || selections.length === 0) return null;

  return (
    <div className="print-only bg-white text-black w-[72mm] font-sans p-0 leading-tight">
      {/* HEADER SECTION */}
      <div className="flex flex-col items-center pt-2 mb-1">
        <img 
          src="https://i.ibb.co/67wb7Zm1/download.png" 
          alt="LUCRA" 
          className="h-10 w-auto object-contain"
          onError={(e) => (e.target.style.display = 'none')} 
        />
        <span className="text-[10px] font-black tracking-widest uppercase">Lucra Terminal</span>
      </div>

      <div className="px-1 mb-2">
        <div className="flex justify-between text-[9px] font-bold uppercase border-b border-black pb-0.5">
          <span>Shop: {shopName}</span>
          <span>Cashier: {cashierName}</span>
        </div>
        <div className="text-[9px] py-0.5">
          Time: {ticket?.created_at ? new Date(ticket.created_at).toLocaleString('en-GB') : new Date().toLocaleString('en-GB')}
        </div>
        <div className="text-[13px] font-black border-y-2 border-black py-1 uppercase italic text-center">
          {ticket?.ticket_serial ? `SERIAL: ${ticket.ticket_serial}` : `BOOKING: ${ticket?.booking_code || "NEW"}`}
        </div>
      </div>

      {/* MATCH SELECTIONS */}
      <div className="px-1 space-y-1">
        {selections.map((item, index) => {
          const rawTimeDisplay = item?.startTime?.includes('T') 
            ? item.startTime.split('T')[1].substring(0, 5) 
            : "";

          return (
            <div key={`${item.matchId}-${index}`} className="border border-black p-1 rounded-sm">
              <div className="flex justify-between text-[8px] font-bold uppercase opacity-80 mb-0.5">
                <span>{item?.leagueName || "Soccer"}</span>
                <span>{rawTimeDisplay}</span>
              </div>
              
              <div className="flex items-start gap-1">
                <span className="font-mono font-bold text-[9px] border border-black px-0.5">
                  {item?.matchId ? String(item.matchId).slice(-4) : "0000"}
                </span>
                <span className="font-black uppercase text-[11px] leading-[1.1]">
                  {item?.matchName}
                </span>
              </div>

              <div className="flex justify-between items-center mt-1 pt-1 border-t border-black/10">
                <div className="text-[10px] font-bold italic">
                  {item?.marketName || '1X2'} : <span className="underline">{item?.selection}</span>
                </div>
                <div className="text-[14px] font-black tabular-nums">
                  @{parseFloat(item?.odds || 0).toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER TOTALS */}
      <div className="px-1 mt-2">
        <div className="border-t-2 border-black pt-1 space-y-0.5 font-bold text-[11px]">
          <div className="flex justify-between uppercase">
            <span>Total Odds:</span>
            <span>{displayOdds}</span>
          </div>
          <div className="flex justify-between uppercase">
            <span>Total Stake:</span>
            <span>{displayStake.toLocaleString()} KSh</span>
          </div>
        </div>

        {/* FORCE BACKGROUND PRINTING HERE */}
        <div 
          className="flex justify-between items-center bg-black text-white px-2 py-1.5 mt-1 rounded-sm"
          style={{ backgroundColor: 'black', color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          <span className="text-[9px] uppercase font-black leading-none">Potential<br/>Payout</span>
          <span className="text-[18px] font-black italic tabular-nums">
            {displayPayout.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* BARCODE AREA */}
      <div className="mt-3 flex flex-col items-center pb-6">
        {ticket?.ticket_serial && (
          <>
            <Barcode 
              value={String(ticket.ticket_serial)} 
              width={1.2} 
              height={35} 
              displayValue={false} 
              margin={0} 
            />
            <div className="text-[10px] font-black mt-1 tracking-widest">{ticket.ticket_serial}</div>
          </>
        )}
        <div className="text-[8px] uppercase mt-2 font-black italic border-t border-black w-full text-center pt-1">
          Thank you for playing with Lucra!
        </div>
      </div>

      <style jsx>{`
        @media screen { .print-only { display: none; } }
        @media print {
          .print-only { 
            display: block !important; 
            width: 72mm;
            background: white !important;
            margin: 0;
            padding: 0;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          @page { size: 80mm 297mm; margin: 0; }
        }
      `}</style>
    </div>
  );
}
