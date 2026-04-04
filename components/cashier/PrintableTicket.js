import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket, cart = [], profiles = [], user }) {
  const isSaved = !!ticket;
  const selections = isSaved ? (ticket?.selections || []) : (cart || []);
  
  // Lookups
  const cashierId = ticket?.paid_by || ticket?.cashier_id;
  const cashierProfile = profiles?.find(p => p.id === cashierId);
  const cashierName = cashierProfile?.username || user?.username || "Admin";
  const shopName = cashierProfile?.shop_name || "Shop: #016";

  // League processing (Safely split comma-list from your JSON)
  const leagueList = ticket?.league_name ? ticket.league_name.split(', ') : [];

  if (!selections || selections.length === 0) return null;

  return (
    <div className="print-only bg-white text-black w-[80mm] font-sans p-1 leading-tight">
      <div className="flex flex-col items-center mb-2">
        <img src="https://pushvault.shop/logo.png" alt="LUCRA" className="h-14 w-auto object-contain" />
        <span className="text-[10px] font-black tracking-[0.3em] uppercase mt-1">Lucra Sports</span>
      </div>

      <div className="border-b border-black pb-1 mb-2 text-[11px]">
        <div className="flex justify-between font-bold uppercase">
          <span>{shopName}</span>
          <span>Cashier: {cashierName}</span>
        </div>
        <div className="text-[10px]">Date: {ticket?.created_at ? new Date(ticket.created_at).toLocaleString('en-GB') : new Date().toLocaleString('en-GB')}</div>
        <div className="font-black text-[12px] mt-1 uppercase">Ticket: {ticket?.ticket_serial || "PENDING"}</div>
      </div>

      <div className="border-t border-black">
        {selections.map((item, index) => (
          <div key={index} className="border-b border-x border-black p-2 text-[11px]">
            <div className="flex justify-between text-[9px] font-black italic mb-1 opacity-80 uppercase">
              <span>⚽ {leagueList[index] || "Soccer"}</span>
              <span>{item?.startTime ? new Date(item.startTime).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) : ''}</span>
            </div>
            <div className="flex items-start gap-2 mb-1">
              <span className="bg-black text-white px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold shrink-0">
                {item?.matchId ? String(item.matchId).slice(-4) : "MID"}
              </span>
              <span className="font-black uppercase text-[12px] leading-tight">{item?.matchName || "Unknown"}</span>
            </div>
            <div className="flex justify-between items-end mt-1">
              <div className="leading-none">
                <div className="text-[10px] font-bold text-gray-700">{item?.marketName || 'Match Result'}</div>
                <div className="text-[11px] font-[900] underline uppercase italic mt-1">Pick: {item?.selection || "N/A"}</div>
              </div>
              <div className="text-[15px] font-[1000]">@{parseFloat(item?.odds || 0).toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 space-y-0.5 font-bold text-[12px]">
        <div className="flex justify-between border-b border-black py-1"><span>TOTAL ODDS:</span><span>{ticket?.total_odds || 0}</span></div>
        <div className="flex justify-between border-b border-black py-1"><span>STAKE:</span><span>{ticket?.stake || 0} KES</span></div>
        <div className="flex justify-between items-center bg-black text-white px-2 py-2 mt-1">
          <span className="text-[10px] uppercase font-black">Potential Payout:</span>
          <span className="text-[20px] font-black italic">{parseFloat(ticket?.potential_payout || 0).toLocaleString('en-KE')}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center">
        {ticket?.ticket_serial && (
          <Barcode value={String(ticket.ticket_serial)} width={1.6} height={40} displayValue={false} margin={0} />
        )}
        <div className="text-[10px] font-bold mt-1 tracking-[0.2em]">{ticket?.ticket_serial || ""}</div>
      </div>

      <style jsx>{`
        @media print {
          .print-only { display: block !important; width: 80mm; position: absolute; left: 0; top: 0; background: white !important; }
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>
    </div>
  );
}
