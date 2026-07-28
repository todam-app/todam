import Head from "expo-router/head";

export function PrivatePageHead({ title }: { title: string }) {
  return (
    <Head>
      <title>{title} | Todam</title>
      <meta content="noindex,nofollow" name="robots" />
    </Head>
  );
}
