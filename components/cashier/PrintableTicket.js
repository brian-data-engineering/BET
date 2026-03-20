import { QRCodeSVG } from 'qrcode.react';

export default function PrintableTicket({ ticket }) {
  if (!ticket) return null;

  return (
    <div className="print-only p-4 text-black bg-white w-[80mm] font-mono text-[12px]">
      <div className="text-center border-b border-dashed border-black pb-4 mb-4">
        <h1 className="text-xl font-black italic tracking-tighter uppercase">LUCRA<span className="text-gray-600">.BET</span></h1>
        <p className="text-[10px] uppercase font-bold">Nairobi Terminal #01</p>
        <p className="text-[9px]">{new Date().toLocaleString()}</p>
      </div>

      <div className="mb-4">
        <p className="font-bold border-b border-black mb-2 uppercase text-[10px]">Selections</p>
        {ticket.selections.map((item, i) => (
          <div key={i} className="mb-2">
            <div className="flex justify-between font-bold">
              <span>{item.matchName}</span>
              <span>@{item.odds}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>Pick: {item.selection}</span>
              <span>Result</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-black pt-2 space-y-1">
        <div className="flex justify-between font-bold">
          <span>Total Odds:</span>
          <span>{ticket.total_odds}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Stake:</span>
          <span>KES {ticket.stake}</span>
        </div>
        <div className="flex justify-between text-lg font-black border-t border-black mt-2 pt-2">
          <span>POT. WIN:</span>
          <span>KES {ticket.payout}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center border-t border-dashed border-black pt-4">
        <QRCodeSVG value={ticket.id} size={100} level="H" />
        <p className="mt-2 font-black text-sm tracking-[0.3em]">{ticket.id}</p>
        <p className="text-[8px] mt-4 uppercase text-center font-bold">
          Tickets expire in 7 days. <br />
          Check status at lucra.bet/check
        </p>
      </div>
    </div>
  );
}
