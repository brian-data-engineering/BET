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
    <div className="lucra-print-container bg-white text-black w-[72mm] font-sans p-0 leading-tight">
      
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
          <span>{shopName}</span>
          <span>{cashierName}</span>
        </div>
        <div className="text-[9px] py-0.5">
          Time: {ticket?.created_at ? new Date(ticket.created_at).toLocaleString('en-GB') : new Date().toLocaleString('en-GB')}
        </div>
        <div className="text-[13px] font-black border-y-2 border-black py-1 uppercase italic text-center">
          {ticket?.ticket_serial ? `SERIAL: ${ticket.ticket_serial}` : `BOOKING: ${ticket?.booking_code || "NEW"}`}
        </div>
      </div>

      {/* MATCH SELECTIONS - GRID BOXES */}
      <div className="px-1 space-y-1">
        {selections.map((item, index) => {
          const rawTimeDisplay = item?.startTime?.includes('T') 
            ? item.startTime.split('T')[1].substring(0, 5) 
            : "";

          return (
            <div key={`${item.matchId}-${index}`} className="border-2 border-black p-1 rounded-sm">
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

              <div className="flex justify-between items-center mt-1 pt-1 border-t border-black/20">
                <div className="text-[10px] font-bold italic">
                  {item?.marketName} : <span className="underline">{item?.selection}</span>
                </div>
                <div className="text-[14px] font-black">
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

        {/* PAYOUT BOX - High Visibility Border */}
        <div className="border-[3px] border-black p-1 mt-1 text-center">
          <span className="text-[9px] uppercase font-black">Potential Payout</span>
          <div className="text-[20px] font-black italic">
            {displayPayout.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* BARCODE AREA */}
      <div className="mt-3 flex flex-col items-center pb-4">
        {ticket?.ticket_serial && (
          <>
            <Barcode 
              value={String(ticket.ticket_serial)} 
              width={1.3} 
              height={40} 
              displayValue={false} 
              margin={0} 
            />
            <div className="text-[10px] font-black mt-1 tracking-widest">{ticket.ticket_serial}</div>
          </>
        )}
        <div className="text-[8px] uppercase mt-2 font-black italic border-t border-black w-full text-center pt-1">
          *** GOOD LUCK - LUCRA TERMINAL ***
        </div>
      </div>

      <style jsx global>{`
        /* Standard View: Hide the ticket */
        .lucra-print-container {
          display: none;
        }

        @media print {
          /* Hide EVERYTHING else in the app */
          body * {
            visibility: hidden;
          }

          /* Show ONLY the ticket and its contents */
          .lucra-print-container, .lucra-print-container * {
            visibility: visible;
            display: block !important;
          }

          .lucra-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 72mm !important;
            display: block !important;
            background: white !important;
            color: black !important;
          }

          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
