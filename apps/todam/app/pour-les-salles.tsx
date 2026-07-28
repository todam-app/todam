import { useQuery } from "@tanstack/react-query";
import { VenueResponseSchema } from "@todam/contracts";
import { Button, SectionTitle } from "@todam/design-system";
import { Link, useLoaderData } from "expo-router";
import Head from "expo-router/head";
import { createStaticLoader } from "expo-router/server";
import { Linking, Pressable, Text, View } from "react-native";

import { LegalFooter } from "../components/LegalFooter";
import { PageScrollView } from "../components/PageScrollView";
import { ProductionListItem } from "../components/ProductionListItem";
import { AsyncState } from "../components/AsyncState";
import { api } from "../lib/api";
import { API_URL, PUBLIC_WEB_URL } from "../lib/config";
import { loadOptionalStaticData } from "../lib/static-catalog-params";

const DEMO_VENUE_SLUG = "hexagone-scene-nationale";
const INITIAL_DATA_UPDATED_AT = Date.now();

export const loader = createStaticLoader(() =>
  loadOptionalStaticData("Démonstration Pour les salles", async () => {
    const response = await fetch(`${API_URL}/v1/venues/${DEMO_VENUE_SLUG}`);
    if (!response.ok) {
      throw new Error("Impossible de précharger la démonstration Hexagone.");
    }
    return VenueResponseSchema.parse(await response.json());
  }),
);

