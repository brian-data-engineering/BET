export default function MatchesBySport({ matches }) {
  return (
    <div className="min-h-screen bg-lucra-dark p-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-lucra-green italic">Categorized Events</h2>
        {/* You can map over sports here */}
        <div className="flex gap-4 mb-10 overflow-x-auto pb-4">
           {['Soccer', 'Basketball', 'Tennis', 'Ice Hockey'].map(sport => (
             <button key={sport} className="bg-lucra-card px-6 py-2 rounded-full border border-gray-700 hover:border-lucra-green whitespace-nowrap">
               {sport}
             </button>
           ))}
        </div>
        
        {/* Reuse the Match list logic from index.js here */}
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/matches`);
  const data = await res.json();
  return { props: { matches: data } };
}
