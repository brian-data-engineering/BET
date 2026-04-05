import React from 'react';
import Barcode from 'react-barcode';

export default function PrintableTicket({ ticket }) {
  if (!ticket) return null;

  // 1. DATA PARSING
  const selections = typeof ticket.selections === 'string' 
    ? JSON.parse(ticket.selections) 
    : (Array.isArray(ticket.selections) ? ticket.selections : []);

  return (
    <div className="lucra-print-area" style={{ 
      width: '72mm', 
      margin: '0 auto',
      padding: '8px', 
      fontFamily: 'monospace', 
      color: '#000', 
      backgroundColor: '#fff',
      lineHeight: '1.2'
    }}>
      {/* HEADER */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', marginBottom: '10px', paddingBottom: '5px' }}>
        <h1 style={{ margin: '0', fontSize: '28px', fontWeight: '900' }}>LUCRA</h1>
        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>SHOP: {ticket.shop_name || "LUCRA"}</div>
        <div style={{ fontSize: '10px' }}>DATE: {new Date(ticket.created_at).toLocaleString()}</div>
      </div>

      {/* SELECTIONS - Using your exact keys: matchName, marketName, selection */}
      <div style={{ marginBottom: '10px' }}>
        {selections.map((sel, idx) => (
          <div key={idx} style={{ 
            border: '1px solid #000', 
            padding: '6px', 
            marginBottom: '5px',
            fontSize: '11px' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold', color: '#555' }}>
              <span>ID: {sel.matchId}</span>
              <span>{sel.marketName}</span>
            </div>
            
            <div style={{ fontWeight: 'bold', fontSize: '13px', margin: '3px 0' }}>
              {sel.matchName}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '0.5px solid #eee', paddingTop: '2px' }}>
              <span>PICK: <strong>{sel.selection}</strong></span>
              <span style={{ fontWeight: 'bold' }}>{sel.odds}</span>
            </div>
          </div>
        ))}
      </div>

      {/* TOTALS - Using your keys: stake, total_odds, potential_payout */}
      <div style={{ borderTop: '2px dashed #000', paddingTop: '8px', marginTop: '5px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Stake:</span>
          <span style={{ fontWeight: 'bold' }}>KSh {ticket.stake}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Odds:</span>
          <span style={{ fontWeight: 'bold' }}>{ticket.total_odds}</span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '20px', 
          fontWeight: '900', 
          marginTop: '8px', 
          borderTop: '1px solid #000', 
          paddingTop: '5px' 
        }}>
          <span>PAYOUT:</span>
          <span>{ticket.potential_payout}</span>
        </div>
      </div>

      {/* BARCODE SECTION */}
      <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Barcode 
          value={String(ticket.ticket_serial)} 
          width={1.5} 
          height={50} 
          displayValue={false}
          margin={0}
        />
        <div style={{ fontSize: '14px', fontWeight: '900', marginTop: '5px' }}>
          #{ticket.ticket_serial}
        </div>
        <div style={{ fontSize: '10px', marginTop: '5px' }}>Booking Code: {ticket.booking_code}</div>
        <p style={{ fontSize: '9px', marginTop: '10px', fontStyle: 'italic' }}>~ Play Responsibly ~</p>
      </div>
    </div>
  );
}
