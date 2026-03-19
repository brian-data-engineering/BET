import Link from 'next/link';
import Navbar from '../components/Navbar';
import Betslip from '../components/Betslip';
import OddsTable from '../components/OddsTable';
import { Trophy } from 'lucide-react';

export default function Home({ matches }) {
  return (
    <div className="min-h-screen bg-lucra-dark text-white">
      {/* 1. Top Navigation */}
      <Navbar />

      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-6 p-4 lg:p-6">
        
        {/* 2. Left Sidebar - Sports Categories */}
        <aside className="hidden lg:col-span-2 lg:block space-y-2">
          <div className="text-lucra-green bg-lucra-card/50 border border-lucra-green/20 p-3 rounded-xl flex items-center gap-3 font-bold">
            <Trophy size={18} />
            Soccer
          </div>
          {['Basketball', 'Tennis', 'Cricket', 'Rugby', 'Hockey'].map((sport) => (
            <div key={sport} className="text-lucra-text-dim hover:text-white hover:bg-slate-800 p-3 rounded-xl flex items-center gap-3 transition cursor-pointer">
              <div className="w-2 h-2 rounded-full bg-gray-700" />
              {sport}
            </div>
          ))}
        </aside>

        {/* 3. Main Content - Match Feed */}
        <main className="col-span-12 lg:col-span-7 space-y-4">
          {/* Promo Banner */}
          <div className="bg-lucra-green text-black p-4 rounded-xl flex justify-between items-center font-black italic tracking-tighter">
            <span>DAILY REWARD: 10% CASHBACK ON ALL LOSSES</span>
            <button className="bg-black text-white px-4 py-1 rounded-lg text-xs italic">CLAIM NOW</button>
          </div>

          <div className="flex gap-4 mb-6 border-b border-gray-800 pb-2">
            <button className="text-lucra-green border-b-2 border-lucra-green pb-2 font-bold px-2">Popular</button>
            <button className="text-gray-500 hover:text-white pb-2 px-2 transition">Upcoming</button>
            <button className="text-gray-500 hover:text-white pb-2 px-2 transition">Leagues</button>
          </div>

          <div className="grid gap-3">
            {matches.map((match) => (
              <div key={match.match_id} className="bg-lucra-card border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-all">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  
                  {/* Team Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-lucra-text-dim font-bold uppercase tracking-widest bg-slate-900 px-2 py-0.5 rounded">
                        {match.competition}
                      </span>
                      <span className="text-[10px] text-gray-500 font-bold">
                        {new Date(match.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    
                    <Link href={`/${match.match_id}`} className="block group">
                      <h3 className="text-md font-bold text-gray-200 group-hover:text-lucra-green transition-colors">
                        {match.home}
                      </h3>
                      <h3 className="text-md font-bold text-gray-200 group-hover:text-lucra-green transition-colors">
                        {match.away}
                      </h3>
                    </Link>
                  </div>

                  {/* Quick Odds Grid */}
                  <div className="md:w-64">
                    {/* Passing match.odds here assumes your API now includes them */}
                    <OddsTable odds={match.odds || []} />
                  </div>

                </div>
              </div>
            ))}
          </div>
        </main>

        {/* 4. Right Sidebar - Betslip */}
        <aside className="hidden lg:col-span-3 lg:block">
          <Betslip />
        </aside>

      </div>
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches`);
    const matches = await res.json();
    return { props: { matches: matches || [] } };
  } catch (err) {
    console.error("Fetch error:", err);
    return { props: { matches: [] } };
  }
}
