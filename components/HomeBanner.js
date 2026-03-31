import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function HomeBanner() {
  const [banners, setBanners] = useState([]);

  // 1. This "Effect" runs as soon as the page loads
  useEffect(() => {
    async function getBanners() {
      // 2. We ask Supabase: "Give me all active banners"
      const { data } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (data) setBanners(data);
    }
    getBanners();
  }, []);

  // 3. If there are no banners yet, don't show anything
  if (banners.length === 0) return null;

  return (
    <div className="w-full overflow-hidden pt-4">
      {/* 4. This 'flex' div is the "Track" that holds the slides */}
      <div className="flex overflow-x-auto gap-4 px-4 pb-4 snap-x snap-mandatory no-scrollbar">
        {banners.map((banner) => (
          <div 
            key={banner.id} 
            className="min-w-[85%] md:min-w-[45%] snap-center shrink-0"
          >
            {/* 5. This is the actual image box */}
            <div 
              className="h-32 rounded-2xl bg-cover bg-center shadow-lg border border-white/5"
              style={{ backgroundImage: `url('${banner.image_url}')` }}
            >
              {/* Optional: clickable link */}
              <a href={banner.target_url} className="block w-full h-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
