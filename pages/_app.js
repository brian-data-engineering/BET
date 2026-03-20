import '../styles/globals.css';
import { BetProvider } from '../context/BetContext';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <BetProvider>
      {/* The Head tag ensures Lucra has the correct title 
        and scaling on mobile devices 
      */}
      <Head>
        <title>Lucra | Sports Betting & Live Odds</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="Lucra - Real-time sports data and betting markets" />
      </Head>

      <Component {...pageProps} />
    </BetProvider>
  );
}

export default MyApp;
