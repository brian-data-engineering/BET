
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function MatchDetail({ odds, matchInfo }) {
  const router = useRouter();

  if (router.isFallback) return <div className="p-10 text-lucra-green">Loading Lucra Data...</div>;

  return (
    <div className="min-h-screen bg-lucra-dark text-white p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-lucra-green text-sm mb-6 inline-block hover:underline">← Back to All Matches</Link>
        
        <div className="bg-lucra-card border border-gray-800 rounded-2xl p-8 mb-8 text-center">
          <h1 className="text-4xl font-black mb-2">{matchInfo?.home} vs {matchInfo?.away}</h1>
          <p className="text-lucra-text-dim uppercase tracking-tighter">{matchInfo?.competition}</p>
        </div>

        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-6 bg-lucra-green rounded-full"></span> 1X2 Market
        </h2>

        <div className="grid grid-cols-3 gap-4">
          {odds.filter(o => o.market_name === "1X2" || o.market_name === "Match Winner").map((odd, i) => (
            <button key={i} className="bg-slate-900 border border-gray-800 p-6 rounded-xl hover:border-lucra-green group transition-all">
              <p className="text-gray-500 text-xs mb-1 uppercase font-bold">{odd.display}</p>
              <p className="text-2xl font-black text-lucra-green group-hover:scale-110 transition-transform">{odd.value}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { matchId } = context.params;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches/${matchId}/odds`);
    const odds = await res.json();
    return { props: { odds: odds || [], matchInfo: odds[0] || null } };
  } catch (err) {
    return { props: { odds: [] } };
  }
}
