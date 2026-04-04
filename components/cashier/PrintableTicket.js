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
  /* On the screen, the ticket is totally removed so it doesn't break the UI */
  .lucra-print-area { 
    display: none; 
  }
  
  @media print {
    /* When printing, the ticket is the ONLY thing that exists */
    .lucra-print-area { 
      display: block !important; 
      width: 72mm !important;
      height: auto !important;
    }

    .ticket-container { 
      width: 72mm; 
      padding: 2mm;
      background: white !important;
      color: black !important;
    }

    /* Force the barcode and match boxes to show up black */
    .match-id-box {
      background: black !important;
      color: white !important;
      -webkit-print-color-adjust: exact;
    }

    .payout-container {
      border: 4px solid black !important;
    }
  }
`}</style>
    </div>
  );
}
