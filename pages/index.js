import Link from 'next/link';

export default function Home({ matches }) {
  return (
    <div className="min-h-screen bg-lucra-dark text-white p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-lucra-green tracking-tighter italic">LUCRA</h1>
          <div className="bg-lucra-green/10 text-lucra-green px-4 py-1 rounded-full text-sm font-bold border border-lucra-green/20">
            Live Odds Active
          </div>
        </header>

        <div className="grid gap-4">
          {matches.map((match) => (
            <div key={match.match_id} className="bg-lucra-card border border-gray-800 rounded-xl p-5 hover:border-lucra-green/50 transition-all group">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-[10px] text-lucra-text-dim uppercase tracking-widest font-bold">
                    {match.competition} • {new Date(match.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                  <h3 className="text-lg font-bold group-hover:text-lucra-green transition-colors">
                    {match.home} <span className="text-gray-600 mx-2">vs</span> {match.away}
                  </h3>
                </div>
                
                <Link href={`/${match.match_id}`}>
                  <button className="bg-lucra-green text-black px-6 py-2 rounded-lg font-bold hover:bg-white transition-colors">
                    View Odds
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
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
    return { props: { matches: [] } };
  }
}
