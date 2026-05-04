/**
 * pages/cashier/spin.jsx  (or components/cashier/CashierSpin.jsx)
 *
 * Doc-6 game visuals — unchanged pixel-for-pixel.
 * The only additions vs doc-6:
 *   1. CashierLayout wraps everything (gives left nav + login redirect)
 *   2. submitTicket() replaces the old local spin() — calls process_roulette_payment RPC
 *   3. 🖨 button calls printTicket() with live ticket + payout data
 *   4. 💵 PAY OUT button in the result panel calls markPaid() → execute_roulette_payout RPC
 *   5. Countdown uses currentDraw.ends_at from spin_draws (real time)
 *   6. Result is driven by Realtime on spin_draws — no local Math.random()
 */

import React, { useEffect, useState } from 'react';
import { useCashierRoulette } from '../../lib/useCashierRoulette';
import { printTicket } from '../../components/spin/Ticketprint';
import CashierLayout from '../../components/cashier/CashierLayout';

// ── All constants identical to doc 6 ─────────────────────────────────────────

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];
const CHIPS = [20, 50, 100, 500];
const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const NUMBER_ORDER = Array.from({ length: 37 }, (_, i) => i);
const SUIT_PARTICLES = [
  { suit:'♠', className:'casino-watermark__particle--1'  },
  { suit:'♣', className:'casino-watermark__particle--2'  },
  { suit:'♦', className:'casino-watermark__particle--3'  },
  { suit:'♥', className:'casino-watermark__particle--4'  },
  { suit:'♠', className:'casino-watermark__particle--5'  },
  { suit:'♣', className:'casino-watermark__particle--6'  },
  { suit:'♦', className:'casino-watermark__particle--7'  },
  { suit:'♥', className:'casino-watermark__particle--8'  },
  { suit:'♠', className:'casino-watermark__particle--9'  },
  { suit:'♣', className:'casino-watermark__particle--10' },
  { suit:'♦', className:'casino-watermark__particle--11' },
  { suit:'♥', className:'casino-watermark__particle--12' },
  { suit:'♠', className:'casino-watermark__particle--13' },
  { suit:'♣', className:'casino-watermark__particle--14' },
  { suit:'♦', className:'casino-watermark__particle--15' },
  { suit:'♥', className:'casino-watermark__particle--16' },
];
const SECTOR_MAP = {
  A:[32,15,19,4,21,2], B:[25,17,34,6,27,13], C:[36,11,30,8,23,10],
  D:[5,24,16,33,1,20], E:[14,31,9,22,18,29], F:[7,28,12,35,3,26,0],
};
const SPECIAL_BETS = [
  { key:'twins',        label:'Twins: 11, 22, 33',            type:'fixed', numbers:[11,22,33],                    payout:12 },
  { key:'mirror-12-21',label:'Mirror: 12, 21',                type:'fixed', numbers:[12,21],                       payout:18 },
  { key:'mirror-13-31',label:'Mirror: 13, 31',                type:'fixed', numbers:[13,31],                       payout:18 },
  { key:'mirror-23-32',label:'Mirror: 23, 32',                type:'fixed', numbers:[23,32],                       payout:18 },
  { key:'high-red',    label:'Low/High Color: HIGH RED',       type:'fixed', numbers:[19,21,23,25,27,30,32,34,36], payout:4  },
  { key:'high-black',  label:'Low/High Color: HIGH BLACK',     type:'fixed', numbers:[20,22,24,26,28,29,31,33,35], payout:4  },
  { key:'low-red',     label:'Low/High Color: LOW RED',        type:'fixed', numbers:[1,3,5,7,9,12,14,16,18],      payout:4  },
  { key:'low-black',   label:'Low/High Color: LOW BLACK',      type:'fixed', numbers:[2,4,6,8,10,11,13,15,17],     payout:4  },
];

function chipTone(a) {
  if (a>=500) return { base:'#d3a318', edge:'#fff4bf', dark:'#8a6200' };
  if (a>=100) return { base:'#c774bf', edge:'#ffe6ff', dark:'#7f3a76' };
  if (a>=50)  return { base:'#44b244', edge:'#e2ffe2', dark:'#1e6b1f' };
  return              { base:'#2f87dc', edge:'#deefff', dark:'#0d4f9d' };
}

function buildChip(amount, compact=false) {
  const tone = chipTone(amount);
  return (
    <div className={`chip-token ${compact?'chip-token--compact':''}`}
      style={{ '--chip-base':tone.base, '--chip-edge':tone.edge, '--chip-dark':tone.dark }}>
      <div className="chip-token__outer">
        {Array.from({length:12}).map((_,i)=>(
          <span key={i} className="chip-token__mark" style={{transform:`translate(-50%,-50%) rotate(${i*30}deg)`}} />
        ))}
      </div>
      <div className="chip-token__inner">
        <span>{amount>=1000?`${Math.round(amount/1000)}k`:amount}</span>
      </div>
    </div>
  );
}

function wheelNeighbours(center, spread=2) {
  const index = WHEEL_ORDER.indexOf(center);
  if (index===-1) return [center];
  const nums=[];
  for (let o=-spread;o<=spread;o++) nums.push(WHEEL_ORDER[(index+o+WHEEL_ORDER.length)%WHEEL_ORDER.length]);
  return [...new Set(nums)].sort((a,b)=>a-b);
}

