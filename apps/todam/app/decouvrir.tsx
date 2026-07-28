import { SearchResponseSchema, type SearchResponse } from "@todam/contracts";
import { useLoaderData } from "expo-router";
import { DiscoverScreen } from "../components/DiscoverScreen";
import Head from "expo-router/head";
import { createStaticLoader } from "expo-router/server";

import { API_URL, PUBLIC_WEB_URL } from "../lib/config";
import { loadOptionalStaticData } from "../lib/static-catalog-params";

export const loader = createStaticLoader(() =>
  loadOptionalStaticData("Catalogue Découvrir", async () => {
    const query = new URLSearchParams({
      q: "",
      type: "productions",
      temporal: "upcoming",
      sort: "date",
      limit: "20",
    });
    const response = await fetch(`${API_URL}/v1/search?${query.toString()}`);
    if (!response.ok) {
      throw new Error("Impossible de précharger la page Découvrir.");
    }
    return SearchResponseSchema.parse(await response.json());
  }),
);

export default function DiscoverRoute() {
  const initialCatalog = useLoaderData<typeof loader>() as SearchResponse | null;
  return (
    <>
      <Head>
        <title>Découvrir les spectacles | Todam</title>
        <meta
          content="Explorez les spectacles de théâtre, d’opéra et de ballet, leurs lieux et leurs compagnies sur Todam."
          name="description"
        />
        <link href={`${PUBLIC_WEB_URL}/decouvrir`} rel="canonical" />
        <meta content="Découvrir les spectacles | Todam" property="og:title" />
        <meta
          content="Explorez les spectacles de théâtre, d’opéra et de ballet, leurs lieux et leurs compagnies sur Todam."
          property="og:description"
        />
        <meta content={`${PUBLIC_WEB_URL}/decouvrir`} property="og:url" />
        <meta content="Découvrir les spectacles | Todam" name="twitter:title" />
        <meta
          content="Explorez les spectacles de théâtre, d’opéra et de ballet, leurs lieux et leurs compagnies sur Todam."
          name="twitter:description"
        />
      </Head>
      <DiscoverScreen browse initialData={initialCatalog} />
    </>
  );
}
