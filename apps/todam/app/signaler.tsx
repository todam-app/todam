import { useMutation } from "@tanstack/react-query";
import { Button, SectionTitle, TextField } from "@todam/design-system";
import { TodamApiError, type ContentReportBody } from "@todam/contracts";
import { useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { AccessibleChoiceGroup } from "../components/AccessibleChoiceGroup";
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
const categoryOptions = [
  ["visual_rights", "Affiche ou droits du visuel"],
  ["information", "Description ou informations du spectacle"],
  ["schedule", "Dates, horaires ou lieu"],
  ["other", "Autre"],
] as const satisfies readonly (readonly [ContentReportBody["category"], string])[];

interface ReportMedia {
  id: string;
  url: string;
}

function isTargetType(
  value: string | undefined,
): value is ContentReportBody["targetType"] {
  return Boolean(value && value in targetLabels);
}

export default function ContentReportPage() {
  const params = useLocalSearchParams<{
    type?: string;
    id?: string;
    media?: string;
    mediaId?: string;
  }>();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [category, setCategory] =
    useState<ContentReportBody["category"]>("information");
  const targetType = isTargetType(params.type) ? params.type : null;
  const targetId = typeof params.id === "string" ? params.id.trim() : "";
  const validTarget = Boolean(targetType && targetId);
  const trimmedReason = reason.trim();
  const availableMedia = useMemo<ReportMedia[]>(() => {
    if (typeof params.media !== "string") return [];
    try {
      const value = JSON.parse(params.media) as unknown;
      if (!Array.isArray(value)) return [];
      return value.filter((item): item is ReportMedia =>
        Boolean(
          item &&
          typeof item === "object" &&
          "id" in item &&
          typeof item.id === "string" &&
          "url" in item &&
          typeof item.url === "string",
        ),
      );
    } catch {
      return [];
    }
  }, [params.media]);
  const [selectedMediaId, setSelectedMediaId] = useState(
    typeof params.mediaId === "string" ? params.mediaId : "",
  );
  const targetLabel = useMemo(
    () => (targetType ? targetLabels[targetType] : "ce contenu"),
    [targetType],
  );
  const report = useMutation({
    mutationFn: () =>
      api.createContentReport({
        targetType: targetType!,
        targetId,
        category,
        mediaId: category === "visual_rights" ? selectedMediaId || null : null,
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
        <View className="todam-page-before-footer mx-auto w-full max-w-2xl flex-1 gap-6 px-5 py-7 md:gap-8 md:px-8 md:py-14">
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
                  label="Retour à la recherche"
                  onPress={() => router.replace("/search")}
                  variant="quiet"
                />
              </View>
            </View>
          ) : report.isSuccess ? (
            <View
              accessibilityLiveRegion="polite"
              className="gap-4 rounded-panel border border-success bg-success-soft p-5 md:p-6"
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
                  variant="quiet"
                />
              </View>
            </View>
          ) : (
            <View className="todam-form-panel gap-5 p-5 md:p-6">
              <AccessibleChoiceGroup
                compactGrid
                label="Que concerne votre demande ?"
                onChange={setCategory}
                options={categoryOptions}
                testIdPrefix="content-report-category"
                value={category}
              />
              {category === "visual_rights" ? (
                availableMedia.length > 0 ? (
                  <View className="gap-3">
                    <Text className="text-sm font-semibold text-ink">
                      Affiche concernée
                    </Text>
                    <View className="flex-row flex-wrap gap-3">
                      {availableMedia.map((media) => {
                        const selected = selectedMediaId === media.id;
                        return (
                          <Pressable
                            accessibilityLabel="Sélectionner cette affiche"
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selected }}
                            className={`border-2 p-1 ${
                              selected ? "border-accent" : "border-control"
                            }`}
                            key={media.id}
                            onPress={() => setSelectedMediaId(media.id)}
                          >
                            <Image
                              accessibilityIgnoresInvertColors
                              source={{ uri: media.url }}
                              style={{ height: 144, width: 96 }}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <Text
                    accessibilityRole="alert"
                    className="border-l-2 border-error pl-4 text-sm leading-6 text-error"
                  >
                    Aucune affiche publiée n’est associée à cette fiche.
                  </Text>
                )
              ) : null}
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
                disabled={
                  trimmedReason.length < 10 ||
                  (category === "visual_rights" && !selectedMediaId)
                }
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
      </PageScrollView>
    </>
  );
}