function rouletteDefinitions() {
  const defs={};
  const sn=(c)=>[ROWS[2][c],ROWS[1][c],ROWS[0][c]].sort((a,b)=>a-b);
  const sl=(c)=>[...sn(c),...sn(c+1)].sort((a,b)=>a-b);
  for(let i=0;i<=36;i++) defs[`num-${i}`]={key:`num-${i}`,label:`Number: ${i}`,type:'single',numbers:[i],payout:36};
  defs['dozen-1-12'] ={key:'dozen-1-12', label:'Dozen: 1 - 12', type:'group',numbers:Array.from({length:12},(_,i)=>i+1), payout:3};
  defs['dozen-13-24']={key:'dozen-13-24',label:'Dozen: 13 - 24',type:'group',numbers:Array.from({length:12},(_,i)=>i+13),payout:3};
  defs['dozen-25-36']={key:'dozen-25-36',label:'Dozen: 25 - 36',type:'group',numbers:Array.from({length:12},(_,i)=>i+25),payout:3};
  defs['column-1']={key:'column-1',label:'Column: III',type:'group',numbers:ROWS[0],payout:3};
  defs['column-2']={key:'column-2',label:'Column: II', type:'group',numbers:ROWS[1],payout:3};
  defs['column-3']={key:'column-3',label:'Column: I',  type:'group',numbers:ROWS[2],payout:3};
  defs.low  ={key:'low',  label:'Low: 1 TO 18', type:'group',numbers:Array.from({length:18},(_,i)=>i+1),      payout:2};
  defs.even ={key:'even', label:'Even',          type:'group',numbers:Array.from({length:18},(_,i)=>(i+1)*2),  payout:2};
  defs.red  ={key:'red',  label:'Color: Red',    type:'group',numbers:Array.from(RED_NUMBERS),                  payout:2};
  defs.black={key:'black',label:'Color: Black',  type:'group',numbers:Array.from({length:36},(_,i)=>i+1).filter(n=>!RED_NUMBERS.has(n)),payout:2};
  defs.odd  ={key:'odd',  label:'Odd',           type:'group',numbers:Array.from({length:18},(_,i)=>i*2+1),    payout:2};
  defs.high ={key:'high', label:'High: 19 TO 36',type:'group',numbers:Array.from({length:18},(_,i)=>i+19),     payout:2};
  defs.basket     ={key:'basket',     label:'Basket: 0, 1, 2, 3',type:'group',numbers:[0,1,2,3],payout:9};
  defs['split-0-1']={key:'split-0-1',label:'Split: 0, 1',type:'group',numbers:[0,1],payout:18};
  defs['split-0-2']={key:'split-0-2',label:'Split: 0, 2',type:'group',numbers:[0,2],payout:18};
  defs['split-0-3']={key:'split-0-3',label:'Split: 0, 3',type:'group',numbers:[0,3],payout:18};
  defs['trio-0-1-2']={key:'trio-0-1-2',label:'Trio: 0, 1, 2',type:'group',numbers:[0,1,2],payout:12};
  defs['trio-0-2-3']={key:'trio-0-2-3',label:'Trio: 0, 2, 3',type:'group',numbers:[0,2,3],payout:12};
  WHEEL_ORDER.forEach(center=>{const numbers=wheelNeighbours(center);defs[`neighbors-${center}`]={key:`neighbors-${center}`,label:`Neighbours ${center}: ${numbers.join(', ')}`,type:'group',numbers,payout:7};});
  for(let c=0;c<12;c++){const s=sn(c);defs[`street-${s.join('-')}`]={key:`street-${s.join('-')}`,label:`Street: ${s.join(', ')}`,type:'group',numbers:s,payout:12};}
  for(let c=0;c<11;c++){const s=sl(c);defs[`sixline-${s.join('-')}`]={key:`sixline-${s.join('-')}`,label:`Six Line: ${s.join(', ')}`,type:'group',numbers:s,payout:6};}
  for(let r=0;r<3;r++){for(let c=0;c<12;c++){const cur=ROWS[r][c];
    if(c<11){const h=[cur,ROWS[r][c+1]].sort((a,b)=>a-b);defs[`split-${h.join('-')}`]={key:`split-${h.join('-')}`,label:`Split: ${h.join(', ')}`,type:'group',numbers:h,payout:18};}
    if(r<2) {const v=[cur,ROWS[r+1][c]].sort((a,b)=>a-b);defs[`split-${v.join('-')}`]={key:`split-${v.join('-')}`,label:`Split: ${v.join(', ')}`,type:'group',numbers:v,payout:18};}
    if(r<2&&c<11){const k=[cur,ROWS[r][c+1],ROWS[r+1][c],ROWS[r+1][c+1]].sort((a,b)=>a-b);defs[`corner-${k.join('-')}`]={key:`corner-${k.join('-')}`,label:`Corner: ${k.join(', ')}`,type:'group',numbers:k,payout:9};}
  }}
  Object.entries(SECTOR_MAP).forEach(([s,numbers])=>{defs[`sector-${s}`]={key:`sector-${s}`,label:`Sector: ${s}`,type:'group',numbers,payout:6};});
  SPECIAL_BETS.forEach(b=>{defs[b.key]=b;});
  for(let d=0;d<=9;d++){defs[`final-${d}`]={key:`final-${d}`,label:`Finals: ${d}`,type:'group',numbers:Array.from({length:37},(_,n)=>n).filter(n=>n%10===d),payout:d===0?9:12};}
  return defs;
}
const BET_DEFS=rouletteDefinitions();

function getBoardNumberClass(num){if(num===0)return 'bg-[#05c300] text-white';return RED_NUMBERS.has(num)?'bg-[#ff1710] text-white':'bg-[#050505] text-white';}
function getNeighborNumberClass(num){if(num===0)return 'bg-[#05c300]/80 text-white';return RED_NUMBERS.has(num)?'bg-[#ff1710]/80 text-white':'bg-[#050505]/80 text-white';}

function BoardButton({children,className,onClick,chip}){
  return(<button type="button" onClick={onClick} className={`relative ${className}`}>{children}{chip?<div className="board-chip">{buildChip(chip,true)}</div>:null}</button>);
}