export default function ForVenuesPage() {
  const preloadedVenue = useLoaderData<typeof loader>();
  const demonstration = useQuery({
    queryKey: ["venue", DEMO_VENUE_SLUG],
    queryFn: () => api.getVenue(DEMO_VENUE_SLUG),
    ...(preloadedVenue
      ? {
          initialData: preloadedVenue,
          initialDataUpdatedAt: INITIAL_DATA_UPDATED_AT,
        }
      : {}),
    staleTime: 60_000,
  });
  const exampleProduction = demonstration.data?.upcoming[0];
  return (
    <>
      <Head>
        <title>Todam pour les salles de spectacle | Todam</title>
        <meta
          content="Pilote Todam pour vérifier une programmation, tester le parcours spectateur et documenter les droits des visuels."
          name="description"
        />
        <link href={`${PUBLIC_WEB_URL}/pour-les-salles`} rel="canonical" />
        <meta content="Todam pour les salles de spectacle" property="og:title" />
        <meta
          content="Pilote Todam pour vérifier une programmation, tester le parcours spectateur et documenter les droits des visuels."
          property="og:description"
        />
        <meta content={`${PUBLIC_WEB_URL}/pour-les-salles`} property="og:url" />
        <meta content="Todam pour les salles de spectacle" name="twitter:title" />
        <meta
          content="Pilote Todam pour vérifier une programmation, tester le parcours spectateur et documenter les droits des visuels."
          name="twitter:description"
        />
      </Head>
      <PageScrollView contentContainerClassName="flex-grow">
        <View className="todam-page-before-footer mx-auto w-full max-w-content flex-1 gap-14 px-5 py-10 md:px-8 md:py-16">
          <View className="max-w-4xl gap-6 border-b border-line pb-12">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-accent">
              Pour les salles
            </Text>
            <Text
              aria-level={1}
              accessibilityRole="header"
              className="font-serif text-[42px] font-semibold leading-[48px] text-ink md:text-[60px] md:leading-[66px]"
            >
              Aider vos spectateurs à garder le lien après la représentation.
            </Text>
            <Text className="max-w-[68ch] text-lg leading-8 text-muted">
              Todam rassemble votre programmation dans un catalogue sourcé, puis permet
              au public de marquer un spectacle vu, le dater, le noter et le retrouver
              dans son journal.
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <Link href={`/lieu/${DEMO_VENUE_SLUG}`} asChild>
                <Button
                  accessibilityRole="link"
                  label="Voir la démonstration Hexagone"
                />
              </Link>
              <Button
                label="Écrire à Todam"
                onPress={() =>
                  void Linking.openURL(
                    "mailto:contact@todam.fr?subject=Pilote%20Todam%20pour%20une%20salle",
                  )
                }
                variant="secondary"
              />
            </View>
          </View>

          <View className="gap-6 md:flex-row">
            {[
              [
                "Un programme vérifiable",
                "Chaque spectacle, date et lieu garde sa source et sa dernière date de vérification.",
              ],
              [
                "Un parcours après-spectacle",
                "Un lien ou un QR code ouvre la fiche ; le premier clic sur « Vu » l’ajoute au journal.",
              ],
              [
                "Des corrections maîtrisées",
                "La salle peut signaler une erreur et vérifier sa programmation avant le pilote.",
              ],
            ].map(([title, body], index) => (
              <View
                className={`flex-1 gap-3 py-5 ${
                  index > 0
                    ? "border-t border-line md:border-l md:border-t-0 md:pl-6"
                    : ""
                }`}
                key={title}
              >
                <Text className="font-serif text-2xl font-semibold text-ink">
                  {title}
                </Text>
                <Text className="text-base leading-6 text-muted">{body}</Text>
              </View>
            ))}
          </View>

          <View className="gap-5 bg-paper p-6 md:p-8">
            <SectionTitle>Ce que Todam vous demande pendant le pilote</SectionTitle>
            <View className="gap-3">
              {[
                "Vérifier que les titres, disciplines, dates, crédits et liens de billetterie sont corrects.",
                "Tester la page du lieu et le parcours d’ajout au journal.",
                "Autoriser certains visuels uniquement si vous le souhaitez et si vous pouvez documenter les droits.",
                "Choisir éventuellement un emplacement discret pour un QR code ou un lien.",
              ].map((item, index) => (
                <View className="flex-row gap-4" key={item}>
                  <Text className="text-base w-7 font-bold text-accent">
                    0{index + 1}
                  </Text>
                  <Text className="max-w-[70ch] flex-1 text-base leading-6 text-ink">
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-8 md:flex-row">
            <View className="flex-1 gap-4">
              <SectionTitle>Validation des données</SectionTitle>
              <Text className="max-w-[68ch] text-base leading-7 text-muted">
                Une production reste en brouillon tant qu’elle n’a pas été relue. Seuls
                le théâtre, l’opéra et le ballet entrent dans la cohorte pilote. Les
                dates passées sont séparées des représentations à venir.
              </Text>
            </View>
            <View className="flex-1 gap-4">
              <SectionTitle>Politique des visuels</SectionTitle>
              <Text className="max-w-[68ch] text-base leading-7 text-muted">
                Sans autorisation documentée, Todam affiche « Visuel non publié ». Aucun
                visuel promotionnel ni texte officiel n’est copié par défaut. Vous
                pouvez transmettre un détenteur, un crédit, une source, le type
                d’autorisation et une éventuelle expiration.
              </Text>
            </View>
          </View>

          <View className="gap-6 border-y border-line py-10">
            <SectionTitle>De la fiche spectacle au journal</SectionTitle>
            <AsyncState
              empty={
                !demonstration.isPending && !demonstration.isError && !exampleProduction
              }
              emptyAction={
                <Link href={`/lieu/${DEMO_VENUE_SLUG}`} asChild>
                  <Button
                    accessibilityRole="link"
                    label="Ouvrir la page de l’Hexagone"
                    variant="secondary"
                  />
                </Link>
              }
              emptyMessage="La programmation pilote ne contient pas encore de spectacle à venir."
              error={demonstration.isError}
              loading={demonstration.isPending}
              onRetry={() => void demonstration.refetch()}
            >
              {exampleProduction ? (
                <View className="gap-6">
                  <Text className="max-w-[72ch] text-base leading-7 text-muted">
                    Cet exemple utilise une production réellement publiée dans la
                    programmation pilote de l’Hexagone ; il ne s’agit pas d’un contenu
                    décoratif ajouté à la page.
                  </Text>
                  <View className="gap-6 md:flex-row md:items-stretch">
                    <View className="min-w-0 flex-1 border border-control bg-paper p-5">
                      <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">
                        Fiche publique
                      </Text>
                      <ProductionListItem
                        headingLevel={2}
                        production={exampleProduction}
                      />
                      <Text className="mt-3 text-sm leading-5 text-muted">
                        Dates, lieu, crédits, sources et billetterie restent accessibles
                        depuis la fiche.
                      </Text>
                    </View>
                    <View className="flex-1 justify-center gap-4 border border-control bg-paper p-5">
                      <Text className="text-xs font-bold uppercase tracking-widest text-accent">
                        Après « Vu »
                      </Text>
                      <Text className="font-serif text-2xl font-semibold text-ink">
                        {exampleProduction.title}
                      </Text>
                      <View className="border-y border-line py-3">
                        <Text className="text-base font-semibold text-ink">
                          Ajout immédiat au journal
                        </Text>
                        <Text className="mt-1 text-sm leading-5 text-muted">
                          Date de représentation facultative · note sur 10 · avis et
                          listes selon la visibilité choisie.
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}
            </AsyncState>
          </View>

          <View className="gap-5 border-y border-line py-10">
            <SectionTitle>Le test en conditions réelles</SectionTitle>
            <Text className="max-w-[72ch] text-base leading-7 text-muted">
              Un QR code ou un lien peut être placé à l’entrée, sur un programme ou dans
              l’e-mail d’après-spectacle. Todam ne demande pas d’interrompre la sortie
              des spectateurs ni de mener une enquête orale. Les mesures portent sur les
              visites, les ajouts au journal et les retours volontaires.
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <Button
                label="Proposer une salle pilote"
                onPress={() =>
                  void Linking.openURL(
                    "mailto:contact@todam.fr?subject=Proposer%20une%20salle%20pilote",
                  )
                }
              />
              <Link href="/les-coulisses" asChild>
                <Pressable
                  accessibilityRole="link"
                  className="min-h-11 justify-center px-3"
                >
                  <Text className="text-base font-semibold text-accent">
                    Voir l’infrastructure et les limites actuelles →
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
        <LegalFooter />
      </PageScrollView>
    </>
  );
}
