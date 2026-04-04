import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket, profiles = [], user }) {
  if (!ticket) return null;
  
  const selections = ticket.selections ? (typeof ticket.selections === 'string' ? JSON.parse(ticket.selections) : ticket.selections) : [];
  const cashier = profiles.find(p => p.id === (ticket.cashier_id || user?.id));

  return (
    <div className="lucra-print-area">
      <div className="ticket-container">
        {/* HEADER */}
        <center className="header-logo">
          <img src="https://i.ibb.co/67wb7Zm1/download.png" style={{height:'38px', marginBottom: '4px', filter: 'grayscale(100%) contrast(200%)'}} alt="LUCRA" />
          <div className="terminal-tag">LUCRA TERMINAL</div>
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
                <span>Soccer, {s.leagueName}</span> 
                <span>{s.startTime?.split('T')[0]} {s.startTime?.split('T')[1]?.slice(0,5)}</span>
              </div>
              <div className="m-teams">
                <span className="match-id-box">{s.matchId?.toString().slice(-4)}</span> 
                {s.matchName}
              </div>
              <div className="m-bet">
                <span>{s.marketName}: <b>{s.selection}</b></span>
                <b className="m-odds">@{parseFloat(s.odds).toFixed(2)}</b>
              </div>
            </div>
          ))}
        </div>

        {/* TOTALS SECTION */}
        <div className="ticket-totals">
          <div className="t-row"><span>TOTAL ODDS:</span> <span>{parseFloat(ticket.total_odds || 1).toFixed(2)}</span></div>
          <div className="t-row"><span>STAKE:</span> <span>{parseFloat(ticket.stake || 0).toLocaleString()} KSh</span></div>
          <div className="payout-container">
            <div className="p-label">POTENTIAL PAYOUT</div>
            <div className="p-value">{parseFloat(ticket.potential_payout || 0).toLocaleString()}</div>
          </div>
        </div>

        {/* FOOTER */}
        <center className="barcode-footer">
          {ticket.ticket_serial && (
            <div className="barcode-wrapper">
              <Barcode value={String(ticket.ticket_serial)} width={1.5} height={45} displayValue={false} margin={0} lineColor="#000000" />
            </div>
          )}
          <p className="date-text">{new Date().toLocaleString()}</p>
          <p className="luck-text">*** GOOD LUCK ***</p>
        </center>
      </div>

      <style jsx global>{`
        .lucra-print-area { display: block; visibility: hidden; height: 0; overflow: hidden; }
        
        @media print {
          @page { size: 80mm auto; margin: 0 !important; }
          
          html, body { 
            margin: 0 !important; 
            padding: 0 !important; 
            height: auto !important;
            color: #000 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * { visibility: hidden !important; }
          
          .print-engine-wrapper, .lucra-print-area, .lucra-print-area * { 
            visibility: visible !important; 
            display: block !important;
            color: #000 !important; /* Forces all text to absolute black */
            font-weight: 900 !important; /* Force ultra-bold everywhere */
          }

          .lucra-print-area {
            position: absolute;
            left: 0; top: 0;
            width: 72mm;
            height: auto !important;
            overflow: hidden;
          }

          .ticket-container { 
            width: 72mm; 
            font-family: 'Arial Black', Gadget, sans-serif; /* Heavier font than Courier */
            padding: 2mm 1mm; 
            box-sizing: border-box;
            line-height: 1.2;
            text-rendering: optimizeLegibility;
          }

          /* Strong Black Borders */
          .terminal-tag { font-size: 12px; border-bottom: 3px solid #000; text-align: center; padding-bottom: 2px; }
          .info-line { display: flex; justify-content: space-between; font-size: 11px; border-bottom: 3px solid #000; padding: 3px 0; }
          .serial-box { border: 3px solid #000; text-align: center; margin: 6px 0; padding: 5px; font-size: 15px; }

          .match-item { 
            border: 2px solid #000; 
            margin-top: -2px; /* Thick grid collapse */
            padding: 3px 5px; 
          }
          
          .m-header { display: flex; justify-content: space-between; font-size: 10px; }
          .m-teams { font-size: 13px; text-transform: uppercase; margin: 2px 0; display: flex !important; align-items: center; gap: 5px; }
          
          .match-id-box {
            background: #000 !important;
            color: #fff !important;
            padding: 0 4px;
            border-radius: 2px;
            display: inline-block !important;
          }

          .m-bet { display: flex; justify-content: space-between; font-size: 11px; }
          .m-odds { font-size: 12px; }

          .ticket-totals { border-top: 3px solid #000; margin-top: 5px; }
          .t-row { display: flex; justify-content: space-between; font-size: 14px; padding: 3px 0; border-bottom: 2px solid #000; }
          
          .payout-container { border: 4px solid #000; text-align: center; margin-top: 8px; padding: 6px; }
          .p-label { font-size: 13px; text-decoration: underline; }
          .p-value { font-size: 30px; line-height: 1; margin-top: 4px; }

          .barcode-wrapper { margin: 10px 0; display: flex !important; justify-content: center; width: 100%; }
          .date-text { font-size: 10px; margin-top: 5px; }
          .luck-text { font-size: 12px; padding-bottom: 15px; letter-spacing: 1px; }
        }
      `}</style>
    </div>
  );
}
