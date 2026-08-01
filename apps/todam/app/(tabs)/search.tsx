import { DiscoverScreen } from "../../components/DiscoverScreen";
import Head from "expo-router/head";

export default function SearchScreen() {
  return (
    <>
      <Head>
        <title>Rechercher dans Todam | Todam</title>
        <meta content="noindex,follow" name="robots" />
      </Head>
      <DiscoverScreen />
    </>
  );
}
