import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket, profiles = [], user }) {
  if (!ticket) return null;
  
  const selections = ticket.selections ? (typeof ticket.selections === 'string' ? JSON.parse(ticket.selections) : ticket.selections) : [];
  const cashier = profiles.find(p => p.id === (ticket.cashier_id || user?.id));

  return (
    <div className="lucra-print-area">
      <div className="ticket-container">
        <center className="header-logo">
          <img src="https://i.ibb.co/67wb7Zm1/download.png" style={{height:'40px', marginBottom: '5px'}} alt="LUCRA" />
          <div className="terminal-tag">LUCRA TERMINAL</div>
        </center>
        
        <div className="info-line">
          <span>{cashier?.shop_name || user?.shop_name || "LUCRA"}</span> 
          <span>{cashier?.username || user?.username || "Staff"}</span>
        </div>
        
        <div className="serial-box">
          {ticket.ticket_serial ? `SERIAL: ${ticket.ticket_serial}` : `BOOKING: ${ticket.booking_code}`}
        </div>

        <div className="selections-list">
          {selections.map((s, i) => (
            <div key={i} className="match-item">
              <div className="m-header"><span>{s.leagueName}</span> <span>{s.startTime?.split('T')[1]?.slice(0,5)}</span></div>
              <div className="m-teams">{s.matchName}</div>
              <div className="m-bet">{s.marketName}: <b>{s.selection} @{parseFloat(s.odds).toFixed(2)}</b></div>
            </div>
          ))}
        </div>

        <div className="ticket-totals">
          <div className="t-row"><span>TOTAL ODDS:</span> <span>{parseFloat(ticket.total_odds || 1).toFixed(2)}</span></div>
          <div className="t-row"><span>STAKE:</span> <span>{parseFloat(ticket.stake || 0).toLocaleString()} KSh</span></div>
          <div className="payout-container">
            <div className="p-label">POTENTIAL PAYOUT</div>
            <div className="p-value">{parseFloat(ticket.potential_payout || 0).toLocaleString()}</div>
          </div>
        </div>

        <center className="barcode-footer">
          {ticket.ticket_serial && (
            <div style={{margin: '10px 0'}}>
              <Barcode value={String(ticket.ticket_serial)} width={1.5} height={50} displayValue={false} margin={0} />
            </div>
          )}
          <p className="date-text">{new Date().toLocaleString()}</p>
          <p className="luck-text">*** GOOD LUCK ***</p>
        </center>
      </div>

      <style jsx global>{`
        .lucra-print-area { display: block; visibility: hidden; }
        
        @media print {
          /* 1. Hide the browser UI and Dashboard */
          body * { visibility: hidden !important; }
          
          /* 2. Enable the ticket specifically */
          .print-engine-wrapper, 
          .lucra-print-area, 
          .lucra-print-area * { 
            visibility: visible !important; 
            display: block !important; 
          }

          .lucra-print-area {
            position: absolute;
            left: 0; top: 0;
            width: 72mm;
            background: white;
            color: black;
            padding: 0; margin: 0;
          }

          .ticket-container { 
            width: 72mm; 
            font-family: 'Courier New', Courier, monospace; 
            padding: 3mm; 
            box-sizing: border-box;
          }

          .terminal-tag { font-size: 11px; font-weight: 900; letter-spacing: 1px; border-bottom: 1px solid black; padding-bottom: 2px; }
          .info-line { display: flex; justify-content: space-between; font-size: 10px; margin-top: 2px; }
          .serial-box { border: 2px solid black; text-align: center; font-weight: 900; margin: 8px 0; padding: 5px; font-size: 14px; }
          .match-item { border-bottom: 1px dotted black; padding: 4px 0; }
          .m-header { display: flex; justify-content: space-between; font-size: 9px; }
          .m-teams { font-size: 11px; font-weight: 900; text-transform: uppercase; margin: 2px 0; }
          .m-bet { font-size: 11px; }
          .t-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-top: 2px; }
          .payout-container { border: 3px solid black; text-align: center; margin-top: 8px; padding: 6px; }
          .p-label { font-size: 10px; font-weight: 900; }
          .p-value { font-size: 24px; font-weight: 900; }
          .date-text { font-size: 9px; margin-top: 10px; }
          .luck-text { font-size: 10px; font-weight: bold; margin-top: 2px; }

          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>
    </div>
  );
}
