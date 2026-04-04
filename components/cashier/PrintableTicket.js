import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket, cart = [], profiles = [], user }) {
  // 1. DATA UNIFICATION
  // Priority: 1. Paid ticket selections, 2. Raw cart selections, 3. Empty array
  const selections = ticket?.selections 
    ? (Array.isArray(ticket.selections) ? ticket.selections : JSON.parse(ticket.selections || '[]'))
    : (cart || []);

  // 2. LOOKUPS
  const cashierId = ticket?.paid_by || ticket?.cashier_id;
  const cashierProfile = profiles?.find(p => p.id === cashierId);
  const cashierName = cashierProfile?.username || user?.username || "Staff";
  const shopName = cashierProfile?.shop_name || user?.shop_name || "LUCRA SHOP";

  // League processing 
  const leagueList = ticket?.league_name ? ticket.league_name.split(', ') : [];

  if (!selections || selections.length === 0) return null;

  return (
    <div className="print-only bg-white text-black w-[80mm] font-sans p-1 leading-tight border-none">
      {/* HEADER */}
      <div className="flex flex-col items-center mb-2">
        <img 
          src="https://pushvault.shop/logo.png" 
          alt="LUCRA" 
          className="h-12 w-auto object-contain"
          onError={(e) => (e.target.style.display = 'none')} // Hides logo if 404 occurs
        />
        <span className="text-[12px] font-black tracking-[0.2em] uppercase mt-1">Lucra Terminal</span>
      </div>

      {/* TICKET INFO */}
      <div className="border-b-2 border-black pb-1 mb-2 text-[11px]">
        <div className="flex justify-between font-bold uppercase">
          <span>{shopName}</span>
          <span>By: {cashierName}</span>
        </div>
        <div className="text-[10px] mt-0.5">
          Date: {ticket?.created_at ? new Date(ticket.created_at).toLocaleString('en-GB') : new Date().toLocaleString('en-GB')}
        </div>
        <div className="font-black text-[14px] mt-1 uppercase border-t border-black pt-1">
          {ticket?.ticket_serial ? `SERIAL: ${ticket.ticket_serial}` : "BOOKING: " + (ticket?.booking_code || "NEW")}
        </div>
      </div>

      {/* SELECTIONS */}
      <div className="border-t border-black">
        {selections.map((item, index) => (
          <div key={index} className="border-b border-black py-2 text-[11px]">
            <div className="flex justify-between text-[9px] font-black mb-1 uppercase italic">
              <span>⚽ {leagueList[index] || item?.leagueName || "Soccer"}</span>
              <span>
                {item?.startTime ? new Date(item.startTime).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) : ''}
              </span>
            </div>
            
            <div className="flex items-start gap-2 mb-1">
              <span className="bg-black text-white px-1.5 py-0.5 rounded-sm text-[9px] font-mono font-bold shrink-0">
                {item?.matchId ? String(item.matchId).slice(-4) : "MID"}
              </span>
              <span className="font-black uppercase text-[12px] leading-tight">
                {item?.matchName || "Match Name"}
              </span>
            </div>

            <div className="flex justify-between items-end mt-1">
              <div className="leading-none">
                <div className="text-[10px] font-bold text-gray-800">{item?.marketName || 'Match Result'}</div>
                <div className="text-[11px] font-black underline uppercase italic mt-1">
                  Pick: {item?.selection || "N/A"}
                </div>
              </div>
              <div className="text-[16px] font-black">
                @{parseFloat(item?.odds || 0).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TOTALS */}
      <div className="mt-2 space-y-1 font-bold text-[12px]">
        <div className="flex justify-between border-b border-dotted border-black py-1">
          <span>TOTAL ODDS:</span>
          <span>{parseFloat(ticket?.total_odds || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-b border-dotted border-black py-1">
          <span>STAKE:</span>
          <span>{parseFloat(ticket?.stake || 0).toLocaleString()} KES</span>
        </div>
        <div className="flex justify-between items-center bg-black text-white px-2 py-2 mt-1">
          <span className="text-[10px] uppercase font-black">Payout:</span>
          <span className="text-[18px] font-black italic">
            {parseFloat(ticket?.potential_payout || 0).toLocaleString('en-KE')}
          </span>
        </div>
      </div>

      {/* BARCODE SECTION */}
      <div className="mt-4 flex flex-col items-center pb-4">
        {ticket?.ticket_serial && (
          <>
            <Barcode 
              value={String(ticket.ticket_serial)} 
              width={1.5} 
              height={45} 
              displayValue={false} 
              margin={0} 
            />
            <div className="text-[11px] font-black mt-1 tracking-[0.3em]">{ticket.ticket_serial}</div>
          </>
        )}
        <div className="text-[8px] uppercase mt-2 font-bold italic">*** GOOD LUCK ***</div>
      </div>

      {/* PRINT STYLES */}
      <style jsx>{`
        @media screen {
          .print-only { display: none; }
        }
        @media print {
          .print-only { 
            display: block !important; 
            width: 80mm; 
            background: white !important;
            margin: 0 auto;
          }
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>
    </div>
  );
}
