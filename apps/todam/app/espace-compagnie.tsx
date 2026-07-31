import { useMutation, useQuery } from "@tanstack/react-query";
import {
  TodamApiError,
  type CatalogRevision,
  type CompanyMembership,
  type CreditRole,
  type Discipline,
  type RevisionChangeInput,
  type RightsStatus,
  type VenueSummary,
} from "@todam/contracts";
import {
  Button,
  PosterPlaceholder,
  SectionTitle,
  TextField,
} from "@todam/design-system";
import { useRouter } from "expo-router";
import Head from "expo-router/head";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";

import { AccessibleChoiceGroup } from "../components/AccessibleChoiceGroup";
import { AsyncState } from "../components/AsyncState";
import { PageScrollView, PageStaticView } from "../components/PageScrollView";
import { PrivatePageHead } from "../components/PrivatePageHead";
import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { isIsoCalendarDate } from "../lib/dates";

type TargetMode = "company" | "production";

type CompanyForm = {
  name: string;
  shortDescription: string;
  description: string;
  officialUrl: string;
  locality: string;
  countryCode: string;
};

type ProductionForm = {
  title: string;
  discipline: Discipline;
  audience: "general" | "family" | "children";
  minimumAge: string;
  durationMinutes: string;
  language: string;
  officialUrl: string;
  shortDescription: string;
  fullDescription: string;
  shortDescriptionSource: string;
  fullDescriptionSource: string;
  shortDescriptionLicense: string;
  fullDescriptionLicense: string;
  shortDescriptionRights: RightsStatus;
  fullDescriptionRights: RightsStatus;
};

type CreditDraft = {
  key: string;
  artistId: string | null;
  name: string;
  role: CreditRole;
  label: string;
};

type PerformanceDraft = {
  key: string;
  venueId: string;
  venueLabel: string;
  startsAt: string;
  endsAt: string;
  status: "scheduled" | "cancelled" | "postponed";
  officialUrl: string;
};

type MediaDraft = {
  key: string;
  assetId: string | null;
  remoteUrl: string;
  kind: "poster" | "key_visual" | "photo" | "logo";
  alt: string;
  credit: string;
  copyrightHolder: string;
  rightsStatus:
    "permission_granted" | "open_license" | "contractual_display" | "hotlink_only";
  storagePolicy: "hotlink" | "mirror";
  termsUrl: string;
  license: string;
  validUntil: string;
};

const emptyCompanyForm: CompanyForm = {
  name: "",
  shortDescription: "",
  description: "",
  officialUrl: "",
  locality: "",
  countryCode: "FR",
};

const emptyProductionForm: ProductionForm = {
  title: "",
  discipline: "theatre",
  audience: "general",
  minimumAge: "",
  durationMinutes: "",
  language: "",
  officialUrl: "",
  shortDescription: "",
  fullDescription: "",
  shortDescriptionSource: "",
  fullDescriptionSource: "",
  shortDescriptionLicense: "",
  fullDescriptionLicense: "",
  shortDescriptionRights: "permission_granted",
  fullDescriptionRights: "permission_granted",
};

const creditRoleOptions = [
  ["author", "Auteur·ice"],
  ["director", "Mise en scène"],
  ["performer", "Interprète"],
  ["choreographer", "Chorégraphe"],
  ["composer", "Compositeur·ice"],
  ["musical_director", "Direction musicale"],
  ["designer", "Conception"],
  ["other", "Autre"],
] as const;

const rightsOptions = [
  ["permission_granted", "Texte transmis avec autorisation"],
  ["open_license", "Licence ouverte"],
  ["todam_original", "Texte Todam existant, non modifié"],
] as const;

const mediaRightsOptions = [
  ["permission_granted", "Autorisation de publier"],
  ["contractual_display", "Droit contractuel"],
  ["open_license", "Licence ouverte"],
  ["hotlink_only", "Lien distant uniquement"],
] as const;

const membershipRoleLabels = {
  representative: "Représentant",
  editor: "Éditeur",
  manager: "Responsable",
} as const;

function uniqueKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function draftRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function draftString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readableError(error: unknown): string {
  if (error instanceof TodamApiError) return error.problem.detail;
  return "La révision n’a pas pu être enregistrée. Vérifiez les champs.";
}

function descriptionRightsComplete(
  body: string,
  rightsStatus: RightsStatus,
  sourceUrl: string,
  license: string,
): boolean {
  if (!body.trim()) return true;
  if (rightsStatus === "todam_original") return true;
  if (!isHttpUrl(sourceUrl.trim())) return false;
  return rightsStatus !== "open_license" || Boolean(license.trim());
}

function formatRevisionValue(value: unknown): string {
  if (value === null || value === "") return "Non renseigné";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value))
    return `${value.length} élément${value.length > 1 ? "s" : ""}`;
  if (typeof value === "object") {
    const body = (value as { body?: unknown }).body;
    if (typeof body === "string") return body;
  }
  return JSON.stringify(value);
}

const revisionFieldLabels: Record<string, string> = {
  name: "Nom de la compagnie",
  shortDescription: "Présentation courte",
  description: "Présentation complète",
  officialUrl: "Lien officiel",
  locality: "Ville",
  countryCode: "Pays",
  title: "Titre du spectacle",
  discipline: "Discipline",
  audience: "Public conseillé",
  minimumAge: "Âge minimum conseillé",
  durationMinutes: "Durée",
  language: "Langue",
  "description.short": "Résumé court",
  "description.full": "Description complète",
  credits: "Crédits artistiques",
  performances: "Dates de tournée",
  media: "Visuels et droits",
};

function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isCleanEditorialTitle(value: string): boolean {
  return (
    value.length > 0 &&
    value === value.trim() &&
    !/[\n\r\t]|\s{2,}/u.test(value) &&
    !/[-–—|:]\s*(compagnie|cie\.?|classe|durée|mise en scène|\d+\s*(?:min|mn))/iu.test(
      value,
    )
  );
}

function isZonedDateTime(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) && !Number.isNaN(new Date(value).getTime())
  );
}

function isDateOnly(value: string): boolean {
  return isIsoCalendarDate(value);
}

function isFutureDateOnly(value: string): boolean {
  return isDateOnly(value) && new Date(`${value}T23:59:59.999Z`).getTime() > Date.now();
}

function previewDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Date à compléter";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function DraftVisualPreview({
  companyForm,
  credits,
  media,
  performances,
  productionForm,
  targetMode,
}: {
  companyForm: CompanyForm;
  credits: CreditDraft[];
  media: MediaDraft[];
  performances: PerformanceDraft[];
  productionForm: ProductionForm;
  targetMode: TargetMode;
}) {
  if (targetMode === "company") {
    return (
      <View className="gap-6 border-y border-line bg-canvas py-7">
        <View className="max-w-3xl gap-3">
          <Text className="text-xs font-bold uppercase tracking-widest text-brand-text">
            Aperçu privé · compagnie
          </Text>
          <Text
            aria-level={3}
            accessibilityRole="header"
            className="font-serif text-4xl font-semibold leading-[46px] text-ink"
          >
            {companyForm.name || "Nom de la compagnie"}
          </Text>
          {companyForm.locality || companyForm.countryCode ? (
            <Text className="text-sm font-semibold text-muted">
              {[companyForm.locality, companyForm.countryCode]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          ) : null}
          {companyForm.shortDescription ? (
            <Text className="text-lg leading-7 text-ink">
              {companyForm.shortDescription}
            </Text>
          ) : null}
          {companyForm.description ? (
            <Text className="max-w-[72ch] text-base leading-7 text-muted">
              {companyForm.description}
            </Text>
          ) : null}
          {companyForm.officialUrl ? (
            <Text className="todam-wrap-technical text-sm font-semibold text-brand-text">
              {companyForm.officialUrl}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View className="gap-8 border-y border-line bg-canvas py-7">
      <View className="gap-6 md:flex-row md:items-start">
        <View className="w-40 overflow-hidden rounded-media bg-placeholder">
          {media[0] && isHttpUrl(media[0].remoteUrl) ? (
            <Image
              accessibilityLabel={
                media[0].alt || `Aperçu du visuel de ${productionForm.title}`
              }
              className="aspect-[148/210] w-full bg-placeholder"
              resizeMode="contain"
              source={{ uri: media[0].remoteUrl }}
            />
          ) : (
            <PosterPlaceholder
              discipline={productionForm.discipline}
              title={productionForm.title || "Brouillon sans titre"}
            />
          )}
        </View>
        <View className="min-w-0 flex-1 gap-3">
          <Text className="text-xs font-bold uppercase tracking-widest text-brand-text">
            Aperçu privé ·{" "}
            {productionForm.discipline === "theatre"
              ? "Théâtre"
              : productionForm.discipline === "opera"
                ? "Opéra"
                : "Ballet"}
          </Text>
          <Text
            aria-level={3}
            accessibilityRole="header"
            className="font-serif text-4xl font-semibold leading-[46px] text-ink"
          >
            {productionForm.title || "Titre du spectacle"}
          </Text>
          {productionForm.shortDescription ? (
            <Text className="max-w-[72ch] text-lg leading-7 text-ink">
              {productionForm.shortDescription}
            </Text>
          ) : null}
          <Text className="text-sm text-muted">
            {[
              productionForm.durationMinutes
                ? `${productionForm.durationMinutes} min`
                : null,
              productionForm.language || null,
              productionForm.minimumAge ? `Dès ${productionForm.minimumAge} ans` : null,
              productionForm.audience === "general"
                ? "Tout public"
                : productionForm.audience === "family"
                  ? "En famille"
                  : "Jeune public",
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      </View>

      {productionForm.fullDescription ? (
        <View className="max-w-[72ch] gap-2">
          <Text className="font-serif text-2xl font-semibold text-ink">
            À propos du spectacle
          </Text>
          <Text className="text-base leading-7 text-ink">
            {productionForm.fullDescription}
          </Text>
        </View>
      ) : null}

      {credits.length > 0 ? (
        <View className="gap-2 border-t border-line pt-5">
          <Text className="font-serif text-2xl font-semibold text-ink">
            Crédits artistiques
          </Text>
          {credits.map((credit) => (
            <View
              className="gap-1 border-b border-line py-2 md:flex-row"
              key={credit.key}
            >
              <Text className="w-48 text-sm font-semibold text-muted">
                {credit.label ||
                  creditRoleOptions.find(([role]) => role === credit.role)?.[1]}
              </Text>
              <Text className="text-base flex-1 text-ink">{credit.name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {performances.length > 0 ? (
        <View className="gap-2 border-t border-line pt-5">
          <Text className="font-serif text-2xl font-semibold text-ink">
            Prochaines représentations
          </Text>
          {performances.map((performance) => (
            <View className="border-b border-line py-3" key={performance.key}>
              <Text className="text-base font-semibold text-ink">
                {previewDate(performance.startsAt)}
              </Text>
              <Text className="text-sm text-muted">
                {performance.venueLabel || "Lieu à compléter"}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {media.length > 0 ? (
        <Text className="text-xs leading-5 text-muted">
          Aperçu privé : aucun visuel ne devient public avant la validation de ses
          droits par Todam.
        </Text>
      ) : null}
    </View>
  );
}

function revisionStatusLabel(status: CatalogRevision["status"]): string {
  switch (status) {
    case "draft":
      return "Brouillon";
    case "submitted":
      return "Soumise";
    case "approved":
      return "Approuvée";
    case "rejected":
      return "Refusée";
    case "superseded":
      return "Remplacée";
  }
}

function ChoiceButtons<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  const groupId = useId().replace(/:/g, "");
  return (
    <AccessibleChoiceGroup
      label={label}
      onChange={onChange}
      options={options}
      testIdPrefix={`professional-choice-${groupId}`}
      value={value}
    />
  );
}

function RevisionPreview({ revision }: { revision: CatalogRevision }) {
  return (
    <View className="todam-management-panel gap-4 p-5 md:p-6">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <View className="gap-1">
          <Text className="font-serif text-xl font-semibold text-ink">
            Révision {revision.id.slice(0, 8)}
          </Text>
          <Text className="text-sm text-muted">
            {revision.targetType === "company" ? "Fiche compagnie" : "Spectacle"}
          </Text>
        </View>
        <View className="rounded-full border border-selected-border bg-selected px-3 py-2">
          <Text className="text-sm font-semibold text-accent">
            {revisionStatusLabel(revision.status)}
          </Text>
        </View>
      </View>
      {revision.changes.map((change) => (
        <View className="gap-2 border-t border-line pt-4" key={change.id}>
          <Text className="text-sm font-semibold text-ink">
            {revisionFieldLabels[change.field] ?? change.field}
          </Text>
          <View className="gap-1 md:flex-row md:gap-6">
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
                Version publique
              </Text>
              <Text className="todam-wrap-technical mt-1 text-base leading-6 text-muted">
                {formatRevisionValue(change.oldValue)}
              </Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-accent">
                Brouillon
              </Text>
              <Text className="todam-wrap-technical mt-1 text-base leading-6 text-ink">
                {formatRevisionValue(change.newValue)}
              </Text>
            </View>
          </View>
          {change.provenanceUrl ? (
            <Text className="todam-wrap-technical text-xs leading-5 text-muted">
              Source : {change.provenanceUrl}
            </Text>
          ) : null}
        </View>
      ))}
      {revision.justification ? (
        <Text className="border-l-2 border-line pl-3 text-base leading-6 text-muted">
          Motif : {revision.justification}
        </Text>
      ) : null}
      {revision.decisionReason ? (
        <Text className="rounded-todam border border-selected-border bg-selected p-4 text-base leading-6 text-muted">
          Décision Todam : {revision.decisionReason}
        </Text>
      ) : null}
    </View>
  );
}

function VenuePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (venue: VenueSummary) => void;
}) {
  const [query, setQuery] = useState("");
  const venues = useQuery({
    queryKey: ["professional-venue-search", query],
    queryFn: () => api.searchCatalog({ q: query.trim(), type: "venues", limit: 8 }),
    enabled: query.trim().length >= 2,
  });
  return (
    <View className="gap-3">
      {value ? (
        <Text className="border-l-2 border-success pl-3 text-base leading-6 text-ink">
          Lieu choisi : {value}
        </Text>
      ) : null}
      <TextField
        autoCapitalize="words"
        label="Rechercher un lieu Todam"
        onChangeText={setQuery}
        placeholder="Nom du théâtre ou ville"
        value={query}
        webName="venue-search"
      />
      {(venues.data?.venues.length ?? 0) > 0 ? (
        <View className="overflow-hidden rounded-panel border border-line bg-paper">
          {venues.data?.venues.map((venue) => (
            <Pressable
              accessibilityRole="button"
              className="min-h-11 justify-center border-b border-line px-3 py-2 last:border-b-0"
              key={venue.id}
              onPress={() => {
                onChange(venue);
                setQuery("");
              }}
            >
              <Text className="text-base font-semibold text-ink">{venue.name}</Text>
              <Text className="text-sm text-muted">{venue.locality}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CompanyFields({
  form,
  onChange,
}: {
  form: CompanyForm;
  onChange: (next: CompanyForm) => void;
}) {
  const update = <K extends keyof CompanyForm>(field: K, value: CompanyForm[K]) =>
    onChange({ ...form, [field]: value });
  return (
    <View className="gap-5">
      <TextField
        label="Nom public de la compagnie"
        onChangeText={(value) => update("name", value)}
        required
        value={form.name}
        webName="company-name"
      />
      <TextField
        label="Présentation courte"
        maxLength={500}
        multiline
        onChangeText={(value) => update("shortDescription", value)}
        style={{ minHeight: 100, textAlignVertical: "top" }}
        value={form.shortDescription}
        webName="company-short-description"
      />
      <TextField
        label="Présentation complète"
        maxLength={5000}
        multiline
        onChangeText={(value) => update("description", value)}
        style={{ minHeight: 180, textAlignVertical: "top" }}
        value={form.description}
        webName="company-description"
      />
      <TextField
        autoCapitalize="none"
        autoComplete="url"
        error={
          form.officialUrl && !isHttpUrl(form.officialUrl)
            ? "Saisissez une URL HTTP ou HTTPS complète."
            : undefined
        }
        inputMode="url"
        label="Site officiel"
        onChangeText={(value) => update("officialUrl", value)}
        placeholder="https://…"
        value={form.officialUrl}
        webName="company-url"
      />
      <View className="gap-5 md:flex-row">
        <View className="flex-1">
          <TextField
            autoCapitalize="words"
            label="Ville"
            onChangeText={(value) => update("locality", value)}
            value={form.locality}
            webName="company-locality"
          />
        </View>
        <View className="md:w-36">
          <TextField
            autoCapitalize="characters"
            error={
              form.countryCode && !/^[A-Z]{2}$/.test(form.countryCode)
                ? "Utilisez un code pays à deux lettres."
                : undefined
            }
            label="Code pays"
            maxLength={2}
            onChangeText={(value) => update("countryCode", value.toUpperCase())}
            value={form.countryCode}
            webName="company-country"
          />
        </View>
      </View>
    </View>
  );
}

function ProductionFields({
  credits,
  form,
  media,
  performances,
  onCreditsChange,
  onFormChange,
  onMediaChange,
  onPerformancesChange,
}: {
  credits: CreditDraft[];
  form: ProductionForm;
  media: MediaDraft[];
  performances: PerformanceDraft[];
  onCreditsChange: (next: CreditDraft[]) => void;
  onFormChange: (next: ProductionForm) => void;
  onMediaChange: (next: MediaDraft[]) => void;
  onPerformancesChange: (next: PerformanceDraft[]) => void;
}) {
  const update = <K extends keyof ProductionForm>(field: K, value: ProductionForm[K]) =>
    onFormChange({ ...form, [field]: value });
  const updateDescription = (
    field: "shortDescription" | "fullDescription",
    value: string,
  ) => {
    const rightsField =
      field === "shortDescription" ? "shortDescriptionRights" : "fullDescriptionRights";
    const sourceField =
      field === "shortDescription" ? "shortDescriptionSource" : "fullDescriptionSource";
    onFormChange({
      ...form,
      [field]: value,
      ...(form[rightsField] === "todam_original" && value !== form[field]
        ? {
            [rightsField]: "permission_granted",
            [sourceField]: form[sourceField] || form.officialUrl,
          }
        : {}),
    });
  };

  return (
    <View className="gap-9">
      <View className="gap-5">
        <Text className="font-serif text-xl font-semibold text-ink">
          Informations principales
        </Text>
        <TextField
          error={
            form.title && !isCleanEditorialTitle(form.title)
              ? "Gardez uniquement le titre : séparez compagnie, crédits, durée et informations techniques."
              : undefined
          }
          label="Titre du spectacle"
          onChangeText={(value) => update("title", value)}
          required
          value={form.title}
          webName="production-title"
        />
        <ChoiceButtons
          label="Discipline"
          onChange={(value) => update("discipline", value)}
          options={[
            ["theatre", "Théâtre"],
            ["opera", "Opéra"],
            ["ballet", "Ballet"],
          ]}
          value={form.discipline}
        />
        <ChoiceButtons
          label="Public conseillé"
          onChange={(value) => update("audience", value)}
          options={[
            ["general", "Tout public"],
            ["family", "Famille"],
            ["children", "Jeune public"],
          ]}
          value={form.audience}
        />
        <View className="gap-5 md:flex-row">
          <View className="flex-1">
            <TextField
              inputMode="numeric"
              keyboardType="number-pad"
              label="Âge minimum conseillé"
              maxLength={2}
              onChangeText={(value) => update("minimumAge", value.replace(/\D/g, ""))}
              value={form.minimumAge}
              webName="production-minimum-age"
            />
          </View>
          <View className="flex-1">
            <TextField
              inputMode="numeric"
              keyboardType="number-pad"
              label="Durée en minutes"
              onChangeText={(value) =>
                update("durationMinutes", value.replace(/\D/g, ""))
              }
              value={form.durationMinutes}
              webName="production-duration"
            />
          </View>
          <View className="flex-1">
            <TextField
              label="Langue"
              onChangeText={(value) => update("language", value)}
              placeholder="Français"
              value={form.language}
              webName="production-language"
            />
          </View>
        </View>
        <TextField
          autoCapitalize="none"
          autoComplete="url"
          error={
            form.officialUrl && !isHttpUrl(form.officialUrl)
              ? "Saisissez une URL HTTP ou HTTPS complète."
              : undefined
          }
          inputMode="url"
          label="Lien officiel du spectacle"
          onChangeText={(value) => update("officialUrl", value)}
          placeholder="https://…"
          value={form.officialUrl}
          webName="production-url"
        />
      </View>

      <View className="gap-5 border-t border-line pt-7">
        <Text className="font-serif text-xl font-semibold text-ink">
          Descriptions et provenance
        </Text>
        <Text className="max-w-[70ch] text-base leading-6 text-muted">
          Un texte rédigé ou transmis par la compagnie utilise « Autorisation » et
          indique une page officielle comme provenance. Le statut « Texte Todam » est
          réservé à un résumé éditorial Todam laissé inchangé.
        </Text>
        <TextField
          label="Résumé court"
          maxLength={700}
          multiline
          onChangeText={(value) => updateDescription("shortDescription", value)}
          style={{ minHeight: 110, textAlignVertical: "top" }}
          value={form.shortDescription}
          webName="production-short-description"
        />
        <ChoiceButtons
          label="Droits du résumé"
          onChange={(value) => update("shortDescriptionRights", value)}
          options={rightsOptions}
          value={form.shortDescriptionRights}
        />
        <TextField
          autoCapitalize="none"
          error={
            form.shortDescription.trim() &&
            form.shortDescriptionRights !== "todam_original" &&
            !isHttpUrl(form.shortDescriptionSource)
              ? "Une page de provenance HTTP ou HTTPS est obligatoire."
              : undefined
          }
          inputMode="url"
          label="Page de provenance du résumé"
          onChangeText={(value) => update("shortDescriptionSource", value)}
          placeholder="https://…"
          value={form.shortDescriptionSource}
          webName="production-short-description-source"
        />
        {form.shortDescriptionRights === "open_license" ? (
          <TextField
            label="Nom de la licence du résumé"
            onChangeText={(value) => update("shortDescriptionLicense", value)}
            placeholder="Ex. CC BY 4.0"
            required
            value={form.shortDescriptionLicense}
            webName="production-short-description-license"
          />
        ) : null}
        <TextField
          label="Description complète"
          maxLength={8000}
          multiline
          onChangeText={(value) => updateDescription("fullDescription", value)}
          style={{ minHeight: 190, textAlignVertical: "top" }}
          value={form.fullDescription}
          webName="production-full-description"
        />
        <ChoiceButtons
          label="Droits de la description"
          onChange={(value) => update("fullDescriptionRights", value)}
          options={rightsOptions}
          value={form.fullDescriptionRights}
        />
        <TextField
          autoCapitalize="none"
          error={
            form.fullDescription.trim() &&
            form.fullDescriptionRights !== "todam_original" &&
            !isHttpUrl(form.fullDescriptionSource)
              ? "Une page de provenance HTTP ou HTTPS est obligatoire."
              : undefined
          }
          inputMode="url"
          label="Page de provenance de la description"
          onChangeText={(value) => update("fullDescriptionSource", value)}
          placeholder="https://…"
          value={form.fullDescriptionSource}
          webName="production-full-description-source"
        />
        {form.fullDescriptionRights === "open_license" ? (
          <TextField
            label="Nom de la licence de la description"
            onChangeText={(value) => update("fullDescriptionLicense", value)}
            placeholder="Ex. CC BY 4.0"
            required
            value={form.fullDescriptionLicense}
            webName="production-full-description-license"
          />
        ) : null}
      </View>

      <View className="gap-5 border-t border-line pt-7">
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <Text className="font-serif text-xl font-semibold text-ink">
            Crédits artistiques
          </Text>
          <Button
            label="Ajouter un crédit"
            onPress={() =>
              onCreditsChange([
                ...credits,
                {
                  key: uniqueKey("credit"),
                  artistId: null,
                  label: "",
                  name: "",
                  role: "performer",
                },
              ])
            }
            variant="quiet"
          />
        </View>
        {credits.length === 0 ? (
          <Text className="text-base leading-6 text-muted">Aucun crédit saisi.</Text>
        ) : null}
        {credits.map((credit, index) => (
          <View
            className="gap-4 rounded-panel border border-line bg-canvas p-4"
            key={credit.key}
          >
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-base font-semibold text-ink">
                Crédit {index + 1}
              </Text>
              <Button
                label="Retirer le crédit"
                onPress={() =>
                  onCreditsChange(credits.filter((item) => item.key !== credit.key))
                }
                variant="dangerGhost"
              />
            </View>
            <TextField
              label="Nom de l’artiste"
              onChangeText={(value) =>
                onCreditsChange(
                  credits.map((item) =>
                    item.key === credit.key ? { ...item, name: value } : item,
                  ),
                )
              }
              required
              value={credit.name}
              webName={`credit-${index}-name`}
            />
            <ChoiceButtons
              label="Rôle"
              onChange={(value) =>
                onCreditsChange(
                  credits.map((item) =>
                    item.key === credit.key ? { ...item, role: value } : item,
                  ),
                )
              }
              options={creditRoleOptions}
              value={credit.role}
            />
            <TextField
              label="Précision facultative"
              onChangeText={(value) =>
                onCreditsChange(
                  credits.map((item) =>
                    item.key === credit.key ? { ...item, label: value } : item,
                  ),
                )
              }
              placeholder="Ex. adaptation et mise en scène"
              value={credit.label}
              webName={`credit-${index}-label`}
            />
          </View>
        ))}
      </View>

      <View className="gap-5 border-t border-line pt-7">
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <View className="gap-1">
            <Text className="font-serif text-xl font-semibold text-ink">
              Dates de tournée à venir
            </Text>
            <Text className="text-base leading-6 text-muted">
              Les archives publiques ne sont pas supprimées par cette révision.
            </Text>
          </View>
          <Button
            label="Ajouter une date"
            onPress={() =>
              onPerformancesChange([
                ...performances,
                {
                  key: uniqueKey("performance"),
                  venueId: "",
                  venueLabel: "",
                  startsAt: "",
                  endsAt: "",
                  status: "scheduled",
                  officialUrl: "",
                },
              ])
            }
            variant="quiet"
          />
        </View>
        {performances.map((performance, index) => (
          <View
            className="gap-4 rounded-panel border border-line bg-canvas p-4"
            key={performance.key}
          >
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-base font-semibold text-ink">Date {index + 1}</Text>
              <Button
                label="Retirer la date"
                onPress={() =>
                  onPerformancesChange(
                    performances.filter((item) => item.key !== performance.key),
                  )
                }
                variant="dangerGhost"
              />
            </View>
            <VenuePicker
              onChange={(venue) =>
                onPerformancesChange(
                  performances.map((item) =>
                    item.key === performance.key
                      ? {
                          ...item,
                          venueId: venue.id,
                          venueLabel: `${venue.name} — ${venue.locality}`,
                        }
                      : item,
                  ),
                )
              }
              value={performance.venueLabel}
            />
            <TextField
              autoCapitalize="none"
              error={
                performance.startsAt && !isZonedDateTime(performance.startsAt)
                  ? "Utilisez une date ISO avec fuseau, par exemple 2026-10-14T20:00:00+02:00."
                  : undefined
              }
              label="Début avec fuseau horaire"
              onChangeText={(value) =>
                onPerformancesChange(
                  performances.map((item) =>
                    item.key === performance.key ? { ...item, startsAt: value } : item,
                  ),
                )
              }
              placeholder="2026-10-14T20:00:00+02:00"
              required
              value={performance.startsAt}
              webName={`performance-${index}-start`}
            />
            <TextField
              autoCapitalize="none"
              error={
                performance.endsAt &&
                (!isZonedDateTime(performance.endsAt) ||
                  (isZonedDateTime(performance.startsAt) &&
                    new Date(performance.endsAt).getTime() <=
                      new Date(performance.startsAt).getTime()))
                  ? "La fin doit être une date ISO avec fuseau, postérieure au début."
                  : undefined
              }
              label="Fin, facultative"
              onChangeText={(value) =>
                onPerformancesChange(
                  performances.map((item) =>
                    item.key === performance.key ? { ...item, endsAt: value } : item,
                  ),
                )
              }
              placeholder="2026-10-14T21:40:00+02:00"
              value={performance.endsAt}
              webName={`performance-${index}-end`}
            />
            <ChoiceButtons
              label="Statut"
              onChange={(value) =>
                onPerformancesChange(
                  performances.map((item) =>
                    item.key === performance.key ? { ...item, status: value } : item,
                  ),
                )
              }
              options={[
                ["scheduled", "Programmée"],
                ["postponed", "Reportée"],
                ["cancelled", "Annulée"],
              ]}
              value={performance.status}
            />
            <TextField
              autoCapitalize="none"
              error={
                performance.officialUrl && !isHttpUrl(performance.officialUrl)
                  ? "Saisissez une URL HTTP ou HTTPS complète."
                  : undefined
              }
              inputMode="url"
              label="Billetterie ou page officielle"
              onChangeText={(value) =>
                onPerformancesChange(
                  performances.map((item) =>
                    item.key === performance.key
                      ? { ...item, officialUrl: value }
                      : item,
                  ),
                )
              }
              placeholder="https://…"
              value={performance.officialUrl}
              webName={`performance-${index}-url`}
            />
          </View>
        ))}
      </View>

      <View className="gap-5 border-t border-line pt-7">
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <View className="gap-1">
            <Text className="font-serif text-xl font-semibold text-ink">Visuels</Text>
            <Text className="max-w-[70ch] text-base leading-6 text-muted">
              Un visuel n’est publié qu’avec son détenteur, son crédit, sa source, son
              autorisation et son mode de stockage documentés.
            </Text>
          </View>
          <Button
            label="Ajouter un visuel"
            onPress={() =>
              onMediaChange([
                ...media,
                {
                  key: uniqueKey("media"),
                  assetId: null,
                  remoteUrl: "",
                  kind: "poster",
                  alt: "",
                  credit: "",
                  copyrightHolder: "",
                  rightsStatus: "permission_granted",
                  storagePolicy: "hotlink",
                  termsUrl: "",
                  license: "",
                  validUntil: "",
                },
              ])
            }
            variant="quiet"
          />
        </View>
        {media.map((visual, index) => (
          <View
            className="gap-4 rounded-panel border border-line bg-canvas p-4"
            key={visual.key}
          >
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-base font-semibold text-ink">
                Visuel {index + 1}
              </Text>
              <Button
                label="Retirer le visuel"
                onPress={() =>
                  onMediaChange(media.filter((item) => item.key !== visual.key))
                }
                variant="dangerGhost"
              />
            </View>
            <TextField
              autoCapitalize="none"
              error={
                visual.remoteUrl && !isHttpUrl(visual.remoteUrl)
                  ? "Saisissez une URL HTTP ou HTTPS complète."
                  : undefined
              }
              inputMode="url"
              label="URL source du fichier"
              onChangeText={(value) =>
                onMediaChange(
                  media.map((item) =>
                    item.key === visual.key ? { ...item, remoteUrl: value } : item,
                  ),
                )
              }
              placeholder="https://…"
              required
              value={visual.remoteUrl}
              webName={`media-${index}-url`}
            />
            <ChoiceButtons
              label="Type de visuel"
              onChange={(value) =>
                onMediaChange(
                  media.map((item) =>
                    item.key === visual.key ? { ...item, kind: value } : item,
                  ),
                )
              }
              options={[
                ["poster", "Affiche"],
                ["key_visual", "Visuel principal"],
                ["photo", "Photo"],
                ["logo", "Logo"],
              ]}
              value={visual.kind}
            />
            <TextField
              label="Crédit"
              onChangeText={(value) =>
                onMediaChange(
                  media.map((item) =>
                    item.key === visual.key ? { ...item, credit: value } : item,
                  ),
                )
              }
              required
              value={visual.credit}
              webName={`media-${index}-credit`}
            />
            <TextField
              label="Détenteur des droits"
              onChangeText={(value) =>
                onMediaChange(
                  media.map((item) =>
                    item.key === visual.key
                      ? { ...item, copyrightHolder: value }
                      : item,
                  ),
                )
              }
              required
              value={visual.copyrightHolder}
              webName={`media-${index}-holder`}
            />
            <TextField
              label="Texte alternatif"
              onChangeText={(value) =>
                onMediaChange(
                  media.map((item) =>
                    item.key === visual.key ? { ...item, alt: value } : item,
                  ),
                )
              }
              placeholder="Décrivez brièvement l’image"
              value={visual.alt}
              webName={`media-${index}-alt`}
            />
            <ChoiceButtons
              label="Type d’autorisation"
              onChange={(value) =>
                onMediaChange(
                  media.map((item) =>
                    item.key === visual.key ? { ...item, rightsStatus: value } : item,
                  ),
                )
              }
              options={mediaRightsOptions}
              value={visual.rightsStatus}
            />
            <ChoiceButtons
              label="Mode d’affichage"
              onChange={(value) =>
                onMediaChange(
                  media.map((item) =>
                    item.key === visual.key ? { ...item, storagePolicy: value } : item,
                  ),
                )
              }
              options={[
                ["hotlink", "Lien distant"],
                ["mirror", "Stockage autorisé par Todam"],
              ]}
              value={visual.storagePolicy}
            />
            {visual.storagePolicy === "mirror" &&
            !["permission_granted", "open_license"].includes(visual.rightsStatus) ? (
              <Text
                accessibilityRole="alert"
                className="text-base leading-6 text-error"
              >
                Le stockage exige une autorisation explicite ou une licence ouverte.
              </Text>
            ) : null}
            <TextField
              autoCapitalize="none"
              error={
                visual.termsUrl && !isHttpUrl(visual.termsUrl)
                  ? "Saisissez l’URL HTTP ou HTTPS du justificatif."
                  : undefined
              }
              inputMode="url"
              label="Justificatif ou conditions des droits"
              onChangeText={(value) =>
                onMediaChange(
                  media.map((item) =>
                    item.key === visual.key ? { ...item, termsUrl: value } : item,
                  ),
                )
              }
              placeholder="https://…"
              required
              value={visual.termsUrl}
              webName={`media-${index}-terms`}
            />
            <View className="gap-5 md:flex-row">
              <View className="flex-1">
                <TextField
                  error={
                    visual.rightsStatus === "open_license" && !visual.license.trim()
                      ? "Le nom de la licence ouverte est obligatoire."
                      : undefined
                  }
                  label="Licence, si applicable"
                  onChangeText={(value) =>
                    onMediaChange(
                      media.map((item) =>
                        item.key === visual.key ? { ...item, license: value } : item,
                      ),
                    )
                  }
                  placeholder="Ex. CC BY 4.0"
                  required={visual.rightsStatus === "open_license"}
                  value={visual.license}
                  webName={`media-${index}-license`}
                />
              </View>
              <View className="flex-1">
                <TextField
                  error={
                    visual.validUntil
                      ? !isDateOnly(visual.validUntil)
                        ? "Format attendu : AAAA-MM-JJ."
                        : !isFutureDateOnly(visual.validUntil)
                          ? "La date d’expiration doit être future."
                          : undefined
                      : undefined
                  }
                  label="Expiration éventuelle"
                  onChangeText={(value) =>
                    onMediaChange(
                      media.map((item) =>
                        item.key === visual.key ? { ...item, validUntil: value } : item,
                      ),
                    )
                  }
                  placeholder="2027-12-31"
                  value={visual.validUntil}
                  webName={`media-${index}-expiry`}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function membershipById(
  memberships: CompanyMembership[] | undefined,
  companyId: string | null,
) {
  return memberships?.find((membership) => membership.companyId === companyId);
}

export default function CompanyWorkspacePage() {
  const session = authClient.useSession();
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [targetMode, setTargetMode] = useState<TargetMode>("company");
  const [productionId, setProductionId] = useState<string | null>(null);
  const [creatingProduction, setCreatingProduction] = useState(false);
  const [newProductionTitle, setNewProductionTitle] = useState("");
  const [newProductionDiscipline, setNewProductionDiscipline] = useState<
    "theatre" | "opera" | "ballet"
  >("theatre");
  const [newProductionAudience, setNewProductionAudience] = useState<
    "general" | "family" | "children"
  >("general");
  const [newProductionMinimumAge, setNewProductionMinimumAge] = useState("");
  const [newProductionUrl, setNewProductionUrl] = useState("");
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [productionForm, setProductionForm] = useState(emptyProductionForm);
  const [credits, setCredits] = useState<CreditDraft[]>([]);
  const [performances, setPerformances] = useState<PerformanceDraft[]>([]);
  const [media, setMedia] = useState<MediaDraft[]>([]);
  const [justification, setJustification] = useState("");
  const [draft, setDraft] = useState<CatalogRevision | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const hydratedDraftKey = useRef<string | null>(null);

  const memberships = useQuery({
    queryKey: ["company-memberships"],
    queryFn: () => api.getCompanyMemberships(),
    enabled: Boolean(session.data),
  });
  const selectedMembership = membershipById(memberships.data, companyId);
  const company = useQuery({
    queryKey: ["professional-company", selectedMembership?.companySlug],
    queryFn: () => api.getCompany(selectedMembership!.companySlug),
    enabled: Boolean(selectedMembership),
  });
  const editableProductions = useQuery({
    queryKey: ["professional-editable-productions", companyId],
    queryFn: () => api.getEditableProductions(companyId!),
    enabled: Boolean(companyId),
  });
  const availableProductions = editableProductions.data ?? [];
  const selectedProductionCard = availableProductions.find(
    (production) => production.id === productionId,
  );
  const production = useQuery({
    queryKey: ["professional-production", companyId, productionId],
    queryFn: () => api.getEditableProduction(companyId!, productionId!),
    enabled: Boolean(companyId && productionId),
  });
  const revisions = useQuery({
    queryKey: ["catalog-revisions"],
    queryFn: () => api.getCatalogRevisions(),
    enabled: Boolean(session.data),
  });
  const activeDraft = revisions.data?.find(
    (revision) =>
      revision.status === "draft" &&
      revision.targetType === targetMode &&
      revision.targetId === (targetMode === "company" ? companyId : productionId),
  );

  /* eslint-disable react-hooks/set-state-in-effect -- Query and draft changes intentionally hydrate the editable form state. */
  useEffect(() => {
    if (!companyId && memberships.data?.[0]) {
      setCompanyId(memberships.data[0].companyId);
    }
  }, [companyId, memberships.data]);

  useEffect(() => {
    if (!company.data || (targetMode === "company" && activeDraft)) return;
    setCompanyForm({
      name: company.data.name,
      shortDescription: company.data.shortDescription ?? "",
      description: company.data.description ?? "",
      officialUrl: company.data.officialUrl ?? "",
      locality: company.data.locality ?? "",
      countryCode: company.data.countryCode ?? "FR",
    });
  }, [activeDraft, company.data, targetMode]);

  useEffect(() => {
    const detail = production.data;
    if (!detail || (targetMode === "production" && activeDraft)) return;
    const shortDescription = detail.descriptions.find(
      (description) => description.kind === "short" && description.locale === "fr",
    );
    const fullDescription = detail.descriptions.find(
      (description) => description.kind === "full" && description.locale === "fr",
    );
    setProductionForm({
      title: detail.title,
      discipline: detail.discipline,
      audience: detail.audience,
      minimumAge: detail.minimumAge === null ? "" : String(detail.minimumAge),
      durationMinutes: detail.durationMinutes ? String(detail.durationMinutes) : "",
      language: detail.language ?? "",
      officialUrl: detail.officialUrl ?? "",
      shortDescription: shortDescription?.body ?? "",
      fullDescription: fullDescription?.body ?? "",
      shortDescriptionSource: shortDescription?.sourceUrl ?? "",
      fullDescriptionSource: fullDescription?.sourceUrl ?? "",
      shortDescriptionLicense: shortDescription?.license ?? "",
      fullDescriptionLicense: fullDescription?.license ?? "",
      shortDescriptionRights: shortDescription?.rightsStatus ?? "permission_granted",
      fullDescriptionRights: fullDescription?.rightsStatus ?? "permission_granted",
    });
    setCredits(
      detail.credits.map((credit) => ({
        key: credit.artistId,
        artistId: credit.artistId,
        name: credit.artistName,
        role: credit.role,
        label: credit.label ?? "",
      })),
    );
    setPerformances(
      detail.performances
        .filter((performance) => new Date(performance.startsAt).getTime() >= Date.now())
        .map((performance) => ({
          key: performance.id,
          venueId: performance.venue.id,
          venueLabel: `${performance.venue.name} — ${performance.venue.locality}`,
          startsAt: performance.startsAt,
          endsAt: performance.endsAt ?? "",
          status: performance.status === "completed" ? "scheduled" : performance.status,
          officialUrl: performance.officialUrl ?? "",
        })),
    );
    setMedia(
      detail.editableMedia.map((visual) => ({
        key: visual.id,
        assetId: visual.id,
        remoteUrl: visual.remoteUrl,
        kind: visual.kind,
        alt: visual.alt ?? "",
        credit: visual.credit ?? "",
        copyrightHolder: visual.copyrightHolder ?? "",
        rightsStatus:
          visual.rightsStatus === "todam_original" ||
          visual.rightsStatus === "community_submission"
            ? "permission_granted"
            : visual.rightsStatus,
        storagePolicy: visual.storagePolicy,
        termsUrl: visual.termsUrl ?? "",
        license: visual.license ?? "",
        validUntil: visual.validUntil?.slice(0, 10) ?? "",
      })),
    );
  }, [activeDraft, production.data, targetMode]);

  useEffect(() => {
    if (
      !selectedProductionCard ||
      selectedProductionCard.publicationStatus === "published" ||
      production.data ||
      activeDraft
    ) {
      return;
    }
    setProductionForm({
      ...emptyProductionForm,
      title: selectedProductionCard.title,
      audience: selectedProductionCard.audience,
      minimumAge:
        selectedProductionCard.minimumAge === null
          ? ""
          : String(selectedProductionCard.minimumAge),
    });
    setCredits([]);
    setPerformances([]);
    setMedia([]);
  }, [activeDraft, production.data, selectedProductionCard]);

  useEffect(() => {
    hydratedDraftKey.current = null;
    setDraft(null);
  }, [companyId, productionId, targetMode]);

  useEffect(() => {
    if (!activeDraft) return;
    const hydrationKey = `${activeDraft.id}:${activeDraft.updatedAt}`;
    if (hydratedDraftKey.current === hydrationKey) return;

    if (targetMode === "company") {
      if (!company.data) return;
      const next: CompanyForm = {
        name: company.data.name,
        shortDescription: company.data.shortDescription ?? "",
        description: company.data.description ?? "",
        officialUrl: company.data.officialUrl ?? "",
        locality: company.data.locality ?? "",
        countryCode: company.data.countryCode ?? "FR",
      };
      for (const change of activeDraft.changes) {
        if (change.field === "name") next.name = draftString(change.newValue);
        if (change.field === "shortDescription") {
          next.shortDescription = draftString(change.newValue);
        }
        if (change.field === "description") {
          next.description = draftString(change.newValue);
        }
        if (change.field === "officialUrl") {
          next.officialUrl = draftString(change.newValue);
        }
        if (change.field === "locality") {
          next.locality = draftString(change.newValue);
        }
        if (change.field === "countryCode") {
          next.countryCode = draftString(change.newValue);
        }
      }
      setCompanyForm(next);
    } else {
      const detail = production.data;
      if (!detail) return;
      const shortDescription = detail.descriptions.find(
        (description) => description.kind === "short" && description.locale === "fr",
      );
      const fullDescription = detail.descriptions.find(
        (description) => description.kind === "full" && description.locale === "fr",
      );
      const next: ProductionForm = {
        title: detail.title,
        discipline: detail.discipline,
        audience: detail.audience,
        minimumAge: detail.minimumAge === null ? "" : String(detail.minimumAge),
        durationMinutes: detail.durationMinutes ? String(detail.durationMinutes) : "",
        language: detail.language ?? "",
        officialUrl: detail.officialUrl ?? "",
        shortDescription: shortDescription?.body ?? "",
        fullDescription: fullDescription?.body ?? "",
        shortDescriptionSource: shortDescription?.sourceUrl ?? "",
        fullDescriptionSource: fullDescription?.sourceUrl ?? "",
        shortDescriptionLicense: shortDescription?.license ?? "",
        fullDescriptionLicense: fullDescription?.license ?? "",
        shortDescriptionRights: shortDescription?.rightsStatus ?? "permission_granted",
        fullDescriptionRights: fullDescription?.rightsStatus ?? "permission_granted",
      };
      let nextCredits: CreditDraft[] = detail.credits.map((credit) => ({
        key: credit.artistId,
        artistId: credit.artistId,
        name: credit.artistName,
        role: credit.role,
        label: credit.label ?? "",
      }));
      let nextPerformances: PerformanceDraft[] = detail.performances
        .filter((performance) => new Date(performance.startsAt).getTime() >= Date.now())
        .map((performance) => ({
          key: performance.id,
          venueId: performance.venue.id,
          venueLabel: `${performance.venue.name} — ${performance.venue.locality}`,
          startsAt: performance.startsAt,
          endsAt: performance.endsAt ?? "",
          status: performance.status === "completed" ? "scheduled" : performance.status,
          officialUrl: performance.officialUrl ?? "",
        }));
      let nextMedia: MediaDraft[] = detail.editableMedia.map((visual) => ({
        key: visual.id,
        assetId: visual.id,
        remoteUrl: visual.remoteUrl,
        kind: visual.kind,
        alt: visual.alt ?? "",
        credit: visual.credit ?? "",
        copyrightHolder: visual.copyrightHolder ?? "",
        rightsStatus:
          visual.rightsStatus === "todam_original" ||
          visual.rightsStatus === "community_submission"
            ? "permission_granted"
            : visual.rightsStatus,
        storagePolicy: visual.storagePolicy,
        termsUrl: visual.termsUrl ?? "",
        license: visual.license ?? "",
        validUntil: visual.validUntil?.slice(0, 10) ?? "",
      }));

      for (const change of activeDraft.changes) {
        if (change.field === "title") next.title = draftString(change.newValue);
        if (
          change.field === "discipline" &&
          ["theatre", "opera", "ballet"].includes(String(change.newValue))
        ) {
          next.discipline = change.newValue as Discipline;
        }
        if (
          change.field === "audience" &&
          ["general", "family", "children"].includes(String(change.newValue))
        ) {
          next.audience = change.newValue as ProductionForm["audience"];
        }
        if (change.field === "minimumAge") {
          next.minimumAge =
            typeof change.newValue === "number" ? String(change.newValue) : "";
        }
        if (change.field === "durationMinutes") {
          next.durationMinutes =
            typeof change.newValue === "number" ? String(change.newValue) : "";
        }
        if (change.field === "language") {
          next.language = draftString(change.newValue);
        }
        if (change.field === "officialUrl") {
          next.officialUrl = draftString(change.newValue);
        }
        if (
          change.field === "description.short" ||
          change.field === "description.full"
        ) {
          const description = draftRecord(change.newValue);
          const short = change.field === "description.short";
          if (short) {
            next.shortDescription = draftString(description?.body);
            next.shortDescriptionSource =
              change.provenanceUrl ?? draftString(description?.sourceUrl);
            next.shortDescriptionLicense = draftString(description?.license);
            next.shortDescriptionRights = change.rightsStatus ?? "permission_granted";
          } else {
            next.fullDescription = draftString(description?.body);
            next.fullDescriptionSource =
              change.provenanceUrl ?? draftString(description?.sourceUrl);
            next.fullDescriptionLicense = draftString(description?.license);
            next.fullDescriptionRights = change.rightsStatus ?? "permission_granted";
          }
        }
        if (change.field === "credits" && Array.isArray(change.newValue)) {
          nextCredits = change.newValue.flatMap((value, index) => {
            const credit = draftRecord(value);
            const name = draftString(credit?.name);
            const role = draftString(credit?.role);
            if (!name || !creditRoleOptions.some(([candidate]) => candidate === role)) {
              return [];
            }
            return [
              {
                key: `draft-credit-${index}`,
                artistId: typeof credit?.artistId === "string" ? credit.artistId : null,
                name,
                role: role as CreditRole,
                label: draftString(credit?.label),
              },
            ];
          });
        }
        if (change.field === "performances" && Array.isArray(change.newValue)) {
          nextPerformances = change.newValue.flatMap((value, index) => {
            const performance = draftRecord(value);
            const venueId = draftString(performance?.venueId);
            const startsAt = draftString(performance?.startsAt);
            const status = draftString(performance?.status);
            if (
              !venueId ||
              !startsAt ||
              !["scheduled", "cancelled", "postponed"].includes(status)
            ) {
              return [];
            }
            const knownVenue = detail.performances.find(
              (candidate) => candidate.venue.id === venueId,
            )?.venue;
            return [
              {
                key: `draft-performance-${index}`,
                venueId,
                venueLabel: knownVenue
                  ? `${knownVenue.name} — ${knownVenue.locality}`
                  : "Lieu sélectionné",
                startsAt,
                endsAt: draftString(performance?.endsAt),
                status: status as PerformanceDraft["status"],
                officialUrl: draftString(performance?.officialUrl),
              },
            ];
          });
        }
        if (change.field === "media" && Array.isArray(change.newValue)) {
          nextMedia = change.newValue.flatMap((value, index) => {
            const visual = draftRecord(value);
            const kind = draftString(visual?.kind);
            const rightsStatus = draftString(visual?.rightsStatus);
            const storagePolicy = draftString(visual?.storagePolicy);
            if (
              !["poster", "key_visual", "photo", "logo"].includes(kind) ||
              ![
                "permission_granted",
                "open_license",
                "contractual_display",
                "hotlink_only",
              ].includes(rightsStatus) ||
              !["hotlink", "mirror"].includes(storagePolicy)
            ) {
              return [];
            }
            return [
              {
                key: `draft-media-${index}`,
                assetId: typeof visual?.assetId === "string" ? visual.assetId : null,
                remoteUrl: draftString(visual?.remoteUrl),
                kind: kind as MediaDraft["kind"],
                alt: draftString(visual?.alt),
                credit: draftString(visual?.credit),
                copyrightHolder: draftString(visual?.copyrightHolder),
                rightsStatus: rightsStatus as MediaDraft["rightsStatus"],
                storagePolicy: storagePolicy as MediaDraft["storagePolicy"],
                termsUrl: draftString(visual?.termsUrl),
                license: draftString(visual?.license),
                validUntil: draftString(visual?.validUntil).slice(0, 10),
              },
            ];
          });
        }
      }

      setProductionForm(next);
      setCredits(nextCredits);
      setPerformances(nextPerformances);
      setMedia(nextMedia);
    }

    setJustification(activeDraft.justification ?? "");
    setDraft(activeDraft);
    hydratedDraftKey.current = hydrationKey;
  }, [activeDraft, company.data, production.data, targetMode]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const changes = useMemo(() => {
    if (targetMode === "company") {
      return [
        { field: "name", newValue: companyForm.name },
        {
          field: "shortDescription",
          newValue: companyForm.shortDescription || null,
        },
        { field: "description", newValue: companyForm.description || null },
        { field: "officialUrl", newValue: companyForm.officialUrl || null },
        { field: "locality", newValue: companyForm.locality || null },
        {
          field: "countryCode",
          newValue: companyForm.countryCode || null,
        },
      ].map((change) => ({
        ...change,
        provenanceUrl: companyForm.officialUrl || null,
        rightsStatus: null,
      }));
    }

    const productionChanges: RevisionChangeInput[] = [
      {
        field: "title",
        newValue: productionForm.title,
        provenanceUrl: productionForm.officialUrl || null,
        rightsStatus: null,
      },
      {
        field: "discipline",
        newValue: productionForm.discipline,
        provenanceUrl: productionForm.officialUrl || null,
        rightsStatus: null,
      },
      {
        field: "audience",
        newValue: productionForm.audience,
        provenanceUrl: productionForm.officialUrl || null,
        rightsStatus: null,
      },
      {
        field: "minimumAge",
        newValue: productionForm.minimumAge ? Number(productionForm.minimumAge) : null,
        provenanceUrl: productionForm.officialUrl || null,
        rightsStatus: null,
      },
      {
        field: "durationMinutes",
        newValue: productionForm.durationMinutes
          ? Number(productionForm.durationMinutes)
          : null,
        provenanceUrl: productionForm.officialUrl || null,
        rightsStatus: null,
      },
      {
        field: "language",
        newValue: productionForm.language || null,
        provenanceUrl: productionForm.officialUrl || null,
        rightsStatus: null,
      },
      {
        field: "officialUrl",
        newValue: productionForm.officialUrl || null,
        provenanceUrl: productionForm.officialUrl || null,
        rightsStatus: null,
      },
      {
        field: "description.short",
        newValue: productionForm.shortDescription
          ? {
              body: productionForm.shortDescription,
              locale: "fr",
              sourceUrl: productionForm.shortDescriptionSource || null,
              license: productionForm.shortDescriptionLicense || null,
            }
          : null,
        provenanceUrl: productionForm.shortDescriptionSource || null,
        rightsStatus: productionForm.shortDescriptionRights,
      },
      {
        field: "description.full",
        newValue: productionForm.fullDescription
          ? {
              body: productionForm.fullDescription,
              locale: "fr",
              sourceUrl: productionForm.fullDescriptionSource || null,
              license: productionForm.fullDescriptionLicense || null,
            }
          : null,
        provenanceUrl: productionForm.fullDescriptionSource || null,
        rightsStatus: productionForm.fullDescriptionRights,
      },
      {
        field: "credits",
        newValue: credits.map((credit, position) => ({
          artistId: credit.artistId,
          name: credit.name,
          role: credit.role,
          label: credit.label || null,
          position,
        })),
        provenanceUrl: productionForm.officialUrl || null,
        rightsStatus: null,
      },
      {
        field: "performances",
        newValue: performances.map((performance) => ({
          venueId: performance.venueId,
          startsAt: performance.startsAt,
          endsAt: performance.endsAt || null,
          status: performance.status,
          officialUrl: performance.officialUrl || null,
        })),
        provenanceUrl: productionForm.officialUrl || null,
        rightsStatus: null,
      },
    ];
    productionChanges.push({
      field: "media",
      newValue: media.map((visual, position) => ({
        assetId: visual.assetId,
        remoteUrl: visual.remoteUrl,
        kind: visual.kind,
        alt: visual.alt || null,
        credit: visual.credit,
        copyrightHolder: visual.copyrightHolder,
        rightsStatus: visual.rightsStatus,
        storagePolicy: visual.storagePolicy,
        termsUrl: visual.termsUrl,
        license: visual.license || null,
        validUntil: visual.validUntil || null,
        isPrimary: position === 0,
      })),
      provenanceUrl: media[0]?.termsUrl || media[0]?.remoteUrl || null,
      rightsStatus: media[0]?.rightsStatus ?? "permission_granted",
    });
    return productionChanges;
  }, [companyForm, credits, media, performances, productionForm, targetMode]);

  const targetId = targetMode === "company" ? companyId : productionId;
  const performancesComplete = performances.every((performance) => {
    if (
      !performance.venueId ||
      !isZonedDateTime(performance.startsAt) ||
      (performance.officialUrl && !isHttpUrl(performance.officialUrl))
    ) {
      return false;
    }
    if (!performance.endsAt) return true;
    return (
      isZonedDateTime(performance.endsAt) &&
      new Date(performance.endsAt).getTime() > new Date(performance.startsAt).getTime()
    );
  });
  const mediaComplete = media.every(
    (visual) =>
      isHttpUrl(visual.remoteUrl) &&
      visual.credit.trim().length > 0 &&
      visual.copyrightHolder.trim().length > 0 &&
      isHttpUrl(visual.termsUrl) &&
      (visual.rightsStatus !== "open_license" || visual.license.trim()) &&
      (!visual.validUntil || isFutureDateOnly(visual.validUntil)) &&
      !(
        visual.storagePolicy === "mirror" &&
        !["permission_granted", "open_license"].includes(visual.rightsStatus)
      ),
  );
  const canSave =
    Boolean(companyId && targetId) &&
    (targetMode === "company"
      ? companyForm.name.trim().length >= 1 &&
        (!companyForm.officialUrl || isHttpUrl(companyForm.officialUrl)) &&
        (!companyForm.countryCode || /^[A-Z]{2}$/.test(companyForm.countryCode))
      : productionForm.title.trim().length >= 1 &&
        isCleanEditorialTitle(productionForm.title) &&
        (!productionForm.minimumAge ||
          (Number(productionForm.minimumAge) >= 0 &&
            Number(productionForm.minimumAge) <= 99)) &&
        (!productionForm.durationMinutes ||
          Number(productionForm.durationMinutes) > 0) &&
        (!productionForm.officialUrl || isHttpUrl(productionForm.officialUrl)) &&
        descriptionRightsComplete(
          productionForm.shortDescription,
          productionForm.shortDescriptionRights,
          productionForm.shortDescriptionSource,
          productionForm.shortDescriptionLicense,
        ) &&
        descriptionRightsComplete(
          productionForm.fullDescription,
          productionForm.fullDescriptionRights,
          productionForm.fullDescriptionSource,
          productionForm.fullDescriptionLicense,
        ) &&
        credits.every((credit) => credit.name.trim()) &&
        performancesComplete &&
        mediaComplete);
  const canSubmit =
    canSave &&
    (targetMode === "company" ||
      (productionForm.shortDescription.trim().length > 0 &&
        productionForm.fullDescription.trim().length > 0 &&
        performances.some(
          (performance) =>
            performance.status !== "cancelled" && isZonedDateTime(performance.startsAt),
        )));

  const saveRevision = useMutation({
    onMutate: () => setFeedback(null),
    mutationFn: () => {
      if (
        draft?.status === "draft" &&
        draft.targetType === targetMode &&
        draft.targetId === targetId
      ) {
        return api.updateCatalogRevision(draft.id, {
          justification: justification || null,
          changes,
        });
      }
      return api.createCatalogRevision(companyId!, {
        targetType: targetMode,
        targetId: targetId!,
        justification: justification || null,
        changes,
      });
    },
    onSuccess: (revision) => {
      setDraft(revision);
      setFeedback("Brouillon enregistré. La prévisualisation est à jour.");
      void revisions.refetch();
    },
  });
  const submitRevision = useMutation({
    onMutate: () => setFeedback(null),
    mutationFn: (revisionId: string) => api.submitCatalogRevision(revisionId),
    onSuccess: (revision) => {
      setDraft(revision);
      setFeedback(
        "Révision envoyée à Todam. La version publique reste inchangée jusqu’à sa validation.",
      );
      void revisions.refetch();
    },
  });
  const createProduction = useMutation({
    onMutate: () => setFeedback(null),
    mutationFn: () =>
      api.createDraftProduction(companyId!, {
        title: newProductionTitle.trim(),
        discipline: newProductionDiscipline,
        audience: newProductionAudience,
        minimumAge: newProductionMinimumAge ? Number(newProductionMinimumAge) : null,
        officialUrl: newProductionUrl.trim() || null,
      }),
    onSuccess: (created) => {
      setCreatingProduction(false);
      setTargetMode("production");
      setProductionId(created.id);
      setNewProductionTitle("");
      setNewProductionMinimumAge("");
      setNewProductionUrl("");
      setProductionForm({
        ...emptyProductionForm,
        title: created.title,
        discipline: created.discipline,
        audience: created.audience,
        minimumAge: created.minimumAge === null ? "" : String(created.minimumAge),
        officialUrl: newProductionUrl.trim(),
      });
      setCredits([]);
      setPerformances([]);
      setMedia([]);
      setFeedback("Spectacle créé en brouillon. Complétez sa fiche avant l’envoi.");
      void editableProductions.refetch();
    },
  });

  if (session.isPending) {
    return (
      <>
        <PrivatePageHead title="Espace compagnie" />
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
        <PrivatePageHead title="Espace compagnie" />
        <PageScrollView contentContainerClassName="flex-grow">
          <View className="todam-page-before-footer mx-auto w-full max-w-xl flex-1 items-center justify-center gap-4 px-5">
            <SectionTitle level={1}>Connexion requise</SectionTitle>
            <Button
              label="Se connecter"
              onPress={() =>
                router.push({
                  pathname: "/sign-in",
                  params: { returnTo: "/espace-compagnie" },
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
        <title>Espace compagnie | Todam</title>
        <meta content="noindex,nofollow" name="robots" />
      </Head>
      <PageScrollView contentContainerClassName="flex-grow">
        <View className="todam-page-before-footer mx-auto w-full max-w-content flex-1 gap-10 px-5 py-10 md:px-8 md:py-14">
          <View className="gap-4">
            <SectionTitle eyebrow="Espace professionnel" level={1}>
              Préparer une révision
            </SectionTitle>
            <Text className="max-w-[70ch] text-base leading-7 text-muted">
              Modifiez la fiche compagnie, les spectacles, les descriptions, les
              crédits, les dates et les visuels. Vous prévisualisez toujours le
              brouillon avant de l’envoyer. La version publique reste inchangée jusqu’à
              la validation par Todam.
            </Text>
          </View>
          {feedback ? (
            <Text
              accessibilityLiveRegion="polite"
              className="border-l-2 border-success py-1 pl-4 text-base leading-6 text-ink"
            >
              {feedback}
            </Text>
          ) : null}

          <AsyncState
            empty={!memberships.isPending && (memberships.data?.length ?? 0) === 0}
            emptyAction={
              <Button
                label="Revendiquer une compagnie"
                onPress={() => router.push("/pour-les-compagnies")}
              />
            }
            emptyMessage="Aucune compagnie n’est encore rattachée à votre compte."
            error={memberships.isError}
            loading={memberships.isPending}
          >
            <View className="gap-8 lg:flex-row lg:items-start">
              <View className="w-full gap-6 lg:max-w-[300px]">
                <View className="gap-3">
                  <Text className="text-base font-semibold text-ink">
                    Compagnie gérée
                  </Text>
                  {memberships.data?.map((membership) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: companyId === membership.companyId,
                      }}
                      className={`min-h-16 justify-center border-b border-line py-3 ${
                        companyId === membership.companyId
                          ? "border-l-2 border-l-accent pl-3"
                          : ""
                      }`}
                      key={membership.companyId}
                      onPress={() => {
                        setCompanyId(membership.companyId);
                        setProductionId(null);
                        setTargetMode("company");
                      }}
                    >
                      <Text className="text-base font-semibold text-ink">
                        {membership.companyName}
                      </Text>
                      <Text className="text-sm text-muted">
                        {membership.roleTitle} · {membershipRoleLabels[membership.role]}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {company.data ? (
                  <View className="gap-3">
                    <Text className="text-base font-semibold text-ink">
                      Contenu à modifier
                    </Text>
                    {Platform.OS === "web" ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: targetMode === "company" }}
                        className={`min-h-11 justify-center border-l-2 px-3 py-2 ${
                          targetMode === "company"
                            ? "border-accent bg-selected"
                            : "border-line"
                        }`}
                        onPress={() => {
                          setTargetMode("company");
                          setProductionId(null);
                        }}
                      >
                        <Text className="text-base font-semibold text-ink">
                          Fiche de la compagnie
                        </Text>
                      </Pressable>
                    ) : (
                      <Button
                        label="Fiche de la compagnie"
                        onPress={() => {
                          setTargetMode("company");
                          setProductionId(null);
                        }}
                        variant={targetMode === "company" ? "primary" : "secondary"}
                      />
                    )}
                    <Button
                      label="Créer un spectacle"
                      onPress={() => setCreatingProduction(true)}
                      variant="quiet"
                    />
                    {availableProductions.map((item) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{
                          selected:
                            targetMode === "production" && productionId === item.id,
                        }}
                        className={`min-h-12 justify-center border-l-2 px-3 py-2 ${
                          targetMode === "production" && productionId === item.id
                            ? "border-accent bg-selected"
                            : "border-line"
                        }`}
                        key={item.id}
                        onPress={() => {
                          setCreatingProduction(false);
                          setTargetMode("production");
                          setProductionId(item.id);
                        }}
                      >
                        <Text className="text-base font-semibold text-ink">
                          {item.title}
                        </Text>
                        <Text className="text-sm text-muted">
                          {item.discipline === "theatre"
                            ? "Théâtre"
                            : item.discipline === "opera"
                              ? "Opéra"
                              : "Ballet"}
                          {item.publicationStatus === "draft"
                            ? " · Brouillon non public"
                            : ""}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>

              <View className="todam-management-panel min-w-0 flex-1 gap-7 p-5 md:p-7">
                <View className="gap-2 border-b border-line pb-5">
                  <Text className="font-serif text-2xl font-semibold text-ink">
                    {targetMode === "company"
                      ? "Fiche de la compagnie"
                      : (selectedProductionCard?.title ?? "Choisissez un spectacle")}
                  </Text>
                  <Text className="text-base leading-6 text-muted">
                    Les champs ci-dessous sont un brouillon privé. Enregistrez-le pour
                    comparer l’ancienne et la nouvelle version.
                  </Text>
                </View>

                {creatingProduction ? (
                  <View className="gap-5">
                    <Text className="font-serif text-xl font-semibold text-ink">
                      Nouveau spectacle privé
                    </Text>
                    <Text className="text-base leading-6 text-muted">
                      Cette création reste invisible du public. Vous pourrez compléter
                      sa fiche puis soumettre une révision à Todam.
                    </Text>
                    <TextField
                      error={
                        newProductionTitle && !isCleanEditorialTitle(newProductionTitle)
                          ? "Gardez uniquement le titre : séparez compagnie, crédits, durée et informations techniques."
                          : undefined
                      }
                      label="Titre"
                      onChangeText={setNewProductionTitle}
                      required
                      value={newProductionTitle}
                      webName="new-production-title"
                    />
                    <ChoiceButtons
                      label="Discipline"
                      onChange={setNewProductionDiscipline}
                      options={[
                        ["theatre", "Théâtre"],
                        ["opera", "Opéra"],
                        ["ballet", "Ballet"],
                      ]}
                      value={newProductionDiscipline}
                    />
                    <ChoiceButtons
                      label="Public conseillé"
                      onChange={setNewProductionAudience}
                      options={[
                        ["general", "Tout public"],
                        ["family", "Famille"],
                        ["children", "Jeune public"],
                      ]}
                      value={newProductionAudience}
                    />
                    <TextField
                      inputMode="numeric"
                      keyboardType="number-pad"
                      label="Âge minimum conseillé, facultatif"
                      maxLength={2}
                      onChangeText={(value) =>
                        setNewProductionMinimumAge(value.replace(/\D/g, ""))
                      }
                      value={newProductionMinimumAge}
                      webName="new-production-minimum-age"
                    />
                    <TextField
                      autoCapitalize="none"
                      error={
                        newProductionUrl && !isHttpUrl(newProductionUrl)
                          ? "Saisissez une URL HTTP ou HTTPS complète."
                          : undefined
                      }
                      inputMode="url"
                      label="Page officielle, facultative"
                      onChangeText={setNewProductionUrl}
                      placeholder="https://…"
                      value={newProductionUrl}
                      webName="new-production-url"
                    />
                    <View className="flex-row flex-wrap gap-3">
                      <Button
                        disabled={
                          !isCleanEditorialTitle(newProductionTitle) ||
                          Boolean(
                            newProductionMinimumAge &&
                            Number(newProductionMinimumAge) > 99,
                          ) ||
                          Boolean(newProductionUrl && !isHttpUrl(newProductionUrl))
                        }
                        label="Créer le brouillon"
                        loading={createProduction.isPending}
                        onPress={() => createProduction.mutate()}
                      />
                      <Button
                        label="Annuler"
                        onPress={() => setCreatingProduction(false)}
                        variant="quiet"
                      />
                    </View>
                    {createProduction.isError ? (
                      <Text
                        accessibilityRole="alert"
                        className="text-base leading-6 text-error"
                      >
                        {readableError(createProduction.error)}
                      </Text>
                    ) : null}
                  </View>
                ) : targetMode === "company" ? (
                  <AsyncState
                    empty={false}
                    emptyMessage=""
                    error={company.isError}
                    loading={company.isPending}
                  >
                    <CompanyFields form={companyForm} onChange={setCompanyForm} />
                  </AsyncState>
                ) : productionId ? (
                  <AsyncState
                    empty={false}
                    emptyMessage=""
                    error={production.isError}
                    loading={
                      selectedProductionCard?.publicationStatus === "published" &&
                      production.isPending
                    }
                  >
                    <ProductionFields
                      credits={credits}
                      form={productionForm}
                      media={media}
                      onCreditsChange={setCredits}
                      onFormChange={setProductionForm}
                      onMediaChange={setMedia}
                      onPerformancesChange={setPerformances}
                      performances={performances}
                    />
                  </AsyncState>
                ) : (
                  <Text className="text-base leading-6 text-muted">
                    Choisissez un spectacle dans la colonne de gauche.
                  </Text>
                )}

                <View className="gap-5 border-t border-line pt-7">
                  <TextField
                    label="Justification pour l’équipe Todam"
                    maxLength={2000}
                    multiline
                    onChangeText={setJustification}
                    placeholder="Résumez les changements et leurs sources."
                    style={{ minHeight: 120, textAlignVertical: "top" }}
                    value={justification}
                    webName="revision-justification"
                  />
                  <Button
                    disabled={!canSave}
                    label={
                      draft?.status === "draft"
                        ? "Mettre à jour la prévisualisation"
                        : "Enregistrer et prévisualiser"
                    }
                    loading={saveRevision.isPending}
                    onPress={() => saveRevision.mutate()}
                  />
                  {saveRevision.isError ? (
                    <Text
                      accessibilityRole="alert"
                      className="text-base leading-6 text-error"
                    >
                      {readableError(saveRevision.error)}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </AsyncState>

          {draft ? (
            <View className="gap-5">
              <SectionTitle>Prévisualisation avant envoi</SectionTitle>
              <DraftVisualPreview
                companyForm={companyForm}
                credits={credits}
                media={media}
                performances={performances}
                productionForm={productionForm}
                targetMode={targetMode}
              />
              <RevisionPreview revision={draft} />
              {draft.status === "draft" ? (
                <View className="gap-3 self-start">
                  <Button
                    disabled={!canSubmit}
                    label="Soumettre à Todam"
                    loading={submitRevision.isPending}
                    onPress={() => submitRevision.mutate(draft.id)}
                  />
                  {!canSubmit ? (
                    <Text className="max-w-[65ch] text-sm leading-5 text-error">
                      {targetMode === "company"
                        ? "Avant l’envoi, vérifiez le nom et les éventuels champs renseignés."
                        : "Avant l’envoi, renseignez les deux descriptions et une représentation non annulée complète."}
                    </Text>
                  ) : null}
                  <Text className="max-w-[65ch] text-sm leading-5 text-muted">
                    Après l’envoi, le brouillon devient non modifiable pendant la
                    vérification. La fiche publique ne change toujours pas.
                  </Text>
                </View>
              ) : null}
              {submitRevision.isError ? (
                <Text
                  accessibilityRole="alert"
                  className="text-base leading-6 text-error"
                >
                  {readableError(submitRevision.error)}
                </Text>
              ) : null}
            </View>
          ) : null}

          {(revisions.data?.length ?? 0) > 0 ? (
            <View className="gap-5 border-t border-line pt-9">
              <SectionTitle>Historique des révisions</SectionTitle>
              {revisions.data?.map((revision) => (
                <RevisionPreview key={revision.id} revision={revision} />
              ))}
            </View>
          ) : null}
        </View>
      </PageScrollView>
    </>
  );
}
