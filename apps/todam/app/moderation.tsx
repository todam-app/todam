import { useMutation, useQuery } from "@tanstack/react-query";
import {
  TodamApiError,
  type CatalogCandidate,
  type CatalogRevision,
  type CompanyClaim,
  type ContentReport,
} from "@todam/contracts";
import { Button, SectionTitle, TextField } from "@todam/design-system";
import { type Href, useRouter } from "expo-router";
import Head from "expo-router/head";
import { useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";

import { AsyncState } from "../components/AsyncState";
import { AccessibleChoiceGroup } from "../components/AccessibleChoiceGroup";
import { AccessibleTabs } from "../components/AccessibleTabs";
import { LegalFooter } from "../components/LegalFooter";
import { PageScrollView, PageStaticView } from "../components/PageScrollView";
import { PrivatePageHead } from "../components/PrivatePageHead";
import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";

type ModerationTab = "catalog" | "reports" | "claims" | "revisions" | "history";
type MembershipRole = "representative" | "editor" | "manager";

function errorMessage(error: unknown): string {
  if (error instanceof TodamApiError) {
    if (error.problem.status === 403) {
      return "Cet espace est réservé à l’équipe éditoriale Todam.";
    }
    return error.problem.detail;
  }
  return "L’action n’a pas pu être effectuée.";
}

function statusLabel(status: CatalogRevision["status"]): string {
  return {
    draft: "Brouillon",
    submitted: "Soumise",
    approved: "Approuvée",
    rejected: "Refusée",
    superseded: "Ancienne version",
  }[status];
}

function claimStatusLabel(status: CompanyClaim["status"]): string {
  return {
    pending: "En attente",
    approved: "Approuvée",
    rejected: "Refusée",
    revoked: "Révoquée",
  }[status];
}

function reportStatusLabel(status: ContentReport["status"]): string {
  return {
    open: "À examiner",
    reviewing: "En cours",
    resolved: "Résolu",
    dismissed: "Classé sans suite",
  }[status];
}

function reportTargetLabel(targetType: ContentReport["targetType"]): string {
  return {
    production: "Spectacle",
    venue: "Lieu",
    company: "Compagnie",
    member: "Membre",
    list: "Liste",
    review: "Avis",
  }[targetType];
}

function reportCategoryLabel(category: ContentReport["category"]): string {
  return {
    visual_rights: "Affiche ou droits du visuel",
    information: "Description ou informations du spectacle",
    schedule: "Dates, horaires ou lieu",
    other: "Autre",
  }[category];
}

function fieldLabel(field: string): string {
  return (
    {
      name: "Nom",
      shortDescription: "Présentation courte",
      description: "Présentation complète",
      officialUrl: "Lien officiel",
      locality: "Ville",
      countryCode: "Code pays",
      title: "Titre",
      audience: "Public conseillé",
      minimumAge: "Âge minimum conseillé",
      durationMinutes: "Durée",
      language: "Langue",
      "description.short": "Résumé court",
      "description.full": "Description complète",
      credits: "Crédits artistiques",
      performances: "Représentations",
      media: "Visuels",
    }[field] ?? field
  );
}

function rightsStatusLabel(status: string): string {
  return (
    {
      permission_granted: "Autorisation accordée",
      open_license: "Licence ouverte",
      contractual_display: "Affichage autorisé par contrat",
      hotlink_only: "Affichage distant uniquement",
      todam_original: "Contenu original Todam",
      factual_metadata_only: "Métadonnées factuelles uniquement",
      review_required: "Droits à vérifier",
      unknown: "Droits inconnus",
      forbidden: "Publication interdite",
    }[status] ?? status
  );
}

function CatalogCandidateCard({
  candidate,
  onChanged,
}: {
  candidate: CatalogCandidate;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState<"publish" | "hide" | "draft" | null>(
    null,
  );
  const moderate = useMutation({
    mutationFn: (decision: "publish" | "hide" | "draft") =>
      api.moderateCatalogCandidate(candidate.targetType, candidate.id, decision),
    onSuccess: () => {
      setConfirmation(null);
      onChanged();
    },
  });
  const publicPath = (
    candidate.targetType === "company"
      ? `/compagnie/${candidate.slug}`
      : `/production/${candidate.slug}`
  ) as Href;
  const publicationLabel = {
    draft: "Brouillon",
    published: "Publiée",
    hidden: "Masquée",
  }[candidate.publicationStatus];
  const disciplineLabel =
    candidate.discipline === "theatre"
      ? "Théâtre"
      : candidate.discipline === "opera"
        ? "Opéra"
        : candidate.discipline === "ballet"
          ? "Ballet"
          : null;

  return (
    <View className="gap-5 border border-control bg-paper p-5 md:p-6">
      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-xs font-bold uppercase tracking-wide text-accent">
            {candidate.targetType === "company" ? "Compagnie" : "Spectacle"}
            {disciplineLabel ? ` · ${disciplineLabel}` : ""}
          </Text>
          <Text className="font-serif text-xl font-semibold text-ink">
            {candidate.label}
          </Text>
          {candidate.secondaryLabel ? (
            <Text className="text-sm text-muted">{candidate.secondaryLabel}</Text>
          ) : null}
        </View>
        <Text className="text-base border border-accent px-3 py-2 font-semibold text-accent">
          {publicationLabel}
        </Text>
      </View>

      {candidate.readinessIssues.length > 0 ? (
        <View
          accessibilityRole="alert"
          className="gap-2 border-l-2 border-error bg-[#FFF4F2] p-4"
        >
          <Text className="text-base font-semibold text-error">
            Publication bloquée
          </Text>
          {candidate.readinessIssues.map((issue) => (
            <Text className="text-base leading-6 text-ink" key={issue}>
              · {issue}
            </Text>
          ))}
        </View>
      ) : (
        <Text className="border-l-2 border-success pl-4 text-base leading-6 text-success">
          Tous les contrôles de publication sont satisfaits.
        </Text>
      )}

      <View className="gap-2">
        <Text className="text-sm font-semibold text-ink">Sources de la fiche</Text>
        {candidate.sources.length > 0 ? (
          candidate.sources.map((source) => (
            <Pressable
              accessibilityRole="link"
              className="min-h-11 justify-center"
              key={`${candidate.id}-${source.url}`}
              onPress={() => void Linking.openURL(source.url)}
            >
              <Text className="text-base font-semibold text-accent">
                {source.title} ↗
              </Text>
              <Text className="text-xs text-muted">
                Relevée le{" "}
                {new Intl.DateTimeFormat("fr-FR").format(new Date(source.retrievedAt))}
              </Text>
              <Text className="text-xs text-muted">
                {rightsStatusLabel(source.rightsStatus)}
                {source.license ? ` · ${source.license}` : ""}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text className="text-sm text-error">Aucune source rattachée.</Text>
        )}
      </View>

      {candidate.publicationStatus === "published" ? (
        <View className="self-start">
          <Button
            label="Ouvrir la fiche publique"
            onPress={() => router.push(publicPath)}
            variant="ghost"
          />
        </View>
      ) : null}

      {confirmation ? (
        <View className="gap-3 border-t border-line pt-4">
          <Text className="text-base font-semibold text-ink">
            {confirmation === "publish"
              ? "Publier cette fiche maintenant ?"
              : confirmation === "hide"
                ? "Masquer cette fiche du catalogue public ?"
                : "Replacer cette fiche en brouillon ?"}
          </Text>
          <Text className="text-base leading-6 text-muted">
            {confirmation === "publish"
              ? "La fiche deviendra immédiatement accessible dans le catalogue."
              : candidate.targetType === "company"
                ? "Les spectacles publiés qui dépendent de cette compagnie repasseront aussi en brouillon."
                : confirmation === "hide"
                  ? "Le spectacle ne sera plus visible dans le catalogue public."
                  : "Le spectacle quittera le catalogue public jusqu’à une nouvelle validation."}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Button
              label="Confirmer"
              loading={moderate.isPending}
              onPress={() => moderate.mutate(confirmation)}
              variant={confirmation === "publish" ? "primary" : "danger"}
            />
            <Button
              label="Annuler"
              onPress={() => setConfirmation(null)}
              variant="quiet"
            />
          </View>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {candidate.publicationStatus !== "published" ? (
            <Button
              disabled={candidate.readinessIssues.length > 0}
              label="Publier"
              onPress={() => setConfirmation("publish")}
            />
          ) : null}
          {candidate.publicationStatus !== "hidden" ? (
            <Button
              label="Masquer"
              onPress={() => setConfirmation("hide")}
              variant="danger"
            />
          ) : null}
          {candidate.publicationStatus !== "draft" ? (
            <Button
              label="Repasser en brouillon"
              onPress={() => setConfirmation("draft")}
              variant="quiet"
            />
          ) : null}
        </View>
      )}
      {moderate.isError ? (
        <Text accessibilityRole="alert" className="text-base leading-6 text-error">
          {errorMessage(moderate.error)}
        </Text>
      ) : null}
    </View>
  );
}

function ClaimCard({
  claim,
  onChanged,
}: {
  claim: CompanyClaim;
  onChanged: () => void;
}) {
  const [reason, setReason] = useState("");
  const [role, setRole] = useState<MembershipRole>("representative");
  const moderate = useMutation({
    mutationFn: (decision: "approved" | "rejected" | "revoked") =>
      api.moderateCompanyClaim(claim.id, decision, {
        decisionReason: reason,
        membershipRole: role,
      }),
    onSuccess: onChanged,
  });
  return (
    <View className="gap-5 border border-control bg-paper p-5 md:p-6">
      <View className="gap-1">
        <Text className="font-serif text-xl font-semibold text-ink">
          {claim.companyName}
        </Text>
        <Text className="text-sm font-semibold text-accent">
          {claimStatusLabel(claim.status)}
        </Text>
      </View>
      <View className="gap-2">
        <Text className="text-base leading-6 text-ink">
          <Text className="text-base font-semibold">Identité déclarée : </Text>
          {claim.representativeName}
        </Text>
        <Text className="text-base leading-6 text-ink">
          <Text className="text-base font-semibold">Rôle déclaré : </Text>
          {claim.roleTitle}
        </Text>
        <Text className="text-base leading-6 text-ink">
          <Text className="text-base font-semibold">E-mail professionnel : </Text>
          <Text className="todam-wrap-technical text-base">
            {claim.professionalEmail}
          </Text>
        </Text>
        <Pressable
          accessibilityRole="link"
          className="min-h-11 justify-center"
          onPress={() => void Linking.openURL(claim.officialWebsiteUrl)}
        >
          <Text className="text-base font-semibold text-accent">
            Ouvrir le site officiel ↗
          </Text>
        </Pressable>
      </View>
      <View className="border-l-2 border-line pl-4">
        <Text className="text-base leading-7 text-muted">{claim.evidence}</Text>
      </View>
      {claim.status === "pending" ? (
        <AccessibleChoiceGroup
          label="Rôle Todam à attribuer"
          onChange={setRole}
          options={[
            ["representative", "Représentant"],
            ["editor", "Éditeur"],
            ["manager", "Responsable"],
          ]}
          testIdPrefix={`claim-${claim.id}-membership-role`}
          value={role}
        />
      ) : null}
      <TextField
        label={
          claim.status === "approved" ? "Motif de révocation" : "Motif de la décision"
        }
        maxLength={2000}
        multiline
        onChangeText={setReason}
        required
        style={{ minHeight: 110, textAlignVertical: "top" }}
        value={reason}
        webName={`claim-${claim.id}-decision`}
      />
      <View className="flex-row flex-wrap gap-3">
        {claim.status === "pending" ? (
          <>
            <Button
              disabled={reason.trim().length < 10}
              label="Approuver"
              loading={moderate.isPending}
              onPress={() => moderate.mutate("approved")}
            />
            <Button
              disabled={reason.trim().length < 10}
              label="Refuser"
              loading={moderate.isPending}
              onPress={() => moderate.mutate("rejected")}
              variant="danger"
            />
          </>
        ) : claim.status === "approved" ? (
          <Button
            disabled={reason.trim().length < 10}
            label="Révoquer l’accès"
            loading={moderate.isPending}
            onPress={() => moderate.mutate("revoked")}
            variant="danger"
          />
        ) : null}
      </View>
      {moderate.isError ? (
        <Text accessibilityRole="alert" className="text-base leading-6 text-error">
          {errorMessage(moderate.error)}
        </Text>
      ) : null}
    </View>
  );
}

function ReportCard({
  report,
  onChanged,
}: {
  report: ContentReport;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState(report.decision ?? "");
  const moderate = useMutation({
    mutationFn: ({
      contentAction,
      status,
    }: {
      contentAction: "none" | "hide" | "hide_media";
      status: "reviewing" | "resolved" | "dismissed";
    }) =>
      api.moderateContentReport(report.id, status, {
        decision,
        contentAction,
      }),
    onSuccess: onChanged,
  });
  const closed = report.status === "resolved" || report.status === "dismissed";

  return (
    <View className="gap-5 border border-control bg-paper p-5 md:p-6">
      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View className="gap-1">
          <Text className="font-serif text-xl font-semibold text-ink">
            {reportTargetLabel(report.targetType)} · {report.targetLabel}
          </Text>
          <Text className="text-sm text-muted">
            Reçu le{" "}
            {new Intl.DateTimeFormat("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(report.submittedAt))}
          </Text>
        </View>
        <Text className="text-base border border-accent px-3 py-2 font-semibold text-accent">
          {reportStatusLabel(report.status)}
        </Text>
      </View>
      <View className="border-l-2 border-line pl-4">
        <Text className="mb-2 text-sm font-semibold text-accent">
          {reportCategoryLabel(report.category)}
        </Text>
        <Text className="text-base leading-7 text-ink">{report.reason}</Text>
      </View>
      {report.media ? (
        <View className="gap-3 border border-line p-4 md:flex-row md:items-start">
          <Image
            accessibilityIgnoresInvertColors
            source={{ uri: report.media.url }}
            style={{ height: 180, width: 120 }}
          />
          <View className="min-w-0 flex-1 gap-2">
            <Text className="text-sm font-semibold text-ink">Affiche signalée</Text>
            {report.media.credit ? (
              <Text className="text-sm text-muted">Crédit : {report.media.credit}</Text>
            ) : null}
            <Pressable
              accessibilityRole="link"
              className="min-h-11 justify-center"
              onPress={() => void Linking.openURL(report.media!.sourceUrl)}
            >
              <Text className="text-sm font-semibold text-accent">
                Ouvrir la source du visuel ↗
              </Text>
            </Pressable>
            {report.contribution ? (
              <View className="gap-1">
                <Text className="text-sm text-muted">
                  Contribution communautaire · {report.contribution.status}
                </Text>
                <Pressable
                  accessibilityRole="link"
                  className="min-h-11 justify-center"
                  onPress={() => void Linking.openURL(report.contribution!.sourceUrl)}
                >
                  <Text className="text-sm font-semibold text-accent">
                    Source officielle de la contribution ↗
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
      {report.targetPath ? (
        <View className="self-start">
          <Button
            label="Ouvrir le contenu concerné"
            onPress={() => router.push(report.targetPath as Href)}
            variant="ghost"
          />
        </View>
      ) : (
        <Text className="text-sm text-muted">
          Le contenu d’origine n’est plus disponible.
        </Text>
      )}
      {closed ? (
        <View className="gap-2 border-t border-line pt-4">
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
            Décision motivée
          </Text>
          <Text className="text-base leading-7 text-muted">{report.decision}</Text>
        </View>
      ) : (
        <>
          <TextField
            label={
              report.status === "open"
                ? "Note de prise en charge ou décision"
                : "Décision finale"
            }
            maxLength={2000}
            multiline
            onChangeText={setDecision}
            required
            style={{ minHeight: 110, textAlignVertical: "top" }}
            value={decision}
            webName={`report-${report.id}-decision`}
          />
          <View className="flex-row flex-wrap gap-3">
            {report.status === "open" ? (
              <Button
                disabled={decision.trim().length < 10}
                label="Prendre en charge"
                loading={moderate.isPending}
                onPress={() =>
                  moderate.mutate({
                    contentAction: "none",
                    status: "reviewing",
                  })
                }
                variant="secondary"
              />
            ) : (
              <Button
                disabled={decision.trim().length < 10}
                label="Marquer comme résolu"
                loading={moderate.isPending}
                onPress={() =>
                  moderate.mutate({
                    contentAction: "none",
                    status: "resolved",
                  })
                }
              />
            )}
            {report.canHide ? (
              <Button
                disabled={decision.trim().length < 10}
                label="Masquer le contenu et résoudre"
                loading={moderate.isPending}
                onPress={() =>
                  moderate.mutate({
                    contentAction: "hide",
                    status: "resolved",
                  })
                }
                variant="danger"
              />
            ) : null}
            {report.canHideMedia ? (
              <Button
                disabled={decision.trim().length < 10}
                label="Masquer cette affiche et résoudre"
                loading={moderate.isPending}
                onPress={() =>
                  moderate.mutate({
                    contentAction: "hide_media",
                    status: "resolved",
                  })
                }
                variant="danger"
              />
            ) : null}
            <Button
              disabled={decision.trim().length < 10}
              label="Classer sans suite"
              loading={moderate.isPending}
              onPress={() =>
                moderate.mutate({
                  contentAction: "none",
                  status: "dismissed",
                })
              }
              variant="quiet"
            />
          </View>
        </>
      )}
      {moderate.isError ? (
        <Text accessibilityRole="alert" className="text-base leading-6 text-error">
          {errorMessage(moderate.error)}
        </Text>
      ) : null}
    </View>
  );
}

function RevisionCard({
  revision,
  onChanged,
}: {
  revision: CatalogRevision;
  onChanged: () => void;
}) {
  const [reason, setReason] = useState("");
  const review = useMutation({
    mutationFn: (decision: "approved" | "rejected") =>
      api.reviewCatalogRevision(revision.id, decision, {
        decisionReason: reason,
      }),
    onSuccess: onChanged,
  });
  const restore = useMutation({
    mutationFn: () =>
      api.restoreCatalogRevision(revision.id, { decisionReason: reason }),
    onSuccess: onChanged,
  });
  return (
    <View className="gap-5 border border-control bg-paper p-5 md:p-6">
      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View className="gap-1">
          <Text className="font-serif text-xl font-semibold text-ink">
            Révision {revision.id.slice(0, 8)}
          </Text>
          <Text className="text-sm text-muted">
            {revision.targetType === "company" ? "Compagnie" : "Spectacle"} ·{" "}
            {revision.changes.length} changement
            {revision.changes.length > 1 ? "s" : ""}
          </Text>
        </View>
        <Text className="text-base border border-accent px-3 py-2 font-semibold text-accent">
          {statusLabel(revision.status)}
        </Text>
      </View>
      {revision.justification ? (
        <Text className="border-l-2 border-line pl-4 text-base leading-6 text-muted">
          {revision.justification}
        </Text>
      ) : null}
      <View className="gap-4">
        {revision.changes.map((change) => (
          <View className="gap-2 border-t border-line pt-4" key={change.id}>
            <Text className="text-base font-semibold text-ink">
              {fieldLabel(change.field)}
            </Text>
            <View className="gap-2 md:flex-row md:gap-6">
              <View className="min-w-0 flex-1">
                <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Avant
                </Text>
                <Text className="mt-1 text-base leading-6 text-muted">
                  {typeof change.oldValue === "string"
                    ? change.oldValue
                    : JSON.stringify(change.oldValue)}
                </Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-xs font-semibold uppercase tracking-wide text-accent">
                  Après
                </Text>
                <Text className="mt-1 text-base leading-6 text-ink">
                  {typeof change.newValue === "string"
                    ? change.newValue
                    : JSON.stringify(change.newValue)}
                </Text>
              </View>
            </View>
            {change.provenanceUrl ? (
              <Pressable
                accessibilityRole="link"
                className="min-h-11 justify-center"
                onPress={() => void Linking.openURL(change.provenanceUrl!)}
              >
                <Text className="text-base font-semibold text-accent">
                  Vérifier la source
                </Text>
              </Pressable>
            ) : null}
            {change.rightsStatus ? (
              <Text className="text-sm text-muted">
                Droits : {rightsStatusLabel(change.rightsStatus)}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      <TextField
        label={
          revision.status === "submitted"
            ? "Motif de la décision"
            : "Motif de la restauration"
        }
        maxLength={2000}
        multiline
        onChangeText={setReason}
        required
        style={{ minHeight: 110, textAlignVertical: "top" }}
        value={reason}
        webName={`revision-${revision.id}-decision`}
      />
      {revision.status === "submitted" ? (
        <View className="flex-row flex-wrap gap-3">
          <Button
            disabled={reason.trim().length < 10}
            label="Approuver et publier"
            loading={review.isPending}
            onPress={() => review.mutate("approved")}
          />
          <Button
            disabled={reason.trim().length < 10}
            label="Refuser"
            loading={review.isPending}
            onPress={() => review.mutate("rejected")}
            variant="danger"
          />
        </View>
      ) : revision.status === "approved" || revision.status === "superseded" ? (
        <View className="self-start">
          <Button
            disabled={reason.trim().length < 10}
            label="Restaurer cette version"
            loading={restore.isPending}
            onPress={() => restore.mutate()}
            variant="quiet"
          />
        </View>
      ) : null}
      {review.isError || restore.isError ? (
        <Text accessibilityRole="alert" className="text-base leading-6 text-error">
          {errorMessage(review.error ?? restore.error)}
        </Text>
      ) : null}
    </View>
  );
}

export default function ModerationPage() {
  const session = authClient.useSession();
  const router = useRouter();
  const [tab, setTab] = useState<ModerationTab>("catalog");
  const catalogCandidates = useQuery({
    queryKey: ["admin-catalog-candidates"],
    queryFn: () =>
      api.getAdminCatalogCandidates({
        status: "all",
        type: "all",
        limit: 100,
      }),
    enabled: Boolean(session.data),
  });
  const reports = useQuery({
    queryKey: ["admin-content-reports"],
    queryFn: () => api.getAdminContentReports("all"),
    enabled: Boolean(session.data),
  });
  const claims = useQuery({
    queryKey: ["admin-company-claims"],
    queryFn: () => api.getAdminCompanyClaims("all"),
    enabled: Boolean(session.data),
  });
  const revisions = useQuery({
    queryKey: ["admin-catalog-revisions"],
    queryFn: () => api.getAdminCatalogRevisions("all"),
    enabled: Boolean(session.data),
  });
  const refetch = () => {
    void catalogCandidates.refetch();
    void reports.refetch();
    void claims.refetch();
    void revisions.refetch();
  };

  if (session.isPending) {
    return (
      <>
        <PrivatePageHead title="Modération" />
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
        <PrivatePageHead title="Modération" />
        <PageScrollView contentContainerClassName="flex-grow">
          <View className="todam-page-before-footer mx-auto w-full max-w-xl flex-1 items-center justify-center gap-4 px-5">
            <SectionTitle level={1}>Connexion requise</SectionTitle>
            <Button
              label="Se connecter"
              onPress={() =>
                router.push({
                  pathname: "/sign-in",
                  params: { returnTo: "/moderation" },
                })
              }
            />
          </View>
          <LegalFooter />
        </PageScrollView>
      </>
    );
  }

  const pendingClaims =
    claims.data?.filter((claim) => claim.status === "pending") ?? [];
  const draftCatalog =
    catalogCandidates.data?.filter(
      (candidate) => candidate.publicationStatus === "draft",
    ) ?? [];
  const pendingReports =
    reports.data?.filter((report) => ["open", "reviewing"].includes(report.status)) ??
    [];
  const reportHistory =
    reports.data?.filter((report) =>
      ["resolved", "dismissed"].includes(report.status),
    ) ?? [];
  const approvedClaims =
    claims.data?.filter((claim) => claim.status === "approved") ?? [];
  const pendingRevisions =
    revisions.data?.filter((revision) => revision.status === "submitted") ?? [];
  const revisionHistory =
    revisions.data?.filter((revision) =>
      ["approved", "rejected", "superseded"].includes(revision.status),
    ) ?? [];
  const accessError =
    (catalogCandidates.error instanceof TodamApiError &&
      catalogCandidates.error.problem.status === 403) ||
    (reports.error instanceof TodamApiError && reports.error.problem.status === 403) ||
    (claims.error instanceof TodamApiError && claims.error.problem.status === 403) ||
    (revisions.error instanceof TodamApiError &&
      revisions.error.problem.status === 403);

  return (
    <>
      <Head>
        <title>Modération | Todam</title>
        <meta content="noindex,nofollow" name="robots" />
      </Head>
      <PageScrollView contentContainerClassName="flex-grow">
        <View className="todam-page-before-footer mx-auto w-full max-w-4xl flex-1 gap-8 px-5 py-10 md:px-8 md:py-14">
          <SectionTitle eyebrow="Équipe Todam" level={1}>
            Modération éditoriale
          </SectionTitle>
          {accessError ? (
            <Text
              accessibilityRole="alert"
              className="border-l-2 border-error pl-4 text-base leading-7 text-error"
            >
              Cet espace est réservé aux rôles éditoriaux autorisés côté serveur.
            </Text>
          ) : (
            <>
              <AccessibleTabs
                appearance="boxed"
                label="Files de modération"
                onChange={setTab}
                tabs={[
                  { value: "catalog", label: `Catalogue (${draftCatalog.length})` },
                  {
                    value: "reports",
                    label: `Corrections (${pendingReports.length})`,
                  },
                  {
                    value: "claims",
                    label: `Revendications (${pendingClaims.length})`,
                  },
                  {
                    value: "revisions",
                    label: `Révisions (${pendingRevisions.length})`,
                  },
                  { value: "history", label: "Historique" },
                ]}
                testIdPrefix="moderation-tab"
                value={tab}
              />
              <AsyncState
                empty={
                  !reports.isPending &&
                  !catalogCandidates.isPending &&
                  !claims.isPending &&
                  !revisions.isPending &&
                  ((tab === "catalog" && (catalogCandidates.data?.length ?? 0) === 0) ||
                    (tab === "reports" && pendingReports.length === 0) ||
                    (tab === "claims" && pendingClaims.length === 0) ||
                    (tab === "revisions" && pendingRevisions.length === 0) ||
                    (tab === "history" &&
                      approvedClaims.length === 0 &&
                      revisionHistory.length === 0 &&
                      reportHistory.length === 0))
                }
                emptyMessage="Aucun élément dans cette file."
                error={
                  catalogCandidates.isError ||
                  reports.isError ||
                  claims.isError ||
                  revisions.isError
                }
                loading={
                  catalogCandidates.isPending ||
                  reports.isPending ||
                  claims.isPending ||
                  revisions.isPending
                }
                onRetry={refetch}
              >
                <View className="gap-6">
                  {tab === "catalog"
                    ? catalogCandidates.data?.map((candidate) => (
                        <CatalogCandidateCard
                          candidate={candidate}
                          key={`${candidate.targetType}-${candidate.id}`}
                          onChanged={refetch}
                        />
                      ))
                    : null}
                  {tab === "reports"
                    ? pendingReports.map((report) => (
                        <ReportCard
                          key={report.id}
                          onChanged={refetch}
                          report={report}
                        />
                      ))
                    : null}
                  {tab === "claims"
                    ? pendingClaims.map((claim) => (
                        <ClaimCard claim={claim} key={claim.id} onChanged={refetch} />
                      ))
                    : null}
                  {tab === "revisions"
                    ? pendingRevisions.map((revision) => (
                        <RevisionCard
                          key={revision.id}
                          onChanged={refetch}
                          revision={revision}
                        />
                      ))
                    : null}
                  {tab === "history" ? (
                    <>
                      {reportHistory.map((report) => (
                        <ReportCard
                          key={report.id}
                          onChanged={refetch}
                          report={report}
                        />
                      ))}
                      {approvedClaims.map((claim) => (
                        <ClaimCard claim={claim} key={claim.id} onChanged={refetch} />
                      ))}
                      {revisionHistory.map((revision) => (
                        <RevisionCard
                          key={revision.id}
                          onChanged={refetch}
                          revision={revision}
                        />
                      ))}
                    </>
                  ) : null}
                </View>
              </AsyncState>
            </>
          )}
        </View>
        <LegalFooter />
      </PageScrollView>
    </>
  );
}
