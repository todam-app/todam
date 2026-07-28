import { useMutation } from "@tanstack/react-query";
import { Button, SectionTitle, TextField } from "@todam/design-system";
import { TodamApiError, type ContentReportBody } from "@todam/contracts";
import { useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { LegalFooter } from "../components/LegalFooter";
import { PageScrollView } from "../components/PageScrollView";
import { api } from "../lib/api";

const targetLabels: Record<ContentReportBody["targetType"], string> = {
  production: "ce spectacle",
  venue: "ce lieu",
  company: "cette compagnie",
  member: "ce profil",
  list: "cette liste",
  review: "cet avis",
};

function isTargetType(
  value: string | undefined,
): value is ContentReportBody["targetType"] {
  return Boolean(value && value in targetLabels);
}

export default function ContentReportPage() {
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const targetType = isTargetType(params.type) ? params.type : null;
  const targetId = typeof params.id === "string" ? params.id.trim() : "";
  const validTarget = Boolean(targetType && targetId);
  const trimmedReason = reason.trim();
  const targetLabel = useMemo(
    () => (targetType ? targetLabels[targetType] : "ce contenu"),
    [targetType],
  );
  const report = useMutation({
    mutationFn: () =>
      api.createContentReport({
        targetType: targetType!,
        targetId,
        reason: trimmedReason,
      }),
  });

  return (
    <>
      <Head>
        <title>Signaler une information | Todam</title>
        <meta content="noindex,nofollow" name="robots" />
      </Head>
      <PageScrollView contentContainerClassName="flex-grow">
        <View className="todam-page-before-footer mx-auto w-full max-w-2xl flex-1 gap-8 px-5 py-10 md:px-8 md:py-14">
          <View className="gap-4">
            <SectionTitle eyebrow="Qualité du catalogue" level={1}>
              Signaler ou corriger une information
            </SectionTitle>
            <Text className="max-w-[68ch] text-base leading-7 text-muted">
              Décrivez précisément ce qui semble incorrect à propos de {targetLabel}.
              Todam vérifiera la source avant toute modification publique.
            </Text>
          </View>

          {!validTarget ? (
            <View className="gap-4 border-l-2 border-error pl-4">
              <Text
                accessibilityRole="alert"
                className="text-base leading-6 text-error"
              >
                Le contenu à corriger n’est pas identifié. Revenez à sa fiche et
                utilisez son bouton de signalement.
              </Text>
              <View className="self-start">
                <Button
                  label="Retour à la découverte"
                  onPress={() => router.replace("/decouvrir")}
                  variant="secondary"
                />
              </View>
            </View>
          ) : report.isSuccess ? (
            <View
              accessibilityLiveRegion="polite"
              className="gap-4 border border-success bg-[#EEF7F1] p-5 md:p-6"
            >
              <Text className="text-base font-semibold text-success">
                Le signalement a bien été enregistré.
              </Text>
              <Text className="text-base leading-6 text-ink">
                Merci. Todam contrôlera la provenance et les droits avant de corriger la
                fiche.
              </Text>
              <View className="self-start">
                <Button
                  label="Revenir à la page précédente"
                  onPress={() => router.back()}
                  variant="secondary"
                />
              </View>
            </View>
          ) : (
            <View className="gap-5 border border-control bg-paper p-5 md:p-6">
              <TextField
                accessibilityHint="Indiquez la donnée concernée, sa valeur correcte et, si possible, une source vérifiable."
                label="Correction proposée"
                maxLength={2000}
                multiline
                onChangeText={setReason}
                placeholder="Ex. La représentation du 14 octobre commence à 20 h, selon la billetterie officielle : https://…"
                required
                style={{ minHeight: 180, textAlignVertical: "top" }}
                value={reason}
                webName="correction"
              />
              <Text className="text-sm leading-5 text-muted">
                {trimmedReason.length}/2000 caractères. N’ajoutez aucune donnée
                personnelle sensible.
              </Text>
              <Button
                disabled={trimmedReason.length < 10}
                label="Envoyer la correction"
                loading={report.isPending}
                onPress={() => report.mutate()}
              />
              {report.isError ? (
                <Text
                  accessibilityRole="alert"
                  className="text-base leading-6 text-error"
                >
                  {report.error instanceof TodamApiError
                    ? report.error.problem.detail
                    : "Le signalement n’a pas pu être envoyé. Réessayez dans quelques instants."}
                </Text>
              ) : null}
            </View>
          )}
        </View>
        <LegalFooter />
      </PageScrollView>
    </>
  );
}
