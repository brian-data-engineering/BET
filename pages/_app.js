import '../styles/globals.css';
import { BetProvider } from '../context/BetContext';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <BetProvider>
      <Head>
        <title>Lucra | Sports Betting & Live Odds</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="Lucra - Real-time sports data and betting markets" />
        {/* Adding a favicon makes your site look like a real brand */}
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Component {...pageProps} />
    </BetProvider>
  );
}

export default MyApp;
