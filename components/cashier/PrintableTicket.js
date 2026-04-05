import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket }) {
  if (!ticket) return null;

  // Safe parsing for selections
  const selections = typeof ticket.selections === 'string' 
    ? JSON.parse(ticket.selections) 
    : ticket.selections;

  return (
    <div className="lucra-print-area" style={{ 
      width: '72mm', 
      margin: '0 auto',
      padding: '10px', 
      fontFamily: "'Courier New', Courier, monospace", 
      color: '#000', 
      backgroundColor: '#fff',
      lineHeight: '1.2'
    }}>
      {/* --- SHOP HEADER --- */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h1 style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', letterSpacing: '2px' }}>LUCRA</h1>
        <p style={{ margin: '2px 0', fontSize: '12px' }}>www.lucrabets.com</p>
        <div style={{ borderBottom: '2px solid #000', margin: '5px 0' }}></div>
      </div>

      {/* --- TICKET INFO --- */}
      <div style={{ fontSize: '11px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Date: {new Date(ticket.created_at).toLocaleDateString()}</span>
          <span>Time: {new Date(ticket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div>Ticket ID: <span style={{ fontWeight: 'bold' }}>{ticket.ticket_serial}</span></div>
        <div>Cashier: {ticket.cashier_id?.substring(0, 8) || 'Admin'}</div>
      </div>

      {/* --- SELECTIONS BOXES --- */}
      <div style={{ marginBottom: '10px' }}>
        {selections?.map((sel, idx) => (
          <div key={idx} style={{ 
            border: '1px solid #000', 
            padding: '5px', 
            marginBottom: '5px',
            fontSize: '11px' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderBottom: '1px dotted #000', marginBottom: '3px' }}>
              <span>{sel.league || 'SOCCER'}</span>
              <span>{sel.event_id || ''}</span>
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{sel.event_name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
              <span>{sel.market_name}: <span style={{ fontWeight: 'bold' }}>{sel.selection_name}</span></span>
              <span style={{ fontWeight: 'bold' }}>{sel.odds}</span>
            </div>
          </div>
        ))}
      </div>

      {/* --- SUMMARY SECTION --- */}
      <div style={{ borderTop: '2px dashed #000', paddingTop: '5px', marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Odds:</span>
          <span style={{ fontWeight: 'bold' }}>{ticket.total_odds}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Stake:</span>
          <span style={{ fontWeight: 'bold' }}>{ticket.stake} KSh</span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '18px', 
          fontWeight: '900', 
          marginTop: '5px',
          borderTop: '1px solid #000',
          paddingTop: '5px'
        }}>
          <span>PAYOUT:</span>
          <span>{ticket.potential_payout} KSh</span>
        </div>
      </div>

      {/* --- BARCODE --- */}
      <div style={{ 
        marginTop: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        textAlign: 'center' 
      }}>
        <Barcode 
          value={ticket.ticket_serial || "000000000"} 
          width={1.2} 
          height={40} 
          displayValue={false}
          margin={0}
        />
        <div style={{ fontSize: '10px', marginTop: '5px', fontWeight: 'bold' }}>
          *{ticket.booking_code || ticket.ticket_serial}*
        </div>
        <p style={{ fontSize: '9px', marginTop: '10px' }}>
          Terms & Conditions apply. Tickets expire in 30 days.
          <br />Keep this receipt for payout.
        </p>
      </div>
    </div>
  );
}
