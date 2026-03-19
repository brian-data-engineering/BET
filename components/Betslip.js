import { Ticket } from 'lucide-react';

export default function Betslip({ selections = [] }) {
  return (
    <div className="bg-lucra-card border border-gray-800 rounded-xl overflow-hidden flex flex-col h-fit sticky top-24">
      <div className="bg-gray-800/50 p-4 border-b border-gray-700 flex items-center gap-2">
        <Ticket size={18} className="text-lucra-green" />
        <h4 className="font-bold text-sm uppercase tracking-wider">Betslip</h4>
        {selections.length > 0 && (
          <span className="ml-auto bg-lucra-green text-black text-[10px] font-black px-2 py-0.5 rounded-full">
            {selections.length}
          </span>
        )}
      </div>

      <div className="p-6 min-h-[200px] flex flex-col items-center justify-center text-center">
        {selections.length === 0 ? (
          <>
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Ticket size={24} className="text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm font-medium">No selections yet</p>
            <p className="text-gray-600 text-[11px] mt-1">Click on odds to add selections</p>
          </>
        ) : (
          <div className="w-full space-y-4">
            {/* Logic for showing selected bets would go here */}
            <button className="w-full bg-lucra-green text-black font-black py-3 rounded-lg mt-4 shadow-lg shadow-lucra-green/10">
              PLACE BET
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