function NumberCell({num,rowIndex,colIndex,row,betMap,placeBet}){
  const hk=colIndex<11?`split-${[num,row[colIndex+1]].sort((a,b)=>a-b).join('-')}`:null;
  const vk=rowIndex<2?`split-${[num,ROWS[rowIndex+1][colIndex]].sort((a,b)=>a-b).join('-')}`:null;
  const ck=rowIndex<2&&colIndex<11?`corner-${[num,row[colIndex+1],ROWS[rowIndex+1][colIndex],ROWS[rowIndex+1][colIndex+1]].sort((a,b)=>a-b).join('-')}`:null;
  const street=[ROWS[2][colIndex],ROWS[1][colIndex],ROWS[0][colIndex]].sort((a,b)=>a-b);
  const sk=`street-${street.join('-')}`;
  const sixLine=colIndex<11?[ROWS[2][colIndex],ROWS[1][colIndex],ROWS[0][colIndex],ROWS[2][colIndex+1],ROWS[1][colIndex+1],ROWS[0][colIndex+1]].sort((a,b)=>a-b):null;
  const slk=sixLine?`sixline-${sixLine.join('-')}`:null;
  return(
    <div className="relative">
      <BoardButton onClick={()=>placeBet(`num-${num}`)} chip={betMap[`num-${num}`]?.amount} className={`h-[68px] w-full rounded-[4px] border-2 border-white/85 text-[1.2rem] font-black ${getBoardNumberClass(num)}`}>{num}</BoardButton>
      {hk&&<button type="button" onClick={()=>placeBet(hk)} className="inside-hotspot inside-hotspot--vertical right-[-5px] top-[14px] h-[40px] w-[10px]">{betMap[hk]?.amount?<div className="inside-hotspot-chip">{buildChip(betMap[hk].amount,true)}</div>:null}</button>}
      {vk&&<button type="button" onClick={()=>placeBet(vk)} className="inside-hotspot inside-hotspot--horizontal bottom-[-5px] left-[14px] h-[10px] w-[40px]">{betMap[vk]?.amount?<div className="inside-hotspot-chip">{buildChip(betMap[vk].amount,true)}</div>:null}</button>}
      {ck&&<button type="button" onClick={()=>placeBet(ck)} className="inside-hotspot inside-hotspot--corner bottom-[-8px] right-[-8px] h-[16px] w-[16px] rounded-full">{betMap[ck]?.amount?<div className="inside-hotspot-chip">{buildChip(betMap[ck].amount,true)}</div>:null}</button>}
      {rowIndex===0&&<button type="button" onClick={()=>placeBet(sk)} className="inside-hotspot inside-hotspot--street top-[-5px] left-[7px] h-[10px] w-[54px] rounded-[3px]">{betMap[sk]?.amount?<div className="inside-hotspot-chip">{buildChip(betMap[sk].amount,true)}</div>:null}</button>}
      {rowIndex===2&&<button type="button" onClick={()=>placeBet(sk)} className="inside-hotspot inside-hotspot--street bottom-[-5px] left-[7px] h-[10px] w-[54px] rounded-[3px]">{betMap[sk]?.amount?<div className="inside-hotspot-chip">{buildChip(betMap[sk].amount,true)}</div>:null}</button>}
      {rowIndex===2&&slk&&<button type="button" onClick={()=>placeBet(slk)} className="inside-hotspot inside-hotspot--sixline bottom-[-5px] right-[-6px] h-[10px] w-[12px] rounded-[3px]">{betMap[slk]?.amount?<div className="inside-hotspot-chip">{buildChip(betMap[slk].amount,true)}</div>:null}</button>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CashierSpin() {
  const [mounted, setMounted]             = useState(false);
  const [viewMode, setViewMode]           = useState('deluxe');
  const [clockLabel, setClockLabel]       = useState('00:00');
  const [spinCountdown, setSpinCountdown] = useState(59);

  const roulette = useCashierRoulette({ terminalId: 'T1' });
  const {
    betMap, betEntries, totalStake, maxTotalWin,
    selectedChip, setSelectedChip,
    placeBet: hookPlaceBet, undoBet, clearBets, doubleBets, removeBet,
    phase, submitTicket, startNextRound,
    lastResult, jackpot, cashierId, lastPayout, sessionTickets, currentDraw,
    markPaid,
  } = roulette;

  const placeBet = (key) => {
    if (phase !== 'BETTING') return;
    const def = BET_DEFS[key];
    if (!def) return;
    hookPlaceBet(def);
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    const t = setInterval(() => setClockLabel(new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})), 1000);
    return () => clearInterval(t);
  }, [mounted]);

  // Countdown from spin_draws.ends_at (real draw) or local fallback
  useEffect(() => {
    if (!mounted || phase !== 'BETTING') return;
    if (currentDraw?.ends_at) {
      const tick = () => setSpinCountdown(Math.max(0, Math.floor((new Date(currentDraw.ends_at) - Date.now()) / 1000)));
      tick();
      const t = setInterval(tick, 1000);
      return () => clearInterval(t);
    }
    const t = setInterval(() => setSpinCountdown((p) => p <= 0 ? 59 : p - 1), 1000);
    return () => clearInterval(t);
  }, [phase, mounted, currentDraw?.ends_at]);

  // Auto-advance RESULT → BETTING
  useEffect(() => {
    if (phase !== 'RESULT') return;
    const t = window.setTimeout(() => { startNextRound(); setSpinCountdown(59); }, 2200);
    return () => window.clearTimeout(t);
  }, [phase, startNextRound]);

  const lastTicket  = sessionTickets[0] ?? null;
  const timerText   = phase === 'SPINNING' ? '00:03' : `00:${String(spinCountdown).padStart(2,'0')}`;
  const isTableView = viewMode === 'table';

  return (
    <CashierLayout>
      <div className="roulette-cashier flex min-h-full bg-black text-white">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative flex-1 overflow-hidden bg-[linear-gradient(180deg,#214c40_0%,#163831_100%)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_8%,rgba(164,14,14,0.58),transparent_18%),radial-gradient(circle_at_18%_28%,rgba(255,255,255,0.06),transparent_20%)]" />

            {/* Watermark — identical to doc 6 */}
            <div className="casino-watermark" aria-hidden="true">
              <div className="casino-watermark__chip casino-watermark__chip--left"><span className="casino-watermark__chip-core"/></div>
              <div className="casino-watermark__chip casino-watermark__chip--right"><span className="casino-watermark__chip-core"/></div>
              <div className="casino-watermark__card casino-watermark__card--back"/>
              <div className="casino-watermark__card casino-watermark__card--front">
                <span className="casino-watermark__card-rank casino-watermark__card-rank--tl">A</span>
                <span className="casino-watermark__card-suit">♠</span>
                <span className="casino-watermark__card-rank casino-watermark__card-rank--br">A</span>
              </div>
              <div className="casino-watermark__particles">
                {SUIT_PARTICLES.map(item=>(
                  <span key={item.className} className={`casino-watermark__particle ${item.className}`}>{item.suit}</span>
                ))}
              </div>
            </div>

            <div className="relative flex h-full flex-col px-7 pb-4 pt-3">
              {/* Header */}
              <div className="flex items-start gap-8">
                <div className="ml-auto flex items-start gap-4">
                  <div className="flex overflow-hidden bg-[#f5b300] shadow-[0_3px_10px_rgba(0,0,0,0.25)]">
                    <div className="px-4 py-2 text-center font-black uppercase leading-none text-white">
                      <div className="text-[14px]">GOLD</div><div className="text-[14px]">JACKPOT</div>
                    </div>
                    <div className="px-5 py-2 text-[28px] font-black text-white">{jackpot} KSh</div>
                  </div>
                  <div className={`flex h-[74px] w-[168px] -translate-y-3 items-center justify-center rounded-[8px] border-[4px] ${phase==='BETTING'?'border-white':'border-[#ff1710]'} bg-black shadow-[0_6px_16px_rgba(0,0,0,0.38)]`}>
                    <div className="text-center">
                      <div className="text-[28px] font-black tracking-[0.08em] text-white">{timerText}</div>
                      <div className="mt-[2px] text-[14px] font-black text-[#ff1710]">{mounted?clockLabel:'00:00'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Board + Sectors */}
              <div className={`${isTableView?'mt-8':'-mt-12'} grid min-h-0 flex-1 ${isTableView?'grid-cols-1':'grid-cols-[minmax(0,1fr)_410px]'} gap-9`}>
                <div className={`min-w-0 ${isTableView?'mx-auto w-full max-w-[1380px]':''}`}>
                  <div className="rounded-[12px]">
                    <div className={`w-full select-none ${isTableView?'cashier-table-zoom':''}`}>
                      {/* Dozens */}
                      <div className={`grid grid-cols-3 gap-[4px] pl-[76px] ${isTableView?'mx-auto max-w-[1120px]':''}`}>
                        {[{key:'dozen-1-12',label:'1 - 12'},{key:'dozen-13-24',label:'13 - 24'},{key:'dozen-25-36',label:'25 - 36'}].map(item=>(
                          <BoardButton key={item.key} onClick={()=>placeBet(item.key)} chip={betMap[item.key]?.amount} className="h-[48px] rounded-[4px] border-2 border-white/80 bg-[rgba(31,67,57,0.55)] text-[1.05rem] font-black">{item.label}</BoardButton>
                        ))}
                      </div>
                      {/* Main grid */}
                      <div className={`mt-[6px] grid grid-cols-[72px_minmax(0,1fr)] gap-[4px] ${isTableView?'mx-auto max-w-[1120px]':''}`}>
                        <div className="relative min-h-[208px]">
                          <BoardButton onClick={()=>placeBet('num-0')} chip={betMap['num-0']?.amount} className="min-h-[208px] w-full rounded-[4px] border-2 border-white/90 bg-[#05c300] text-[3rem] font-black">0</BoardButton>
                          {[['split-0-3','right-[-6px] top-[26px] h-[12px] w-[12px] rounded-[3px]','inside-hotspot--zero'],['trio-0-2-3','right-[-8px] top-[60px] h-[14px] w-[16px] rounded-[3px]','inside-hotspot--trio'],['split-0-2','right-[-6px] top-[98px] h-[12px] w-[12px] rounded-[3px]','inside-hotspot--zero'],['trio-0-1-2','right-[-8px] bottom-[60px] h-[14px] w-[16px] rounded-[3px]','inside-hotspot--trio'],['split-0-1','right-[-6px] bottom-[26px] h-[12px] w-[12px] rounded-[3px]','inside-hotspot--zero']].map(([key,pos,cls])=>(
                            <button key={key} type="button" onClick={()=>placeBet(key)} className={`inside-hotspot ${cls} ${pos}`}>{betMap[key]?.amount?<div className="inside-hotspot-chip">{buildChip(betMap[key].amount,true)}</div>:null}</button>
                          ))}
                          {betMap.basket?.amount?<div className="basket-chip">{buildChip(betMap.basket.amount,true)}</div>:null}
                          <button type="button" onClick={()=>placeBet('basket')} className="basket-hotspot">B</button>
                        </div>
                        <div className="grid gap-[4px]">
                          {ROWS.map((row,rowIndex)=>(
                            <div key={rowIndex} className="grid grid-cols-[repeat(12,minmax(0,1fr))_72px] gap-[4px]">
                              {row.map((num,colIndex)=>(
                                <NumberCell key={num} num={num} rowIndex={rowIndex} colIndex={colIndex} row={row} betMap={betMap} placeBet={placeBet}/>
                              ))}
                              <BoardButton onClick={()=>placeBet(`column-${rowIndex+1}`)} chip={betMap[`column-${rowIndex+1}`]?.amount} className="flex h-[68px] flex-col items-center justify-center rounded-[4px] border-2 border-white/80 bg-[rgba(31,67,57,0.55)] text-[0.86rem] font-black">
                                <span>2 TO 1</span><span>{rowIndex===0?'III':rowIndex===1?'II':'I'}</span>
                              </BoardButton>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Outside bets */}
                      <div className={`mt-[6px] grid grid-cols-6 gap-[4px] pl-[76px] ${isTableView?'mx-auto max-w-[1120px]':''}`}>
                        {[{key:'low',label:'1 TO 18'},{key:'even',label:'EVEN'},{key:'red',diamond:'red'},{key:'black',diamond:'black'},{key:'odd',label:'ODD'},{key:'high',label:'19 TO 36'}].map(item=>(
                          <BoardButton key={item.key} onClick={()=>placeBet(item.key)} chip={betMap[item.key]?.amount} className="flex h-[48px] items-center justify-center rounded-[4px] border-2 border-white/80 bg-[rgba(31,67,57,0.55)] text-[1rem] font-black">
                            {item.diamond?<span className={`h-[24px] w-[48px] clip-diamond border border-white/70 ${item.diamond==='red'?'bg-[#ff1710]':'bg-[#050505]'}`}/>:item.label}
                          </BoardButton>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Deluxe extras */}
                  {!isTableView?(
                    <div className="deluxe-zoom-enter mt-6 grid grid-cols-[74px_minmax(0,1fr)] gap-4">
                      <div className="cashier-deluxe-side">Deluxe</div>
                      <div>
                        <div className="grid grid-cols-2 gap-x-14 gap-y-4">
                          <div>
                            <div className="mb-2 text-[18px] font-black uppercase text-[#ffbf00]">TWINS</div>
                            <BoardButton onClick={()=>placeBet('twins')} chip={betMap.twins?.amount} className="h-[64px] w-[196px] rounded-[4px] border-2 border-white/80 bg-[rgba(25,44,39,0.6)] text-[1.05rem] font-black">11 | 22 | 33</BoardButton>
                          </div>
                          <div>
                            <div className="mb-2 text-[18px] font-black uppercase text-[#ffbf00]">MIRROR</div>
                            <div className="flex gap-4">
                              {[{key:'mirror-12-21',label:'12 | 21'},{key:'mirror-13-31',label:'13 | 31'},{key:'mirror-23-32',label:'23 | 32'}].map(item=>(
                                <BoardButton key={item.key} onClick={()=>placeBet(item.key)} chip={betMap[item.key]?.amount} className="h-[64px] w-[128px] rounded-[4px] border-2 border-white/80 bg-[rgba(25,44,39,0.6)] text-[1.05rem] font-black">{item.label}</BoardButton>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="mt-5">
                          <div className="mb-2 text-[18px] font-black uppercase text-[#ffbf00]">FINALS</div>
                          <div className="grid grid-cols-10 gap-4">
                            {Array.from({length:10},(_,i)=>i).map(i=>(
                              <BoardButton key={i} onClick={()=>placeBet(`final-${i}`)} chip={betMap[`final-${i}`]?.amount} className="h-[64px] rounded-[4px] border-2 border-white/80 bg-[rgba(25,44,39,0.52)] text-[1.1rem] font-black">{i}</BoardButton>
                            ))}
                          </div>
                        </div>
                        <div className="mt-5">
                          <div className="mb-1 text-[15px] font-black uppercase text-[#ffbf00]">NEIGHBOURS</div>
                          <div className="grid grid-cols-10 gap-[3px]">
                            {NUMBER_ORDER.map(center=>(
                              <BoardButton key={center} onClick={()=>placeBet(`neighbors-${center}`)} chip={betMap[`neighbors-${center}`]?.amount} className={`h-[34px] rounded-[3px] border border-white/75 px-1 text-[0.78rem] font-black ${getNeighborNumberClass(center)}`}>{center}</BoardButton>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ):null}

                  {/* Bottom controls */}
                  <div className={`${isTableView?'mt-16 gap-5':'mt-8 gap-10'} flex items-end justify-between`}>
                    <div className="flex items-end gap-5">
                      <div className="casinochip-container">
                        {CHIPS.map(chip=>(
                          <button key={chip} type="button" onClick={()=>setSelectedChip(chip)} className={`chip-select ${selectedChip===chip?'chip-select--active':''}`}>{buildChip(chip)}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex overflow-hidden rounded-[16px] border-2 border-[#f1b400] bg-[#163a30]">
                        <button type="button" onClick={()=>setViewMode('table')} className={`px-16 py-5 text-[21px] font-black ${isTableView?'bg-[#f1b400] text-black':'text-[#f7c946]'}`}>Table</button>
                        <button type="button" onClick={()=>setViewMode('deluxe')} className={`px-16 py-5 text-[21px] font-black ${isTableView?'text-[#f7c946]':'bg-[#f1b400] text-black'}`}>Deluxe</button>
                      </div>
                      <div className="flex gap-4">
                        <button type="button" onClick={doubleBets} className="action-btn">2x</button>
                        <button type="button" onClick={undoBet}    className="action-btn">⟳</button>
                        <button type="button" onClick={clearBets}  className="action-btn">×</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sectors panel */}
                {!isTableView?(
                  <div className="deluxe-zoom-enter mt-10 flex flex-col items-center">
                    <div className="mt-8 w-[370px] rounded-full border border-transparent">
                      <div className="relative mx-auto h-[360px] w-[360px]">
                        {Object.keys(SECTOR_MAP).map((sector,index)=>{
                          const positions=['left-[188px] top-0','right-0 top-[84px]','right-[44px] bottom-[24px]','left-[96px] bottom-0','left-0 top-[84px]','left-[84px] top-[24px]'];
                          return(
                            <button key={sector} type="button" onClick={()=>placeBet(`sector-${sector}`)} className={`absolute ${positions[index]} flex h-[132px] w-[132px] items-center justify-center rounded-full border-4 border-white/85 bg-[rgba(23,58,48,0.55)] text-[2.2rem] font-black`}>
                              {sector}
                              {betMap[`sector-${sector}`]?.amount?<div className="board-chip">{buildChip(betMap[`sector-${sector}`].amount,true)}</div>:null}
                            </button>
                          );
                        })}
                        <div className="absolute left-1/2 top-1/2 flex h-[184px] w-[184px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[14px] border-[#f6b11d] bg-[rgba(24,67,55,0.88)] text-[1.25rem] font-black uppercase text-[#ffbf00] shadow-[inset_0_0_0_4px_#ffe4a3]">SECTORS</div>
                      </div>
                    </div>
                    <div className="mt-9 flex w-full justify-between px-14">
                      {[{key:'high-red',label:'HIGH',tone:'red'},{key:'high-black',label:'HIGH',tone:'black'}].map(item=>(
                        <BoardButton key={item.key} onClick={()=>placeBet(item.key)} chip={betMap[item.key]?.amount} className={`hex-btn ${item.tone==='red'?'hex-btn--red':'hex-btn--black'}`}>{item.label}</BoardButton>
                      ))}
                    </div>
                    <div className="mt-7 text-[20px] font-black uppercase text-[#ffbf00]">LOW/HIGH COLOR</div>
                    <div className="mt-6 flex w-full justify-between px-14">
                      {[{key:'low-red',label:'LOW',tone:'red'},{key:'low-black',label:'LOW',tone:'black'}].map(item=>(
                        <BoardButton key={item.key} onClick={()=>placeBet(item.key)} chip={betMap[item.key]?.amount} className={`hex-btn ${item.tone==='red'?'hex-btn--red':'hex-btn--black'}`}>{item.label}</BoardButton>
                      ))}
                    </div>

                    {/* Result panel + PAY OUT button */}
                    {lastResult?(
                      <div className="mt-8 w-full rounded-xl border border-white/15 bg-black/25 px-6 py-4 text-center">
                        <div className="text-[11px] font-black uppercase tracking-[0.25em] text-white/55">Winning Number</div>
                        <div className={`mt-1 text-5xl font-black ${lastResult.winningNumber===0?'text-[#45ff72]':RED_NUMBERS.has(lastResult.winningNumber)?'text-[#ff5757]':'text-white'}`}>{lastResult.winningNumber}</div>
                        <div className={`mt-2 text-sm font-black ${lastResult.payout>0?'text-[#59ea88]':'text-white/55'}`}>
                          {lastResult.payout>0?`Win: ${lastResult.payout} KSh`:'No win'}
                        </div>
                        {/* PAY OUT — calls execute_roulette_payout via markPaid */}
                        {lastResult.payout>0 && lastPayout && !lastPayout.paid && (
                          <button
                            onClick={()=>markPaid(lastPayout.id, lastPayout.ticket_id, lastPayout.amount)}
                            className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-sm font-black uppercase tracking-widest text-white hover:bg-emerald-500 transition-colors">
                            💵 PAY OUT {lastResult.payout.toLocaleString()} KSh
                          </button>
                        )}
                        {lastPayout?.paid && (
                          <div className="mt-3 text-[11px] font-bold text-emerald-400 uppercase tracking-widest">✓ Paid</div>
                        )}
                      </div>
                    ):null}
                  </div>
                ):null}
              </div>
            </div>
          </div>
        </div>

        {/* ── FASTBET sidebar — identical to doc 6 ── */}
        <aside className="w-[420px] shrink-0 border-l border-white/10 bg-[#050505] shadow-[-12px_0_28px_rgba(0,0,0,0.3)]">
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 bg-[linear-gradient(180deg,#1d1d1d_0%,#090909_100%)] px-4 py-3 text-center text-[18px] font-black uppercase tracking-[0.22em] text-[#d8d8d8]">FASTBET</div>
            {betEntries.length===0?(
              <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_58%)]">
                <div className="text-center text-white/20">
                  <div className="text-[92px] font-black leading-none">+</div>
                  <div className="mt-2 text-[17px] uppercase tracking-[0.14em]">Place a bet to begin</div>
                </div>
              </div>
            ):(
              <>
                <div className="grid grid-cols-[minmax(0,1fr)_72px_70px_34px] border-b border-white/10 bg-[linear-gradient(180deg,#741313_0%,#430808_100%)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-white/92">
                  <div>Selection</div><div className="text-center">Odds</div><div className="text-center">Stake</div><div/>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#141414_0%,#090909_100%)]">
                  {betEntries.map((bet,index)=>(
                    <div key={bet.key} className={`grid grid-cols-[minmax(0,1fr)_72px_70px_34px] items-center border-b border-white/8 px-3 py-2 ${index%2===0?'bg-white/[0.03]':'bg-white/[0.06]'}`}>
                      <div className="truncate pr-2 text-[11px] font-bold text-white/92">{bet.label}</div>
                      <div className="text-center text-[11px] font-black text-white/80">{bet.payout.toFixed(2)}</div>
                      <div className="flex justify-center"><div className="min-w-[54px] rounded border border-white/15 bg-black/55 px-2 py-1 text-right text-[11px] font-black text-[#f2d48c] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">{bet.amount}</div></div>
                      <div className="flex justify-center"><button type="button" onClick={()=>removeBet(bet.key)} className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-[#4d0b0b] text-[18px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">×</button></div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-auto">
              <div className="border-t border-white/10 bg-[#121212] px-4 py-3 text-[11px] font-black text-white/82">
                <div className="flex items-center justify-between"><span className="uppercase tracking-[0.08em] text-white/55">Potential Min Win</span><span>{Math.max(Math.round(totalStake*0.05),0)} KSh</span></div>
                <div className="mt-1 flex items-center justify-between"><span className="uppercase tracking-[0.08em] text-white/55">Potential Max Win</span><span className="text-[#f0cd7b]">{maxTotalWin} KSh</span></div>
              </div>
              <div className="bg-[linear-gradient(180deg,#831515_0%,#540909_100%)] px-4 py-3 text-[11px] font-black text-white">
                <div className="flex items-center justify-between"><span className="uppercase tracking-[0.08em] text-white/72">Total Stake</span><span className="text-[13px]">{totalStake} KSh</span></div>
                <div className="mt-1 flex items-center justify-between"><span className="uppercase tracking-[0.08em] text-white/72">Max Total Win</span><span className="text-[13px] text-[#ffe29b]">{maxTotalWin} KSh</span></div>
              </div>
              <div className="grid grid-cols-5 border-t border-white/10 bg-[#090909]">
                <button type="button" onClick={clearBets} className="footer-btn footer-btn--red">🗑</button>
                <button type="button" className="footer-btn footer-btn--amber">🧾</button>
                <button type="button" onClick={submitTicket} disabled={phase!=='BETTING'||totalStake===0} className="footer-btn footer-btn--cyan disabled:opacity-40">$</button>
                <button type="button" onClick={startNextRound} className="footer-btn footer-btn--lime">↻</button>
                <button type="button" onClick={()=>printTicket({ticket:lastTicket,payout:lastPayout,jackpot})} className="footer-btn footer-btn--green">🖨</button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* All CSS identical to doc 6 */}
      <style jsx global>{`
        .cashier-deluxe-side{font-family:Georgia,serif;font-size:4.4rem;font-style:italic;line-height:1;color:#c59c42;text-shadow:0 3px 8px rgba(0,0,0,0.42);transform:rotate(-90deg);transform-origin:center;margin-top:100px}
        .cashier-table-zoom{transform:scale(1.12);transform-origin:top center;transition:transform 240ms ease}
        .casino-watermark{position:absolute;left:50%;top:52%;display:flex;height:560px;width:620px;transform:translate(-50%,-50%) rotate(-18deg);align-items:center;justify-content:center;pointer-events:none;opacity:0.2}
        .casino-watermark__chip{position:absolute;border-radius:9999px;border:14px solid rgba(255,239,199,0.19);box-shadow:inset 0 0 0 3px rgba(255,239,199,0.15)}
        .casino-watermark__chip::before{content:'';position:absolute;inset:10px;border-radius:9999px;border:2px dashed rgba(255,239,199,0.18)}
        .casino-watermark__chip--left{left:48px;top:112px;height:228px;width:228px}
        .casino-watermark__chip--right{position:absolute;right:74px;bottom:88px;height:196px;width:196px}
        .casino-watermark__chip-core{position:absolute;left:50%;top:50%;height:34%;width:34%;transform:translate(-50%,-50%);border-radius:9999px;border:2px solid rgba(255,239,199,0.2)}
        .casino-watermark__card{position:absolute;height:248px;width:174px;border:2px solid rgba(255,239,199,0.19);border-radius:18px;background:rgba(255,239,199,0.08);box-shadow:inset 0 0 0 2px rgba(255,239,199,0.1)}
        .casino-watermark__card--back{left:238px;top:58px;transform:rotate(-16deg)}
        .casino-watermark__card--front{left:300px;top:172px;transform:rotate(9deg)}
        .casino-watermark__card-rank{position:absolute;font-family:Georgia,serif;font-size:2.4rem;font-weight:700;color:rgba(255,239,199,0.24)}
        .casino-watermark__card-rank--tl{left:18px;top:12px}
        .casino-watermark__card-rank--br{right:18px;bottom:12px;transform:rotate(180deg)}
        .casino-watermark__card-suit{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:4.8rem;color:rgba(255,239,199,0.22)}
        .casino-watermark__particles{position:absolute;inset:0}
        .casino-watermark__particle{position:absolute;font-family:Georgia,serif;font-size:4.6rem;font-weight:700;color:rgba(0,0,0,0.32);text-shadow:0 0 1px rgba(255,255,255,0.04)}
        .casino-watermark__particle--1{left:14px;top:30px;transform:rotate(-16deg)}.casino-watermark__particle--2{left:88px;top:220px;transform:rotate(12deg)}.casino-watermark__particle--3{left:210px;top:8px;transform:rotate(-8deg)}.casino-watermark__particle--4{left:286px;top:122px;transform:rotate(17deg)}.casino-watermark__particle--5{right:196px;top:40px;transform:rotate(-12deg)}.casino-watermark__particle--6{right:84px;top:132px;transform:rotate(10deg)}.casino-watermark__particle--7{right:24px;top:276px;transform:rotate(-18deg)}.casino-watermark__particle--8{right:140px;bottom:26px;transform:rotate(14deg)}.casino-watermark__particle--9{left:42px;bottom:40px;transform:rotate(-10deg)}.casino-watermark__particle--10{left:182px;bottom:6px;transform:rotate(8deg)}.casino-watermark__particle--11{left:344px;bottom:58px;transform:rotate(-14deg)}.casino-watermark__particle--12{right:286px;bottom:168px;transform:rotate(16deg)}.casino-watermark__particle--13{left:-10px;top:340px;transform:rotate(-12deg)}.casino-watermark__particle--14{left:146px;top:396px;transform:rotate(10deg)}.casino-watermark__particle--15{right:248px;top:-6px;transform:rotate(-9deg)}.casino-watermark__particle--16{right:-12px;bottom:132px;transform:rotate(15deg)}
        .deluxe-zoom-enter{animation:deluxeZoomEnter 220ms ease-out;transform-origin:top center}
        @keyframes deluxeZoomEnter{0%{opacity:0;transform:translateY(12px) scale(0.94)}100%{opacity:1;transform:translateY(0) scale(1)}}
        .clip-diamond{clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%)}
        .board-chip{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;pointer-events:none}
        .inside-hotspot{position:absolute;z-index:5;background:transparent;border:0;box-shadow:none;outline:none}
        .inside-hotspot--street,.inside-hotspot--sixline,.inside-hotspot--zero,.inside-hotspot--trio{border:0;box-shadow:none}
        .inside-hotspot-chip{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none}
        .basket-hotspot{position:absolute;bottom:-8px;right:-8px;z-index:6;display:flex;height:18px;width:18px;align-items:center;justify-content:center;border-radius:9999px;border:1px solid rgba(255,255,255,0.75);background:rgba(255,191,0,0.72);color:#111;font-size:0.58rem;font-weight:900}
        .basket-chip{position:absolute;bottom:8px;right:8px;z-index:5;pointer-events:none}
        .chip-token{position:relative;width:74px;height:74px;border-radius:9999px;background:radial-gradient(circle at 35% 28%,color-mix(in srgb,var(--chip-base) 76%,white 24%),var(--chip-base) 42%,var(--chip-dark) 100%);border:2px solid var(--chip-dark);box-shadow:0 8px 18px rgba(0,0,0,0.45),inset 0 2px 5px rgba(255,255,255,0.28)}
        .chip-token--compact{width:40px;height:40px;border-width:1px;box-shadow:0 2px 8px rgba(0,0,0,0.45)}
        .chip-token__outer{position:absolute;inset:0;border-radius:9999px}
        .chip-token__mark{position:absolute;left:50%;top:50%;width:10px;height:66px;border-radius:9999px;background:linear-gradient(180deg,transparent 0 6px,var(--chip-edge) 6px 18px,transparent 18px 48px,var(--chip-edge) 48px 60px,transparent 60px 100%)}
        .chip-token--compact .chip-token__mark{width:6px;height:36px;background:linear-gradient(180deg,transparent 0 4px,var(--chip-edge) 4px 10px,transparent 10px 26px,var(--chip-edge) 26px 32px,transparent 32px 100%)}
        .chip-token__inner{position:absolute;inset:14px;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:radial-gradient(circle at 35% 28%,#ffffff,#dedede 70%,#c9c9c9 100%);border:2px solid rgba(0,0,0,0.18);box-shadow:inset 0 1px 2px rgba(255,255,255,0.9)}
        .chip-token--compact .chip-token__inner{inset:8px;border-width:1px}
        .chip-token__inner span{font-size:1.05rem;font-weight:900;color:#222;line-height:1}
        .chip-token--compact .chip-token__inner span{font-size:0.86rem}
        .casinochip-container{display:flex;align-items:flex-end;gap:18px}
        .chip-select{background:transparent;padding:0;opacity:0.9;transition:transform 160ms ease,filter 160ms ease}
        .chip-select--active{transform:translateY(-2px) scale(1.04);filter:drop-shadow(0 0 10px rgba(255,255,255,0.3))}
        .action-btn{width:96px;height:82px;border-radius:10px;background:rgba(212,218,212,0.78);color:rgba(255,255,255,0.9);font-size:2.2rem;font-weight:900}
        .hex-btn{position:relative;width:122px;height:70px;clip-path:polygon(16% 0%,84% 0%,100% 50%,84% 100%,16% 100%,0% 50%);border:2px solid rgba(255,255,255,0.88);color:#fff;font-size:1rem;font-weight:900;text-transform:uppercase;box-shadow:0 10px 18px rgba(0,0,0,0.34),inset 0 2px 0 rgba(255,255,255,0.34),inset 0 -7px 10px rgba(0,0,0,0.34);transform:translateZ(0);transition:transform 140ms ease,box-shadow 140ms ease,filter 140ms ease}
        .hex-btn::before{content:'';position:absolute;inset:4px 10px 52%;border-radius:9999px;background:rgba(255,255,255,0.22);filter:blur(1px);pointer-events:none}
        .hex-btn:hover{transform:translateY(-2px);box-shadow:0 14px 22px rgba(0,0,0,0.4),inset 0 2px 0 rgba(255,255,255,0.38),inset 0 -8px 12px rgba(0,0,0,0.38)}
        .hex-btn--red{background:linear-gradient(180deg,#ff7b73 0%,#ff1f15 42%,#b10700 100%)}
        .hex-btn--black{background:linear-gradient(180deg,#626262 0%,#151515 42%,#000000 100%)}
        .footer-btn{display:flex;height:72px;align-items:center;justify-content:center;font-size:2rem;font-weight:900;color:#fff;border-right:1px solid rgba(255,255,255,0.08);box-shadow:inset 0 1px 0 rgba(255,255,255,0.08)}
        .footer-btn--red{background:linear-gradient(180deg,#8e1717 0%,#590707 100%)}
        .footer-btn--amber{background:linear-gradient(180deg,#9d5f0b 0%,#684006 100%)}
        .footer-btn--cyan{background:linear-gradient(180deg,#156b87 0%,#0a4152 100%)}
        .footer-btn--lime{background:linear-gradient(180deg,#5b7f14 0%,#39500c 100%)}
        .footer-btn--green{background:linear-gradient(180deg,#256d23 0%,#154514 100%)}
      `}</style>
    </CashierLayout>
  );
}
