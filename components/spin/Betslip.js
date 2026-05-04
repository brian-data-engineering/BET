import React, { useMemo } from 'react';
import { X } from 'lucide-react';

const BET_LABELS = {
  '0': 'Number: 0',
  '1to18': 'Low/High: Low',
  '19to36': 'Low/High: High',
  'even': 'Even/Odd: Even',
  'odd': 'Even/Odd: Odd',
  'red': 'Color: Red',
  'black': 'Color: Black',
  'dozen-1 - 12': 'Dozen: 1 - 12',
  'dozen-13 - 24': 'Dozen: 13 - 24',
  'dozen-25 - 36': 'Dozen: 25 - 36',
  'col-1': 'Column: 1',
  'col-2': 'Column: 2',
  'col-3': 'Column: 3',
};

const PAYOUT_MAP = {
  num: 36,
  dozen: 3,
  col: 3,
  '0': 36,
  '1to18': 2,
  '19to36': 2,
  even: 2,
  odd: 2,
  red: 2,
  black: 2,
};

function getOdds(key) {
  if (key.startsWith('num-')) return '36.0';
  if (key.startsWith('dozen-')) return '3.00';
  if (key.startsWith('col-')) return '3.00';
  return key in PAYOUT_MAP ? `${PAYOUT_MAP[key].toFixed(2)}` : '2.00';
}

function getStakeChip(amount) {
  if (amount >= 500) return 500;
  if (amount >= 100) return 100;
  if (amount >= 50) return 50;
  return 20;
}

function getBetLabel(key) {
  if (key.startsWith('num-')) return `Number: ${key.replace('num-', '')}`;
  return BET_LABELS[key] || key;
}

export default function BetSlip({ bets = {} }) {
  const entries = useMemo(() => Object.entries(bets).filter(([, amount]) => amount > 0), [bets]);
  const totalStake = entries.reduce((sum, [, amount]) => sum + amount, 0);
  const maxWin = entries.reduce((sum, [key, amount]) => {
    const odds = parseFloat(getOdds(key)) || 0;
    return sum + amount * odds;
  }, 0);

  if (entries.length === 0) {
    return (
      <div className="flex h-full flex-col bg-black">
        <div className="border-b border-[#5f5f5f] bg-[#f2f2f2] py-1 text-center text-[18px] font-black uppercase text-[#717171]">
          FASTBET
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-white/22">
            <div className="text-[92px] font-black leading-none">+</div>
            <div className="mt-2 text-[19px]">Please pick up a bet to start</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="retail-betslip flex h-full flex-col bg-black">
        <div className="border-b border-[#5f5f5f] bg-[#f2f2f2] py-1 text-center text-[18px] font-black uppercase text-[#717171]">
          FASTBET
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_72px_70px_34px] bg-[#ff1212] px-2 py-1 text-[10px] font-black text-white">
          <div>Selection</div>
          <div className="text-center">Odds</div>
          <div className="text-center">Stake</div>
          <div />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#d4d4d4]">
          {entries.map(([key, amount], index) => (
            <div
              key={key}
              className={`grid grid-cols-[minmax(0,1fr)_72px_70px_34px] items-center border-b border-[#aaaaaa] px-2 py-1 ${
                index % 2 === 0 ? 'bg-[#ececec]' : 'bg-[#d2d2d2]'
              }`}
            >
              <div className="truncate pr-2 text-[11px] font-bold text-black">{getBetLabel(key)}</div>
              <div className="text-center text-[11px] font-black text-black">{getOdds(key)}</div>
              <div className="flex justify-center">
                <div className="min-w-[54px] border border-[#8b8b8b] bg-white px-2 py-0.5 text-right text-[11px] font-black text-black">
                  {amount}
                </div>
              </div>
              <div className="flex justify-center">
                <button type="button" className="flex h-7 w-7 items-center justify-center rounded bg-[#ff1212] text-white">
                  <X className="h-4 w-4 stroke-[3]" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-black">
          <div className="grid grid-cols-2">
            <button type="button" className="bg-[#ff1212] py-1.5 text-[15px] font-black text-white">
              Single
            </button>
            <button type="button" className="bg-[#9a9a9a] py-1.5 text-[15px] font-black text-white/90">
              System
            </button>
          </div>

          <div className="bg-[#ff1212] px-2 py-1 text-white">
            <div className="grid grid-cols-[42px_66px_66px_66px_minmax(0,1fr)] text-[10px] font-black">
              <div>GR</div>
              <div>Combi</div>
              <div className="text-center">Min</div>
              <div className="text-center">Max</div>
              <div className="text-center">Stake / Bet</div>
            </div>
          </div>

          <div className="bg-[#d9d9d9] px-2 py-1 text-black">
            <div className="grid grid-cols-[42px_66px_66px_66px_minmax(0,1fr)] items-center text-[10px] font-black">
              <div>1</div>
              <div>{entries.length}</div>
              <div className="text-center">2.00</div>
              <div className="text-center">36.0</div>
              <div className="rounded border border-[#9d9d9d] bg-[#ececec] px-2 py-0.5 text-right text-[#888]">20-500</div>
            </div>
          </div>

          <div className="grid grid-cols-5 border-t border-[#666] bg-[#1d1d1d]">
            {[20, 50, 100, 500].map((chip) => (
              <button
                key={chip}
                type="button"
                className={`border-r border-[#666] py-1 text-[11px] font-black text-white ${getStakeChip(totalStake) === chip ? 'bg-[#2d2d2d]' : ''}`}
              >
                {chip}
              </button>
            ))}
            <button type="button" className="py-1 text-[11px] font-black text-white">
              Clear
            </button>
          </div>

          <div className="bg-[#d9d9d9] px-3 py-2 text-[11px] font-black text-black">
            <div className="flex items-center justify-between">
              <span>Potential MIN Win</span>
              <span>{Math.max(Math.round(totalStake * 0.05), 0)} KSh</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span>Potential MAX Win</span>
              <span>{Math.round(maxWin)} KSh</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
