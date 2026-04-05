import Barcode from 'react-barcode'; // Ensure you have this installed: npm install react-barcode

export default function PrintableTicket({ ticket }) {
  if (!ticket) return null;

  const selections = typeof ticket.selections === 'string' 
    ? JSON.parse(ticket.selections) 
    : ticket.selections;

  return (
    <div className="lucra-print-area" style={{ 
      width: '72mm', 
      padding: '4mm', 
      fontFamily: 'monospace', 
      color: 'black', 
      backgroundColor: 'white',
      fontSize: '12px'
    }}>
      {/* --- TOP HEADER --- */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ margin: '0', fontSize: '24px', fontWeight: '900' }}>LUCRA</h2>
        <div style={{ borderTop: '1px solid black', borderBottom: '1px solid black', margin: '4px 0', padding: '2px 0' }}>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>RECEIPT: {ticket.ticket_serial}</span>
        </div>
      </div>

      {/* --- SELECTIONS --- */}
      <div style={{ marginBottom: '10px' }}>
        {selections?.map((sel, idx) => (
          <div key={idx} style={{ 
            border: '1px solid black', 
            marginBottom: '4px', 
            padding: '4px' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span>{sel.league || 'SOCCER'}</span>
              <span>ID: {sel.event_id || '---'}</span>
            </div>
            <div style={{ fontWeight: 'bold', margin: '2px 0' }}>{sel.event_name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{sel.market_name}: {sel.selection_name}</span>
              <span style={{ fontWeight: 'bold' }}>{sel.odds}</span>
            </div>
          </div>
        ))}
      </div>

      {/* --- TOTALS --- */}
      <div style={{ borderTop: '2px dashed black', paddingTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Odds:</span>
          <span style={{ fontWeight: 'bold' }}>{ticket.total_odds}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Stake:</span>
          <span style={{ fontWeight: 'bold' }}>{ticket.stake} KSh</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '900', marginTop: '4px' }}>
          <span>PAYOUT:</span>
          <span>{ticket.potential_payout || ticket.payout} KSh</span>
        </div>
      </div>

      {/* --- BARCODE SECTION --- */}
      <div style={{ 
        marginTop: '15px', 
        textAlign: 'center', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        width: '100%' 
      }}>
        <Barcode 
          value={ticket.ticket_serial || "0000000000"} 
          width={1.5} 
          height={50} 
          fontSize={12}
          margin={0}
          background="transparent"
        />
        <p style={{ marginTop: '5px', fontSize: '10px', fontWeight: 'bold' }}>
          VALID FOR 30 DAYS
        </p>
      </div>
    </div>
  );
}
