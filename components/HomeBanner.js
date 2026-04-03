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
        
        if (scrollLeft + offsetWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: offsetWidth, behavior: 'smooth' });
        }
      }
    }, 5000);

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
            className="w-full h-24 md:h-32 snap-center shrink-0 border-x border-white/5 transition-opacity hover:opacity-95"
            style={{ 
              backgroundImage: `url('${banner.image_url}')`,
              // CHANGED: Use 'contain' to prevent zooming/cropping
              backgroundSize: 'contain',
              // ADDED: Prevent image tiling if the image is smaller than the box
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              // Matches your Lucra dark theme for the "letterbox" areas
              backgroundColor: '#0b0f1a' 
            }}
          >
            {/* Subtle overlay removed or kept based on preference; 
                if the image is 'contain', a gradient might look odd on the edges */}
            <div className="w-full h-full bg-black/5" />
          </a>
        ))}
      </div>
    </div>
  );
}
