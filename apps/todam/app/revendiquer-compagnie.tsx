import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, SectionTitle, TextField } from "@todam/design-system";
import { TodamApiError } from "@todam/contracts";
import { useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AsyncState } from "../components/AsyncState";
import { PageScrollView, PageStaticView } from "../components/PageScrollView";
import { PrivatePageHead } from "../components/PrivatePageHead";
import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export default function ClaimCompanyPage() {
  const params = useLocalSearchParams<{ companyId?: string }>();
  const router = useRouter();
  const session = authClient.useSession();
  const [representativeName, setRepresentativeName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [professionalEmail, setProfessionalEmail] = useState("");
  const [officialWebsiteUrl, setOfficialWebsiteUrl] = useState("");
  const [evidence, setEvidence] = useState("");
  const [authorityConfirmed, setAuthorityConfirmed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const claims = useQuery({
    queryKey: ["company-claims"],
    queryFn: () => api.getCompanyClaims(),
    enabled: Boolean(session.data),
  });
  const claim = useMutation({
    mutationFn: () =>
      api.createCompanyClaim(params.companyId!, {
        representativeName,
        roleTitle,
        professionalEmail,
        officialWebsiteUrl,
        evidence,
        authorityConfirmed: true,
      }),
    onSuccess: () => {
      setRepresentativeName("");
      setRoleTitle("");
      setProfessionalEmail("");
      setOfficialWebsiteUrl("");
      setEvidence("");
      setAuthorityConfirmed(false);
      setFeedback(
        "Demande envoyée. Todam la vérifiera manuellement avant tout accès à l’éditeur.",
      );
      void claims.refetch();
    },
    onError: (error) =>
      setFeedback(
        error instanceof TodamApiError
          ? error.problem.detail
          : "La demande n’a pas pu être envoyée.",
      ),
  });

  if (session.isPending) {
    return (
      <>
        <PrivatePageHead title="Revendiquer une compagnie" />
        <PageStaticView className="flex-1">
          <AsyncState empty={false} emptyMessage="" error={false} loading>
            {null}
          </AsyncState>
        </PageStaticView>
      </>
    );
  }

  if (!session.data) {
    return (
      <>
        <PrivatePageHead title="Revendiquer une compagnie" />
        <PageScrollView contentContainerClassName="flex-grow">
          <View className="todam-page-before-footer mx-auto w-full max-w-xl flex-1 items-center justify-center gap-5 px-5 py-12">
            <SectionTitle level={1}>Un compte est nécessaire</SectionTitle>
            <Text className="text-center text-base leading-6 text-muted">
              La revendication est rattachée à un compte vérifié et à un e-mail
              professionnel.
            </Text>
            <Button
              label="Se connecter"
              onPress={() =>
                router.push({
                  pathname: "/sign-in",
                  params: {
                    returnTo: `/revendiquer-compagnie?companyId=${params.companyId ?? ""}`,
                  },
                })
              }
            />
          </View>
        </PageScrollView>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Revendiquer une compagnie | Todam</title>
        <meta content="noindex,nofollow" name="robots" />
      </Head>
      <PageScrollView contentContainerClassName="flex-grow">
        <View className="todam-page-before-footer mx-auto w-full max-w-2xl flex-1 gap-8 px-5 py-10 md:px-8">
          <View className="gap-4">
            <SectionTitle eyebrow="Espace professionnel" level={1}>
              Revendiquer cette compagnie
            </SectionTitle>
            <Text className="max-w-[68ch] text-base leading-7 text-muted">
              Todam vérifie chaque demande manuellement. Les informations ci-dessous ne
              sont jamais affichées sur la fiche publique. Pendant le pilote, un compte
              professionnel ne peut représenter qu’une seule compagnie ; une compagnie
              peut en revanche autoriser plusieurs représentants distincts.
            </Text>
          </View>
          {!params.companyId ? (
            <View className="gap-3 rounded-todam border border-selected-border bg-selected p-4">
              <Text className="text-base leading-6 text-muted">
                Aucune compagnie n’est sélectionnée. Recherchez d’abord sa fiche.
              </Text>
              <View className="self-start">
                <Button
                  label="Rechercher une compagnie"
                  onPress={() => router.push("/search?type=companies")}
                />
              </View>
            </View>
          ) : (
            <View className="todam-form-panel gap-5 p-5 md:p-6">
              <TextField
                autoComplete="name"
                label="Votre identité"
                maxLength={160}
                onChangeText={setRepresentativeName}
                placeholder="Prénom et nom"
                required
                value={representativeName}
                webName="representative-name"
              />
              <TextField
                autoComplete="organization-title"
                label="Votre rôle dans la compagnie"
                maxLength={120}
                onChangeText={setRoleTitle}
                placeholder="Ex. Directrice artistique"
                required
                value={roleTitle}
                webName="role-title"
              />
              <TextField
                autoCapitalize="none"
                autoComplete="email"
                error={
                  professionalEmail && !validEmail(professionalEmail)
                    ? "Saisissez une adresse e-mail professionnelle valide."
                    : undefined
                }
                inputMode="email"
                keyboardType="email-address"
                label="E-mail professionnel"
                onChangeText={setProfessionalEmail}
                required
                value={professionalEmail}
                webName="professional-email"
              />
              <TextField
                autoCapitalize="none"
                autoComplete="url"
                error={
                  officialWebsiteUrl && !validHttpUrl(officialWebsiteUrl)
                    ? "Saisissez une URL HTTP ou HTTPS complète."
                    : undefined
                }
                inputMode="url"
                keyboardType="url"
                label="Site officiel de la compagnie"
                onChangeText={setOfficialWebsiteUrl}
                placeholder="https://…"
                required
                value={officialWebsiteUrl}
                webName="official-website-url"
              />
              <TextField
                label="Preuve ou explication vérifiable"
                maxLength={4000}
                multiline
                onChangeText={setEvidence}
                placeholder="Expliquez votre lien avec la compagnie et comment Todam peut le vérifier."
                required
                style={{ minHeight: 150, textAlignVertical: "top" }}
                value={evidence}
                webName="evidence"
              />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: authorityConfirmed }}
                className="min-h-11 flex-row items-start gap-3"
                onPress={() => setAuthorityConfirmed((value) => !value)}
              >
                <View
                  className={`mt-1 h-5 w-5 items-center justify-center border ${
                    authorityConfirmed
                      ? "border-accent bg-accent"
                      : "border-control bg-paper"
                  }`}
                >
                  {authorityConfirmed ? (
                    <Text className="text-xs font-bold text-paper">✓</Text>
                  ) : null}
                </View>
                <Text className="flex-1 text-base leading-6 text-ink">
                  Je confirme être autorisé à transmettre les informations, contenus et
                  éventuels visuels au nom de cette compagnie.
                </Text>
              </Pressable>
              <Button
                disabled={
                  representativeName.trim().length < 2 ||
                  !roleTitle.trim() ||
                  !validEmail(professionalEmail) ||
                  !validHttpUrl(officialWebsiteUrl) ||
                  evidence.trim().length < 30 ||
                  !authorityConfirmed
                }
                label="Envoyer la demande"
                loading={claim.isPending}
                onPress={() => claim.mutate()}
              />
              {feedback ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className={`text-base ${
                    claim.isError
                      ? "leading-6 text-error"
                      : "border-l-2 border-success pl-3 leading-6 text-ink"
                  }`}
                >
                  {feedback}
                </Text>
              ) : null}
            </View>
          )}

          {claims.data && claims.data.length > 0 ? (
            <View className="gap-4 border-t border-line pt-7">
              <SectionTitle>Mes demandes</SectionTitle>
              {claims.data.map((item) => (
                <View className="border-b border-line py-4" key={item.id}>
                  <Text className="text-base font-semibold text-ink">
                    {item.companyName}
                  </Text>
                  <Text className="text-sm text-muted">
                    Statut :{" "}
                    {item.status === "pending"
                      ? "En attente"
                      : item.status === "approved"
                        ? "Approuvée"
                        : item.status === "rejected"
                          ? "Refusée"
                          : "Révoquée"}
                  </Text>
                  {item.decisionReason ? (
                    <Text className="mt-1 text-sm leading-5 text-muted">
                      {item.decisionReason}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </PageScrollView>
    </>
  );
}
