import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket }) {
  if (!ticket) return null;

  // Since we fetch from the 'print' table, selections is already a clean array
  const selections = Array.isArray(ticket.selections) 
    ? ticket.selections 
    : [];

  return (
    <div className="lucra-print-area">
      <div className="ticket-container bg-white text-black p-4 font-sans text-[12px] leading-tight">
        
        {/* DYNAMIC HEADER */}
        <center className="header-section mb-4">
          <img 
            src={ticket.logo_url} 
            alt="SHOP LOGO"
            className="h-10 mb-2 grayscale contrast-200"
          />
          <h1 className="text-sm font-black uppercase tracking-tighter">
            {ticket.shop_name}
          </h1>
          <p className="text-[9px] uppercase font-bold opacity-70">Official Betting Receipt</p>
        </center>

        {/* TICKET META */}
        <div className="border-y-2 border-black border-dashed py-2 mb-3 flex justify-between text-[10px] font-bold">
          <span>SERIAL: {ticket.ticket_serial}</span>
          <span>CODE: {ticket.booking_code}</span>
        </div>

        {/* SELECTIONS LOOP */}
        <div className="space-y-3 mb-4">
          {selections.map((sel, i) => (
            <div key={i} className="selection-row">
              <div className="flex justify-between font-black uppercase text-[11px]">
                <span>{sel.matchName}</span>
                <span>@{parseFloat(sel.odds || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] italic">
                <span>{sel.marketName || 'Match Result'}: <b>{sel.selection}</b></span>
                <span className="opacity-60">{sel.leagueName || 'Soccer'}</span>
              </div>
            </div>
          ))}
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
          <div className="flex justify-center bg-white p-1">
            <Barcode 
              value={String(ticket.ticket_serial)} 
              width={1.2} 
              height={45} 
              displayValue={false}
              margin={0}
            />
          </div>
          <p className="text-[9px] font-mono font-bold tracking-tighter">
            PRINTED: {new Date(ticket.created_at || Date.now()).toLocaleString()}
          </p>
          <div className="border-t border-black/10 pt-2">
            <p className="text-[8px] uppercase font-bold italic">Thank you for playing at {ticket.shop_name}!</p>
            <p className="text-[7px] opacity-50 mt-1">Lucra Terminal v2.0 • Secure Ledger Verified</p>
          </div>
        </center>

      </div>

      <style jsx>{`
        .ticket-container {
          width: 72mm; /* Standard Thermal Paper Width */
          margin: 0 auto;
        }
        @media print {
          body { background: white; }
          .ticket-container { width: 100%; padding: 0; }
        }
      `}</style>
    </div>
  );
}
