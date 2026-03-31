import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function HomeBanner() {
  const [banners, setBanners] = useState([]);
  const [errorInfo, setErrorInfo] = useState(null);

  useEffect(() => {
    async function getBanners() {
      // 1. Fetch data and capture any errors
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) {
        console.error("Supabase Error:", error.message);
        setErrorInfo(error.message);
      } else {
        console.log("Banners received:", data);
        setBanners(data || []);
      }
    }
    getBanners();
  }, []);

  // 2. If there is an error, show it on screen so we can fix it
  if (errorInfo) {
    return <div className="p-4 text-red-500 text-xs">Banner Error: {errorInfo}</div>;
  }

  // 3. If it's still loading or empty, return null
  if (banners.length === 0) return null;

  return (
    <div className="w-full overflow-hidden pt-4 bg-[#0b0f1a]">
      <div className="flex overflow-x-auto gap-4 px-4 pb-4 snap-x snap-mandatory no-scrollbar">
        {banners.map((banner) => (
          <div 
            key={banner.id} 
            className="min-w-[85%] md:min-w-[45%] snap-center shrink-0"
          >
            {/* 4. Using <a> tag with target_url from your DB */}
            <a 
              href={banner.target_url} 
              className="block h-32 rounded-2xl bg-cover bg-center shadow-lg border border-white/5 overflow-hidden"
              style={{ 
                // Using image_url which should now be the .png link
                backgroundImage: `url('${banner.image_url}')`,
                backgroundColor: '#1c2636' // Fallback color if image fails
              }}
            >
              {/* This invisible spacer ensures the link is clickable across the whole banner */}
              <div className="w-full h-full" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
