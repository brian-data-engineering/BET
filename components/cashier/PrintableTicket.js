import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket, profiles = [], user }) {
  if (!ticket) return null;
  
  // Ensure selections are handled correctly regardless of DB storage type
  const selections = ticket.selections 
    ? (typeof ticket.selections === 'string' ? JSON.parse(ticket.selections) : ticket.selections) 
    : [];

  // Match the cashier identity across the platform
  const cashier = profiles.find(p => p.id === (ticket.cashier_id || user?.id));

  return (
    <div className="lucra-print-area">
      <div className="ticket-container">
        {/* HEADER */}
        <center className="header-logo">
          <img 
            src="https://i.ibb.co/67wb7Zm1/download.png" 
            style={{height:'38px', marginBottom: '4px', filter: 'grayscale(100%) contrast(200%)'}} 
            alt="LUCRA" 
          />
          <div className="terminal-tag text-black font-black uppercase tracking-tighter">LUCRA TERMINAL</div>
        </center>
        
        <div className="info-line">
          <span>{cashier?.shop_name || user?.shop_name || "LUCRA"}</span> 
          <span>{cashier?.username || user?.username || "Staff"}</span>
        </div>
        
        <div className="serial-box">
          {ticket.ticket_serial ? `SERIAL: ${ticket.ticket_serial}` : `BOOKING: ${ticket.booking_code}`}
        </div>

        {/* SELECTIONS GRID */}
        <div className="selections-list">
          {selections.map((s, i) => (
            <div key={i} className="match-item">
              <div className="m-header">
                {/* Fallback to 'Soccer' if leagueName is missing from snapshot */}
                <span>{s.sportName || "Soccer"}, {s.leagueName || "General"}</span> 
                <span>
                  {s.startTime ? new Date(s.startTime).toLocaleDateString('en-GB', {day:'2-digit', month:'2-digit'}) : ''} {s.startTime?.split('T')[1]?.slice(0,5)}
                </span>
              </div>
              <div className="m-teams font-black uppercase italic">
                <span className="match-id-box">{s.matchId?.toString().slice(-4)}</span> 
                {s.matchName}
              </div>
              <div className="m-bet">
                <span>{s.marketName}: <b>{s.selection}</b></span>
                <b className="m-odds">@{parseFloat(s.odds || 1).toFixed(2)}</b>
              </div>
            </div>
          ))}
        </div>

        {/* TOTALS SECTION */}
        <div className="ticket-totals">
          <div className="t-row"><span>TOTAL ODDS:</span> <span>{parseFloat(ticket.total_odds || 1).toFixed(2)}</span></div>
          <div className="t-row"><span>STAKE:</span> <span>{parseFloat(ticket.stake || 0).toLocaleString()} KSh</span></div>
          <div className="payout-container">
            <div className="p-label uppercase font-black">POTENTIAL PAYOUT</div>
            <div className="p-value font-black">{parseFloat(ticket.potential_payout || 0).toLocaleString()}</div>
          </div>
        </div>

        {/* FOOTER */}
        <center className="barcode-footer">
          {ticket.ticket_serial && (
            <div className="barcode-wrapper" style={{ display: 'flex', justifyContent: 'center' }}>
              <Barcode 
                value={String(ticket.ticket_serial)} 
                width={1.6} 
                height={40} 
                displayValue={false} 
                margin={0} 
                lineColor="#000000" 
              />
            </div>
          )}
          {/* Use ticket created_at for history reprints, or current date for new ones */}
          <p className="date-text">{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : new Date().toLocaleString()}</p>
          <p className="luck-text font-black tracking-widest">*** GOOD LUCK ***</p>
        </center>
      </div>

      <style jsx global>{`
        /* Hidden on screen by default */
        .lucra-print-area { display: none; }
        
        @media print {
          @page { size: 80mm auto; margin: 0 !important; }
          
          html, body { 
            margin: 0 !important; 
            padding: 0 !important; 
            background: #fff !important;
            -webkit-print-color-adjust: exact;
          }

          /* Hide everything except the print engine */
          body * { visibility: hidden !important; }
          
          .lucra-print-area, .lucra-print-area * { 
            visibility: visible !important; 
            display: block !important;
            color: #000 !important;
            font-family: 'Arial Black', sans-serif !important;
          }

          .lucra-print-area {
            position: absolute;
            left: 0; 
            top: 0;
            width: 72mm; /* Standard width for 80mm paper to prevent clipping */
            padding-bottom: 20mm; /* Extra room for the auto-cutter */
          }

          .ticket-container { padding: 4mm; }

          .terminal-tag { border-bottom: 3px solid #000; font-size: 14px; padding-bottom: 2px; margin-bottom: 4px; }
          .info-line { display: flex; justify-content: space-between; font-size: 12px; border-bottom: 3px solid #000; padding: 4px 0; }
          .serial-box { border: 3px solid #000; text-align: center; margin: 8px 0; padding: 6px; font-size: 18px; font-weight: 900; }

          .match-item { 
            border: 2px solid #000; 
            margin-top: -2px; 
            padding: 4px; 
          }
          
          .m-header { display: flex; justify-content: space-between; font-size: 10px; }
          .m-teams { font-size: 13px; line-height: 1.1; margin: 3px 0; }
          
          .match-id-box {
            background: #000 !important;
            color: #fff !important;
            padding: 0 4px;
            margin-right: 5px;
            font-size: 11px;
            display: inline-block !important;
          }

          .m-bet { display: flex; justify-content: space-between; font-size: 12px; }
          .ticket-totals { border-top: 3px solid #000; margin-top: 6px; }
          .t-row { display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; border-bottom: 2px solid #000; }
          
          .payout-container { border: 5px solid #000; text-align: center; margin-top: 10px; padding: 8px; }
          .p-label { font-size: 14px; text-decoration: underline; }
          .p-value { font-size: 32px; font-weight: 900; }

          .barcode-wrapper { margin: 15px 0 5px 0; }
          .date-text { font-size: 10px; font-weight: normal; }
          .luck-text { font-size: 14px; padding-bottom: 10px; }
        }
      `}</style>
    </div>
  );
}
