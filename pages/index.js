// ... existing imports

export default function Home({ initialMatches = [] }) {
  const [activeTab, setActiveTab] = useState('soccer');
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); 
  const { slipItems, setSlipItems } = useBets(); 

  // 1. Defined icons for the top tabs to match Sidebar style
  const sportTabs = [
    { id: 'soccer', name: 'Soccer', icon: '⚽' },
    { id: 'basketball', name: 'Basketball', icon: '🏀' },
    { id: 'tennis', name: 'Tennis', icon: '🎾' },
    { id: 'ice-hockey', name: 'Ice Hockey', icon: '🏒' },
    { id: 'table-tennis', name: 'Table Tennis', icon: '🏓' },
  ];

  const cleanName = (name) => name ? name.replace(/['"]+/g, '').trim() : 'TBD';

  // ... toggleBet logic remains the same

  const displayMatches = useMemo(() => {
    let filtered = initialMatches.filter(m => {
      const league = (m.league_name || '').toLowerCase();
      const sport = (m.sport_key || '').toLowerCase();
      
      const isVirtual = 
        league.includes('ebasketball') || 
        league.includes('esoccer') || 
        league.includes('srl') || 
        league.includes('electronic') ||
        league.includes('cyber') ||
        sport.startsWith('esport');

      return !isVirtual;
    });

    // 2. Filter by the active sport tab
    filtered = filtered.filter(m => m.sport_key === activeTab);

    if (selectedLeague) {
      filtered = filtered.filter(m => m.league_name === selectedLeague);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.home_team?.toLowerCase().includes(q) || 
        m.away_team?.toLowerCase().includes(q) ||
        m.league_name?.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [initialMatches, selectedLeague, searchQuery, activeTab]);

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white font-sans">
      <Navbar onSearch={setSearchQuery} />
      
      {/* Promo Banner remains the same */}

      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-0">
        <aside className="hidden lg:col-span-2 lg:block border-r border-white/5">
          <Sidebar 
            onSelectLeague={(league) => setSelectedLeague(league)} 
            onClearFilter={() => setSelectedLeague(null)} 
          />
        </aside>

        <main className="col-span-12 lg:col-span-7 bg-[#111926] min-h-screen border-r border-white/5">
          
          {/* UPDATED TOP SPORT TABS WITH ICONS */}
          <div className="bg-[#111926] border-b border-white/5 flex items-center px-2 overflow-x-auto no-scrollbar sticky top-0 z-20">
            {sportTabs.map((tab) => (
              <button 
                key={tab.id}
                onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedLeague(null); 
                }}
                className={`py-4 px-5 text-[11px] font-black uppercase tracking-tight transition-all relative whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-white'
                }`}
              >
                <span className={`${activeTab === tab.id ? 'grayscale-0' : 'grayscale'} transition-all`}>
                    {tab.icon}
                </span>
                {tab.name}
                {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10b981]" />
                )}
              </button>
            ))}
          </div>

          {/* ... Match List headers and mapping logic remains the same */}

          <div className="divide-y divide-white/5">
            {displayMatches.length > 0 ? (
              displayMatches.map((match) => (
                  // ... Match row component (same as previous)
              ))
            ) : (
              <div className="py-20 text-center opacity-20 flex flex-col items-center">
                <Zap size={48} className="mb-4" />
                <p className="font-black uppercase italic tracking-widest text-sm">
                    No {activeTab.replace('-', ' ')} matches found
                </p>
              </div>
            )}
          </div>
        </main>

        <aside className="hidden lg:col-span-3 lg:block p-4 space-y-4">
          <Betslip items={slipItems} setItems={setSlipItems} />
          {/* ... Booking code section */}
        </aside>
      </div>
    </div>
  );
}

// ... getServerSideProps remains the same
