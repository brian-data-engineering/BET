/**
 * components/spin/TicketPrint.js
 *
 * Standardized to match PrintableTicket.js visual identity:
 *   - 72mm thermal width
 *   - Professional black-and-white aesthetic
 *   - Grayscale logo processing
 *   - Status banners for WON/LOST
 */

import React, { useState } from 'react';
import Barcode from 'react-barcode';

const RED_NUMBERS  = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const FALLBACK_LOGO = 'https://i.ibb.co/67wb7Zm1/download.png';

function numColor(n) {
  if (n === 0)             return '#16a34a';
  if (RED_NUMBERS.has(n)) return '#dc2626';
  return '#111111';
}
function numLabel(n) {
  if (n === 0)             return 'GREEN';
  if (RED_NUMBERS.has(n)) return 'RED';
  return 'BLACK';
}
function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-KE', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}
function groupBets(arr = []) {
  return Object.values(
    arr.reduce((acc, b) => {
      if (acc[b.key]) acc[b.key] = { ...acc[b.key], amount: acc[b.key].amount + b.amount };
      else acc[b.key] = { ...b };
      return acc;
    }, {})
  );
}

// ── printTicket (Native Window Printing) ─────────────────────────────────────

export function printTicket({ ticket, payout, jackpot = 0 }) {
  const bets      = groupBets(ticket?.bets ?? []);
  const stake     = ticket?.total_stake ?? 0;
  const resolved  = !!payout;
  const won       = resolved && (payout?.amount ?? 0) > 0;
  const winNum    = payout?.winning_number;
  const serial    = ticket?.ticket_serial ?? ticket?.id ?? '00000000';
  const logoSrc   = ticket?.logo_url ?? FALLBACK_LOGO;
  const shopName  = (ticket?.shop_name ?? 'LUCRA').toUpperCase();

  const betRows = bets.map((b) => `
    <div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;border-bottom:0.2px solid #eee">
      <span>${b.label}</span>
      <span style="font-weight:900">${b.amount.toLocaleString()}</span>
    </div>`).join('');

  const winRows = (payout?.winning_labels ?? []).map((label) => `
    <div style="font-size:10px;font-weight:900;padding:2px 4px;background:#000;color:#fff;margin-top:2px;display:inline-block;margin-right:3px">
      ✓ ${label}
    </div>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Ticket — ${serial}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:monospace;font-size:12px;color:#000;background:#fff;width:72mm;margin:0 auto;padding:6mm 4mm 14mm;line-height:1.1}
  @media print{body{margin:0;padding:4mm 3mm 8mm}@page{margin:0;size:72mm auto}}
</style>
</head>
<body>

${resolved ? `
<div style="text-align:center;border:1.5px solid #000;padding:3px;margin-bottom:8px;font-weight:900;font-size:16px;letter-spacing:2px;background:${won?'#000':'#fff'};color:${won?'#fff':'#000'}">
  ${won ? '✓ WON ✓' : '✗ LOST ✗'}
</div>` : ''}

<div style="text-align:center;margin-bottom:5px">
  <img src="${logoSrc}" style="width:140px;max-height:70px;object-fit:contain;display:block;margin:0 auto 5px;filter:grayscale(1) contrast(150%)" onerror="this.src='${FALLBACK_LOGO}'"/>
  <div style="font-size:11px;font-weight:bold">SHOP: ${shopName}</div>
  <div style="font-size:9px">DATE: ${fmt(ticket?.created_at ?? new Date().toISOString())}</div>
</div>

<div style="border-top:1.5px solid #000;margin:5px 0"></div>

<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px">
  <span>Serial:</span><span style="font-weight:bold">#${serial}</span>
</div>
<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px">
  <span>Draw ID:</span><span style="font-weight:bold">${ticket?.draw_id ? `#${ticket.draw_id}` : 'PENDING'}</span>
</div>

<div style="border-top:1px dashed #000;margin:5px 0"></div>
<div style="text-align:center;font-size:10px;font-weight:bold;margin:3px 0">★ JACKPOT: ${jackpot.toLocaleString()} ★</div>
<div style="border-top:1px dashed #000;margin:5px 0"></div>

<div style="font-size:10px;font-weight:bold;text-transform:uppercase;margin:8px 0 4px">SELECTIONS</div>
<div style="margin-bottom:10px">
  ${betRows || '<div style="font-size:10px;opacity:0.5">No selections</div>'}
</div>

<div style="border-top:1.5px dashed #000;padding-top:6px">
  <div style="display:flex;justify-content:space-between;font-size:12px">
    <span>Total Stake:</span>
    <span style="font-weight:bold">KSh ${stake.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
  </div>
  
  ${resolved ? `
  <div style="text-align:center;border:1.5px solid #000;padding:6px;margin:10px 0">
    <div style="font-size:9px;text-transform:uppercase;opacity:0.6">Winning Number</div>
    <div style="font-size:36px;font-weight:900;color:${numColor(winNum)}">${winNum}</div>
    <div style="font-size:10px;font-weight:bold">${numLabel(winNum)}</div>
  </div>
  
  ${won ? `
  <div style="margin-bottom:5px">${winRows}</div>
  <div style="display:flex;justify-content:space-between;font-size:20px;font-weight:900;margin-top:6px;border-top:1.5px solid #000;padding-top:4px">
    <span>PAYOUT:</span>
    <span>${(payout?.amount??0).toLocaleString(undefined,{minimumFractionDigits:2})}</span>
  </div>
  ` : `
  <div style="text-align:center;font-size:14px;font-weight:900;opacity:0.3;margin-top:5px">-- NO PAYOUT --</div>
  `}
  ` : `
  <div style="text-align:center;border:1px dashed #aaa;padding:10px;margin:10px 0;font-size:10px;opacity:0.5;text-transform:uppercase">
    Awaiting Draw Result
  </div>
  `}
</div>

<div style="margin-top:20px;text-align:center">
  <svg id="bc"></svg>
  <div style="font-size:12px;font-weight:900;margin-top:4px">#${serial}</div>
  <div style="font-size:8px;margin-top:10px;font-style:italic;opacity:0.8;line-height:1.2">
    Play responsibly. Must be 18+.<br/>Keep this ticket as proof of bet.<br/>Valid for 30 days.
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
<script>
  window.onload = function() {
    try { JsBarcode('#bc','${serial}',{width:1.2,height:40,displayValue:false,margin:0}); } catch(e){}
    window.print();
    setTimeout(() => { window.close(); }, 500);
  };
<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=380,height=700,menubar=no,toolbar=no');
  if (!win) { alert('Allow popups for this site to print tickets.'); return; }
  win.document.write(html);
  win.document.close();
}

// ── TicketPreview (React Component) ──────────────────────────────────────────

export default function TicketPreview({ ticket, payout, jackpot = 0, onMarkPaid, onClose }) {
  const [printing, setPrinting] = useState(false);
  const [payingOut, setPayingOut] = useState(false);

  const bets      = groupBets(ticket?.bets ?? []);
  const stake     = ticket?.total_stake ?? 0;
  const resolved  = !!payout;
  const won       = resolved && (payout?.amount ?? 0) > 0;
  const winNum    = payout?.winning_number;
  const serial    = ticket?.ticket_serial ?? ticket?.id ?? '00000000';
  const logoSrc   = ticket?.logo_url ?? FALLBACK_LOGO;
  const shopName  = (ticket?.shop_name ?? 'LUCRA').toUpperCase();

  async function handlePayOut() {
    if (!onMarkPaid || !payout || payout.paid) return;
    setPayingOut(true);
    try {
      await onMarkPaid(payout.id, ticket.id, payout.amount);
    } catch(e) {
      alert(e.message);
    } finally {
      setPayingOut(false);
    }
  }

  return (
    <div className="bg-white text-black p-6 rounded-[2.5rem] shadow-2xl w-full max-w-sm mx-auto font-monospace border border-white/10" style={{ fontFamily: 'monospace' }}>
      
      {/* STATUS BANNER */}
      {resolved && (
        <div className={`text-center py-2 mb-4 font-black text-lg tracking-widest border-2 border-black ${won ? 'bg-black text-white' : 'bg-white text-black'}`}>
          {won ? '✓ WON ✓' : '✗ LOST ✗'}
        </div>
      )}

      {/* HEADER */}
      <div className="text-center mb-4">
        <img src={logoSrc} className="w-32 h-16 object-contain mx-auto mb-2 grayscale contrast-150" alt="LOGO" />
        <div className="text-xs font-black uppercase tracking-tighter">SHOP: {shopName}</div>
        <div className="text-[10px] opacity-60 mt-1">{fmt(ticket?.created_at)}</div>
      </div>

      <div className="border-t-2 border-black my-4"></div>

      {/* META */}
      <div className="space-y-1 mb-6">
        <div className="flex justify-between text-[11px]">
          <span className="opacity-50 uppercase">Serial</span>
          <span className="font-black">#{serial}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="opacity-50 uppercase">Draw ID</span>
          <span className="font-black">{ticket?.draw_id ? `#${ticket.draw_id}` : 'PENDING'}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black/20 my-4"></div>
      <div className="text-center font-black text-xs tracking-widest text-amber-600">
        ★ JACKPOT: {jackpot.toLocaleString()} ★
      </div>
      <div className="border-t border-dashed border-black/20 my-4"></div>

      {/* SELECTIONS */}
      <div className="text-[10px] font-black uppercase mb-3 tracking-widest opacity-40">Selections</div>
      <div className="space-y-2 mb-6">
        {bets.map((b) => (
          <div key={b.key} className="flex justify-between text-[11px] border-b border-black/5 pb-1">
            <span>{b.label}</span>
            <span className="font-black">{b.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* TOTALS */}
      <div className="border-t-2 border-dashed border-black pt-4">
        <div className="flex justify-between text-sm">
          <span>Total Stake:</span>
          <span className="font-black">KSh {stake.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>

        {resolved ? (
          <>
            <div className="text-center border-2 border-black rounded-2xl p-4 my-4">
              <div className="text-[10px] opacity-50 uppercase font-black">Winning Number</div>
              <div className="text-5xl font-black" style={{ color: numColor(winNum) }}>{winNum}</div>
              <div className="text-xs font-black">{numLabel(winNum)}</div>
            </div>

            {won ? (
              <>
                <div className="flex flex-wrap gap-1 mb-4">
                  {(payout?.winning_labels ?? []).map(label => (
                    <span key={label} className="bg-black text-white text-[9px] px-2 py-1 font-black uppercase">✓ {label}</span>
                  ))}
                </div>
                <div className="flex justify-between text-2xl font-black border-t-2 border-black pt-2 mt-4">
                  <span>PAYOUT:</span>
                  <span>{Number(payout?.amount || 0).toLocaleString()}</span>
                </div>
                
                {!payout.paid ? (
                  <button onClick={handlePayOut} disabled={payingOut} className="w-full bg-[#10b981] text-black font-black py-4 rounded-2xl mt-4 hover:scale-105 transition-all text-sm italic uppercase shadow-xl disabled:opacity-50">
                    {payingOut ? 'Processing...' : '💵 PAY OUT'}
                  </button>
                ) : (
                  <div className="text-center text-[#10b981] font-black uppercase mt-4 text-xs italic">
                    ✓ Paid on {fmt(payout.paid_at)}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-red-500 font-black uppercase mt-4 text-xs tracking-[0.3em] opacity-30">
                -- NO WIN --
              </div>
            )}
          </>
        ) : (
          <div className="text-center border border-dashed border-black/20 p-6 my-4 text-[10px] uppercase opacity-40 tracking-widest">
            Awaiting Draw Result
          </div>
        )}
      </div>

      {/* BARCODE */}
      <div className="mt-8 text-center">
        <div className="flex justify-center mb-2">
          <Barcode value={serial} width={1.2} height={40} displayValue={false} margin={0} />
        </div>
        <div className="font-black text-xs">#{serial}</div>
        
        <div className="flex flex-col gap-2 mt-6">
          <button 
            onClick={() => { setPrinting(true); printTicket({ ticket, payout, jackpot }); setTimeout(() => setPrinting(false), 1200); }}
            disabled={printing}
            className="w-full bg-black text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all text-xs uppercase"
          >
            {printing ? 'Opening...' : '🖨 Print Ticket'}
          </button>
          
          {onClose && (
            <button onClick={onClose} className="w-full text-black/40 font-black py-2 text-[10px] uppercase hover:text-black transition-colors">
              Close Preview
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
