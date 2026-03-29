import '../styles/globals.css';
import { BetProvider } from '../context/BetContext';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <BetProvider>
      <Head>
        <title>Lucra | Sports Betting & Live Odds</title>
        {/* viewport-fit=cover is great for mobile notches, and user-scalable=no is common for betting apps to prevent accidental zooms */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="description" content="Lucra - Real-time sports data and betting markets" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* This wrapper ensures the background always fills 100% of the screen 
        regardless of zoom level or content height.
      */}
      <div className="min-h-screen w-full bg-[#0b0f1a] flex flex-col antialiased">
        <Component {...pageProps} />
      </div>

    </BetProvider>
  );
}

export default MyApp;
