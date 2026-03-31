import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function HomeBanner() {
  const [banners, setBanners] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    async function getBanners() {
      const { data } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (data) setBanners(data);
    }
    getBanners();
  }, []);

  // --- AUTOPLAY LOGIC ---
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, offsetWidth, scrollWidth } = scrollRef.current;
        
        // If at the end, jump back to start, otherwise move to next
        if (scrollLeft + offsetWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: offsetWidth, behavior: 'smooth' });
        }
      }
    }, 5000); // Changes every 5 seconds

    return () => clearInterval(interval);
  }, [banners]);

  if (banners.length === 0) return null;

  return (
    <div className="w-full overflow-hidden bg-[#0b0f1a]">
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar w-full"
      >
        {banners.map((banner) => (
          <a 
            key={banner.id}
            href={banner.target_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full h-20 md:h-24 snap-center shrink-0 border-x border-white/5 transition-opacity hover:opacity-90"
            style={{ 
              backgroundImage: `url('${banner.image_url}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: '#1c2636'
            }}
          >
            <div className="w-full h-full bg-gradient-to-r from-black/40 via-transparent to-black/40" />
          </a>
        ))}
      </div>
    </div>
  );
}
