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
          <img src="https://i.ibb.co/67wb7Zm1/download.png" style={{height:'40px', marginBottom: '2px'}} alt="LUCRA" />
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
                <b className="m-odds">{parseFloat(s.odds).toFixed(2)}</b>
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
              <Barcode value={String(ticket.ticket_serial)} width={1.8} height={50} displayValue={false} margin={0} />
            </div>
          )}
          <p className="date-text">{new Date().toLocaleString()}</p>
          <p className="luck-text">*** GOOD LUCK ***</p>
        </center>
      </div>

      <style jsx global>{`
        .lucra-print-area { display: block; visibility: hidden; }
        
        @media print {
          /* 1. Page & Layout Setup */
          @page { size: 80mm auto; margin: 0; }
          body * { visibility: hidden !important; }
          
          .print-engine-wrapper, 
          .lucra-print-area, 
          .lucra-print-area * { 
            visibility: visible !important; 
            display: block !important; 
          }

          .lucra-print-area {
            position: absolute;
            left: 0; top: 0;
            width: 80mm;
            background: white;
            color: black;
            padding: 0; margin: 0;
          }

          .ticket-container { 
            width: 80mm; 
            font-family: 'Courier New', Courier, monospace; 
            padding: 2mm; 
            box-sizing: border-box;
            line-height: 1.1;
          }

          /* 2. Header & ID Box Logic */
          .terminal-tag { font-size: 11px; font-weight: 900; letter-spacing: 1px; border-bottom: 2px solid black; text-align: center; margin-bottom: 2px; }
          .info-line { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; border-bottom: 2px solid black; padding: 2px 0; }
          .serial-box { border: 2px solid black; text-align: center; font-weight: 900; margin: 5px 0; padding: 4px; font-size: 14px; }

          /* 3. The Grid Style for Matches */
          .match-item { 
            border: 1px solid black; 
            margin-top: -1px; /* Collapses borders like a table */
            padding: 3px; 
          }
          .m-header { display: flex; justify-content: space-between; font-size: 10px; }
          .m-teams { 
            font-size: 13px; font-weight: 900; text-transform: uppercase; margin: 2px 0;
            display: flex !important; align-items: center; gap: 6px; 
          }
          
          /* The Black Inverted ID Box */
          .match-id-box {
            background: black !important;
            color: white !important;
            padding: 0 4px;
            font-weight: bold;
            border-radius: 2px;
            display: inline-block !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .m-bet { display: flex; justify-content: space-between; font-size: 11px; }
          .m-odds { font-size: 12px; }

          /* 4. Totals & Payout */
          .ticket-totals { border-top: 2px solid black; margin-top: 4px; }
          .t-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; padding: 2px 0; border-bottom: 1px solid black; }
          .payout-container { border: 3px solid black; text-align: center; margin-top: 6px; padding: 5px; }
          .p-label { font-size: 12px; font-weight: 900; }
          .p-value { font-size: 26px; font-weight: 900; }

          /* 5. Footer & Barcode */
          .barcode-wrapper { margin: 8px 0; text-align: center; }
          .date-text { font-size: 10px; font-weight: bold; margin-top: 5px; }
          .luck-text { font-size: 11px; font-weight: 900; margin-top: 2px; }
        }
      `}</style>
    </div>
  );
}
