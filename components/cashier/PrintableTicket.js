import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket, cart = [], profiles = [], user }) {
  // 1. Data Safety Checks
  const selections = ticket?.selections 
    ? (typeof ticket.selections === 'string' ? JSON.parse(ticket.selections) : ticket.selections)
    : (cart || []);

  if (!selections || selections.length === 0) return null;

  const cashierId = ticket?.paid_by || ticket?.cashier_id;
  const cashierProfile = profiles?.find(p => p.id === cashierId);
  const cashierName = cashierProfile?.username || user?.username || "Staff";
  const shopName = cashierProfile?.shop_name || user?.shop_name || "LUCRA";

  const displayOdds = parseFloat(ticket?.total_odds || 1).toFixed(2);
  const displayStake = parseFloat(ticket?.stake || 0);
  const displayPayout = parseFloat(ticket?.potential_payout || 0);

  return (
    <div className="lucra-print-area">
      <div className="ticket-container">
        {/* HEADER */}
        <div className="header">
          <img src="https://i.ibb.co/67wb7Zm1/download.png" alt="LUCRA" className="logo" />
          <div className="terminal-name">LUCRA TERMINAL</div>
        </div>

        {/* SHOP INFO */}
        <div className="info-row">
          <span>{shopName}</span>
          <span>{cashierName}</span>
        </div>

        <div className="serial-box">
          {ticket?.ticket_serial ? `SERIAL: ${ticket.ticket_serial}` : `BOOKING: ${ticket?.booking_code}`}
        </div>

        {/* SELECTIONS */}
        <div className="selections">
          {selections.map((item, i) => (
            <div key={i} className="match-card">
              <div className="match-header">
                <span>{item.leagueName || "Soccer"}</span>
                <span>{item.startTime?.split('T')[1]?.substring(0, 5) || ""}</span>
              </div>
              <div className="match-name">{item.matchName}</div>
              <div className="market-row">
                <span>{item.marketName}: <strong>{item.selection}</strong></span>
                <span>@{parseFloat(item.odds).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* TOTALS */}
        <div className="totals">
          <div className="row"><span>ODDS:</span> <span>{displayOdds}</span></div>
          <div className="row"><span>STAKE:</span> <span>{displayStake.toLocaleString()} KSh</span></div>
          <div className="payout-box">
            <div className="payout-label">POTENTIAL PAYOUT</div>
            <div className="payout-amount">{displayPayout.toLocaleString()}</div>
          </div>
        </div>

        {/* BARCODE */}
        <div className="barcode-section">
          {ticket?.ticket_serial && (
            <Barcode value={String(ticket.ticket_serial)} width={1.2} height={40} displayValue={false} margin={0} />
          )}
          <div className="footer-text">*** THANK YOU - GOOD LUCK ***</div>
        </div>
      </div>

      <style jsx global>{`
        /* SCREEN VIEW: Completely hide this from the dashboard */
        .lucra-print-area { display: none; }

        @media print {
          /* Hide the entire website dashboard */
          body * { visibility: hidden !important; }
          
          /* Show only the ticket area */
          .lucra-print-area, .lucra-print-area * { 
            visibility: visible !important; 
            display: block !important; 
          }

          .lucra-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 72mm;
            background: white;
            color: black;
            font-family: sans-serif;
            padding: 0;
            margin: 0;
          }

          .ticket-container { width: 72mm; padding: 2mm; }
          .header { text-align: center; margin-bottom: 4px; }
          .logo { height: 30px; width: auto; margin: 0 auto; }
          .terminal-name { font-size: 10px; font-weight: 900; letter-spacing: 2px; }
          .info-row { display: flex; justify-content: space-between; font-size: 9px; border-bottom: 1px solid black; }
          .serial-box { border: 2px solid black; text-align: center; font-weight: 900; margin: 4px 0; padding: 2px; font-size: 12px; }
          .match-card { border: 1px solid black; margin-bottom: 2px; padding: 2px; }
          .match-header { display: flex; justify-content: space-between; font-size: 8px; font-weight: bold; }
          .match-name { font-size: 10px; font-weight: 900; text-transform: uppercase; }
          .market-row { display: flex; justify-content: space-between; font-size: 10px; border-top: 1px dotted #ccc; }
          .totals { margin-top: 4px; border-top: 2px solid black; }
          .row { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
          .payout-box { border: 3px solid black; text-align: center; margin-top: 4px; padding: 2px; }
          .payout-label { font-size: 9px; font-weight: 900; }
          .payout-amount { font-size: 20px; font-weight: 900; }
          .barcode-section { text-align: center; margin-top: 10px; }
          .footer-text { font-size: 8px; font-weight: bold; font-style: italic; margin-top: 5px; }

          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>
    </div>
  );
}
