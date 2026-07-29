import { useMutation, useQuery } from "@tanstack/react-query";
import {
  COMMUNITY_POSTER_ERROR,
  TodamApiError,
  type Audience,
  type Discipline,
} from "@todam/contracts";
import { Button, SectionTitle, TextField } from "@todam/design-system";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import { createElement, useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { AccessibleChoiceGroup } from "../components/AccessibleChoiceGroup";
import { AsyncState } from "../components/AsyncState";
import { LegalFooter } from "../components/LegalFooter";
import { PageScrollView, PageStaticView } from "../components/PageScrollView";
import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";

const disciplineOptions = [
  ["theatre", "Théâtre"],
  ["opera", "Opéra"],
  ["ballet", "Ballet"],
] as const;
const audienceOptions = [
  ["general", "Tout public"],
  ["family", "En famille"],
  ["children", "Jeune public"],
] as const;

interface PerformanceDraft {
  key: string;
  startsAt: string;
  endsAt: string;
  venueName: string;
  venueId: string | null;
  addressLine1: string;
  postalCode: string;
  locality: string;
  countryCode: string;
  timezone: string;
  officialUrl: string;
}

function emptyPerformance(): PerformanceDraft {
  return {
    key: `${Date.now()}-${Math.random()}`,
    startsAt: "",
    endsAt: "",
    venueName: "",
    venueId: null,
    addressLine1: "",
    postalCode: "",
    locality: "",
    countryCode: "FR",
    timezone: "Europe/Paris",
    officialUrl: "",
  };
}

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, "");
}

function validHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function validHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isoDateTime(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function VenueEditor({
  draft,
  onChange,
  onRemove,
  removable,
}: {
  draft: PerformanceDraft;
  onChange: (next: PerformanceDraft) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const venueSearch = useQuery({
    queryKey: ["community-venue-search", draft.venueName],
    queryFn: () =>
      api.searchCatalog({
        q: draft.venueName.trim(),
        type: "venues",
        temporal: "all",
        limit: 6,
      }),
    enabled: draft.venueName.trim().length >= 2 && !draft.venueId,
    staleTime: 30_000,
  });
  const suggestions = venueSearch.data?.venues ?? [];

  return (
    <View className="todam-form-panel gap-4 p-5">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <Text className="font-serif text-xl font-semibold text-ink">
          Représentation
        </Text>
        {removable ? (
          <Button label="Retirer" onPress={onRemove} variant="dangerGhost" />
        ) : null}
      </View>
      <View className="gap-3 md:flex-row">
        <View className="min-w-0 flex-1">
          <TextField
            label="Date et heure de début"
            onChangeText={(startsAt) => onChange({ ...draft, startsAt })}
            placeholder="2026-07-15T20:00"
            required
            value={draft.startsAt}
            webName={`starts-at-${draft.key}`}
          />
        </View>
        <View className="min-w-0 flex-1">
          <TextField
            label="Date et heure de fin"
            onChangeText={(endsAt) => onChange({ ...draft, endsAt })}
            placeholder="Facultatif"
            value={draft.endsAt}
            webName={`ends-at-${draft.key}`}
          />
        </View>
      </View>
      <TextField
        label="Lieu"
        onChangeText={(venueName) => onChange({ ...draft, venueName, venueId: null })}
        placeholder="Nom de la salle ou du lieu"
        required
        value={draft.venueName}
        webName={`venue-${draft.key}`}
      />
      {draft.venueId ? (
        <View className="flex-row flex-wrap items-center justify-between gap-3 border-l-2 border-success pl-4">
          <Text className="text-sm font-semibold text-success">
            Lieu existant sélectionné
          </Text>
          <Button
            label="Créer un autre lieu"
            onPress={() => onChange({ ...draft, venueId: null })}
            variant="ghost"
          />
        </View>
      ) : suggestions.length > 0 ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-ink">
            Lieux similaires — sélectionnez-en un s’il correspond
          </Text>
          {suggestions.map((venue) => (
            <Pressable
              accessibilityRole="button"
              className="min-h-11 justify-center border-l-2 border-accent pl-3"
              key={venue.id}
              onPress={() =>
                onChange({
                  ...draft,
                  venueId: venue.id,
                  venueName: venue.name,
                  locality: venue.locality,
                  countryCode: venue.countryCode,
                  timezone: venue.timezone,
                  officialUrl: venue.officialUrl ?? "",
                })
              }
            >
              <Text className="text-sm font-semibold text-accent">
                {venue.name} · {venue.locality}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {!draft.venueId ? (
        <View className="gap-4 rounded-todam border border-selected-border bg-selected p-4">
          <Text className="text-sm leading-5 text-muted">
            Si le lieu n’existe pas, complétez ses informations pour le créer.
          </Text>
          <TextField
            label="Adresse"
            onChangeText={(addressLine1) => onChange({ ...draft, addressLine1 })}
            required
            value={draft.addressLine1}
          />
          <View className="gap-3 md:flex-row">
            <View className="w-full md:max-w-40">
              <TextField
                label="Code postal"
                onChangeText={(postalCode) => onChange({ ...draft, postalCode })}
                required
                value={draft.postalCode}
              />
            </View>
            <View className="min-w-0 flex-1">
              <TextField
                label="Ville"
                onChangeText={(locality) => onChange({ ...draft, locality })}
                required
                value={draft.locality}
              />
            </View>
          </View>
          <TextField
            label="Site officiel du lieu"
            onChangeText={(officialUrl) => onChange({ ...draft, officialUrl })}
            placeholder="Facultatif"
            value={draft.officialUrl}
          />
        </View>
      ) : null}
    </View>
  );
}

export default function AddCommunityProductionPage() {
  const params = useLocalSearchParams<{ title?: string }>();
  const router = useRouter();
  const session = authClient.useSession();
  const sessionData = session.data as unknown as {
    user?: { emailVerified?: boolean };
  } | null;
  const [title, setTitle] = useState(
    typeof params.title === "string" ? params.title : "",
  );
  const [discipline, setDiscipline] = useState<Discipline>("theatre");
  const [audience, setAudience] = useState<Audience>("general");
  const [companyName, setCompanyName] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyOfficialUrl, setCompanyOfficialUrl] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");
  const [minimumAge, setMinimumAge] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [language, setLanguage] = useState("");
  const [description, setDescription] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [posterCredit, setPosterCredit] = useState("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [performances, setPerformances] = useState<PerformanceDraft[]>([
    emptyPerformance(),
  ]);
  const [localError, setLocalError] = useState<string | null>(null);

  const companySearch = useQuery({
    queryKey: ["community-company-search", companyName],
    queryFn: () =>
      api.searchCatalog({
        q: companyName.trim(),
        type: "companies",
        temporal: "all",
        limit: 6,
      }),
    enabled: companyName.trim().length >= 2 && !companyId,
    staleTime: 30_000,
  });
  const productionSearch = useQuery({
    queryKey: ["community-production-search", title],
    queryFn: () =>
      api.searchCatalog({
        q: title.trim(),
        type: "productions",
        temporal: "all",
        limit: 8,
      }),
    enabled: title.trim().length >= 2,
    staleTime: 30_000,
  });
  const similarProductions = useMemo(
    () => productionSearch.data?.productions ?? [],
    [productionSearch.data?.productions],
  );
  const exactDuplicate = useMemo(
    () =>
      similarProductions.find(
        (production) =>
          normalized(production.title) === normalized(title) &&
          normalized(production.company?.name ?? "") === normalized(companyName),
      ),
    [companyName, similarProductions, title],
  );

  const createProduction = useMutation({
    mutationFn: async () => {
      setLocalError(null);
      if (exactDuplicate) {
        throw new Error("Ce spectacle existe déjà dans Todam.");
      }
      if (!validHttpUrl(officialUrl)) {
        throw new Error("Ajoutez un lien officiel HTTP ou HTTPS valide.");
      }
      if (
        !companyId &&
        companyOfficialUrl.trim() &&
        !validHttpUrl(companyOfficialUrl)
      ) {
        throw new Error("Le site de la compagnie n’est pas une URL valide.");
      }
      if (posterUrl.trim() && !validHttpsUrl(posterUrl)) {
        throw new Error("L’URL de l’affiche doit être une URL HTTPS directe.");
      }
      if (posterUrl.trim() && posterFile) {
        throw new Error("Choisissez une URL d’affiche ou un fichier, pas les deux.");
      }
      const mappedPerformances = performances.map((performance) => {
        const startsAt = isoDateTime(performance.startsAt);
        const endsAt = performance.endsAt ? isoDateTime(performance.endsAt) : null;
        if (!startsAt) throw new Error("Ajoutez une date et une heure valides.");
        if (performance.endsAt && !endsAt) {
          throw new Error("La date de fin d’une représentation est invalide.");
        }
        if (
          !performance.venueId &&
          (!performance.venueName.trim() ||
            !performance.addressLine1.trim() ||
            !performance.postalCode.trim() ||
            !performance.locality.trim())
        ) {
          throw new Error("Complétez le lieu de chaque représentation.");
        }
        if (performance.officialUrl.trim() && !validHttpUrl(performance.officialUrl)) {
          throw new Error("Le site du lieu n’est pas une URL valide.");
        }
        return {
          startsAt,
          endsAt,
          officialUrl: null,
          venue: performance.venueId
            ? { mode: "existing" as const, id: performance.venueId }
            : {
                mode: "new" as const,
                name: performance.venueName.trim(),
                addressLine1: performance.addressLine1.trim(),
                postalCode: performance.postalCode.trim(),
                locality: performance.locality.trim(),
                countryCode: performance.countryCode,
                timezone: performance.timezone,
                officialUrl: performance.officialUrl.trim() || null,
              },
        };
      });
      return api.createCommunityProduction({
        data: {
          title: title.trim(),
          discipline,
          company: companyId
            ? { mode: "existing", id: companyId }
            : {
                mode: "new",
                name: companyName.trim(),
                officialUrl: companyOfficialUrl.trim() || null,
              },
          officialUrl: officialUrl.trim(),
          performances: mappedPerformances,
          audience,
          minimumAge: minimumAge ? Number(minimumAge) : null,
          durationMinutes: durationMinutes ? Number(durationMinutes) : null,
          language: language.trim() || null,
          description: description.trim() || null,
          poster: posterUrl.trim()
            ? {
                url: posterUrl.trim(),
                credit: posterCredit.trim() || null,
              }
            : null,
        },
        ...(posterFile ? { posterFile, posterFilename: posterFile.name } : {}),
      });
    },
    onSuccess: (created) =>
      router.replace({
        pathname: "/production/[slug]",
        params: { slug: created.slug, created: "1" },
      }),
    onError: (error) =>
      setLocalError(
        error instanceof TodamApiError
          ? error.problem.detail
          : error instanceof Error
            ? error.message
            : "Le spectacle n’a pas pu être publié.",
      ),
  });

  if (session.isPending) {
    return (
      <>
        <Head>
          <title>Ajouter un spectacle | Todam</title>
          <meta content="noindex,nofollow" name="robots" />
        </Head>
        <PageStaticView className="flex-1">
          <AsyncState empty={false} emptyMessage="" error={false} loading>
            {null}
          </AsyncState>
        </PageStaticView>
      </>
    );
  }

  if (Platform.OS !== "web") {
    return (
      <PageScrollView contentContainerClassName="flex-grow">
        <View className="todam-page-before-footer mx-auto w-full max-w-xl flex-1 items-center justify-center gap-5 px-5 py-12">
          <SectionTitle level={1}>Ajout disponible sur le Web</SectionTitle>
          <Text className="text-center text-base leading-6 text-muted">
            L’ajout communautaire d’un spectacle est actuellement proposé sur todam.fr.
          </Text>
          <Button
            label="Revenir à la découverte"
            onPress={() => router.replace("/decouvrir")}
            variant="quiet"
          />
        </View>
        <LegalFooter />
      </PageScrollView>
    );
  }

  if (!sessionData) {
    return (
      <>
        <Head>
          <title>Ajouter un spectacle | Todam</title>
          <meta content="noindex,nofollow" name="robots" />
        </Head>
        <PageScrollView contentContainerClassName="flex-grow">
          <View className="todam-page-before-footer mx-auto w-full max-w-xl flex-1 items-center justify-center gap-5 px-5 py-12">
            <SectionTitle level={1}>Un compte est nécessaire</SectionTitle>
            <Text className="text-center text-base leading-6 text-muted">
              Connectez-vous avec un e-mail vérifié pour publier un spectacle.
            </Text>
            <Button
              label="Se connecter"
              onPress={() =>
                router.push({
                  pathname: "/sign-in",
                  params: {
                    returnTo: `/ajouter-un-spectacle?title=${encodeURIComponent(title)}`,
                  },
                })
              }
            />
          </View>
          <LegalFooter />
        </PageScrollView>
      </>
    );
  }

  const emailVerified = Boolean(sessionData.user?.emailVerified);
  if (!emailVerified) {
    return (
      <>
        <Head>
          <title>Vérifier votre e-mail | Todam</title>
          <meta content="noindex,nofollow" name="robots" />
        </Head>
        <PageScrollView contentContainerClassName="flex-grow">
          <View className="todam-page-before-footer mx-auto w-full max-w-xl flex-1 items-center justify-center gap-5 px-5 py-12">
            <SectionTitle level={1}>Vérification nécessaire</SectionTitle>
            <Text className="text-center text-base leading-6 text-muted">
              Vérifiez votre adresse e-mail avant de publier un spectacle.
            </Text>
            <Button
              label="Revenir à la découverte"
              onPress={() => router.replace("/decouvrir")}
              variant="quiet"
            />
          </View>
          <LegalFooter />
        </PageScrollView>
      </>
    );
  }

  const companies = companySearch.data?.companies ?? [];
  const formComplete =
    title.trim().length >= 2 &&
    companyName.trim().length >= 2 &&
    validHttpUrl(officialUrl) &&
    performances.every(
      (performance) =>
        isoDateTime(performance.startsAt) &&
        performance.venueName.trim().length >= 2 &&
        (performance.venueId ||
          (performance.addressLine1.trim() &&
            performance.postalCode.trim() &&
            performance.locality.trim())),
    ) &&
    !exactDuplicate;

  return (
    <>
      <Head>
        <title>Ajouter un spectacle | Todam</title>
        <meta content="noindex,nofollow" name="robots" />
      </Head>
      <PageScrollView
        contentContainerClassName="flex-grow"
        keyboardShouldPersistTaps="handled"
      >
        <View className="todam-page-before-footer mx-auto w-full max-w-3xl flex-1 gap-8 px-5 py-10 md:px-8 md:py-14">
          <View className="gap-4">
            <SectionTitle eyebrow="Catalogue communautaire" level={1}>
              Ajouter un spectacle
            </SectionTitle>
            <Text className="max-w-[70ch] text-base leading-7 text-muted">
              Recherchez les correspondances proposées avant de créer la fiche. Elle
              sera publiée immédiatement.
            </Text>
          </View>

          <View className="gap-6">
            <TextField
              label="Titre"
              maxLength={240}
              onChangeText={setTitle}
              required
              value={title}
              webName="production-title"
            />
            <AccessibleChoiceGroup
              label="Discipline"
              onChange={setDiscipline}
              options={disciplineOptions}
              testIdPrefix="community-discipline"
              value={discipline}
            />
            {similarProductions.length > 0 ? (
              <View
                className={`gap-2 border-l-2 pl-4 ${
                  exactDuplicate ? "border-error" : "border-accent"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    exactDuplicate ? "text-error" : "text-ink"
                  }`}
                >
                  {exactDuplicate
                    ? "Ce spectacle existe déjà : la publication est bloquée."
                    : "Des spectacles similaires existent. Vérifiez-les avant de continuer."}
                </Text>
                {similarProductions.slice(0, 4).map((production) => (
                  <Link href={`/production/${production.slug}`} key={production.id}>
                    <Text className="text-sm font-semibold text-accent">
                      {production.title}
                      {production.company ? ` · ${production.company.name}` : ""}
                    </Text>
                  </Link>
                ))}
              </View>
            ) : null}

            <View className="gap-4 border-t border-line pt-6">
              <Text className="font-serif text-xl font-semibold text-ink">
                Compagnie
              </Text>
              <TextField
                label="Nom de la compagnie"
                onChangeText={(value) => {
                  setCompanyName(value);
                  setCompanyId(null);
                }}
                required
                value={companyName}
                webName="company-name"
              />
              {companyId ? (
                <View className="flex-row flex-wrap items-center justify-between gap-3 border-l-2 border-success pl-4">
                  <Text className="text-sm font-semibold text-success">
                    Compagnie existante sélectionnée
                  </Text>
                  <Button
                    label="Créer une autre compagnie"
                    onPress={() => setCompanyId(null)}
                    variant="ghost"
                  />
                </View>
              ) : companies.length > 0 ? (
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-ink">
                    Compagnies similaires — sélectionnez-en une si elle correspond
                  </Text>
                  {companies.map((company) => (
                    <Pressable
                      accessibilityRole="button"
                      className="min-h-11 justify-center border-l-2 border-accent pl-3"
                      key={company.id}
                      onPress={() => {
                        setCompanyId(company.id);
                        setCompanyName(company.name);
                        setCompanyOfficialUrl(company.officialUrl ?? "");
                      }}
                    >
                      <Text className="text-sm font-semibold text-accent">
                        {company.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {!companyId ? (
                <TextField
                  label="Site officiel de la compagnie"
                  onChangeText={setCompanyOfficialUrl}
                  placeholder="Facultatif"
                  value={companyOfficialUrl}
                />
              ) : null}
            </View>

            <TextField
              label="Lien officiel du spectacle"
              onChangeText={setOfficialUrl}
              placeholder="https://…"
              required
              value={officialUrl}
              webName="official-url"
            />

            <View className="gap-4 border-t border-line pt-6">
              <View className="flex-row flex-wrap items-center justify-between gap-3">
                <Text className="font-serif text-xl font-semibold text-ink">
                  Représentations
                </Text>
                <Button
                  label="Ajouter une représentation"
                  onPress={() =>
                    setPerformances((current) => [...current, emptyPerformance()])
                  }
                  variant="quiet"
                />
              </View>
              {performances.map((performance) => (
                <VenueEditor
                  draft={performance}
                  key={performance.key}
                  onChange={(next) =>
                    setPerformances((current) =>
                      current.map((item) => (item.key === next.key ? next : item)),
                    )
                  }
                  onRemove={() =>
                    setPerformances((current) =>
                      current.filter((item) => item.key !== performance.key),
                    )
                  }
                  removable={performances.length > 1}
                />
              ))}
            </View>

            <View className="gap-5 border-t border-line pt-6">
              <Text className="font-serif text-xl font-semibold text-ink">
                Informations facultatives
              </Text>
              <AccessibleChoiceGroup
                label="Public"
                onChange={setAudience}
                options={audienceOptions}
                testIdPrefix="community-audience"
                value={audience}
              />
              <View className="gap-3 md:flex-row">
                <View className="min-w-0 flex-1">
                  <TextField
                    keyboardType="number-pad"
                    label="Âge minimum"
                    onChangeText={setMinimumAge}
                    value={minimumAge}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <TextField
                    keyboardType="number-pad"
                    label="Durée en minutes"
                    onChangeText={setDurationMinutes}
                    value={durationMinutes}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <TextField
                    label="Langue"
                    onChangeText={setLanguage}
                    placeholder="fr"
                    value={language}
                  />
                </View>
              </View>
              <TextField
                label="Description promotionnelle déjà publiée"
                maxLength={2000}
                multiline
                onChangeText={setDescription}
                placeholder="Recopiez uniquement une description officielle déjà publiée."
                style={{ minHeight: 160, textAlignVertical: "top" }}
                value={description}
              />
              <Text className="text-sm text-muted">
                {description.length}/2000 caractères
              </Text>
            </View>

            <View className="gap-5 border-t border-line pt-6">
              <Text className="font-serif text-xl font-semibold text-ink">
                Affiche facultative
              </Text>
              <TextField
                editable={!posterFile}
                label="URL HTTPS directe de l’affiche"
                onChangeText={setPosterUrl}
                placeholder="https://…/affiche.webp"
                value={posterUrl}
              />
              {posterUrl.trim() ? (
                <TextField
                  label="Crédit de l’affiche"
                  onChangeText={setPosterCredit}
                  placeholder="Facultatif"
                  value={posterCredit}
                />
              ) : null}
              {Platform.OS === "web"
                ? createElement("input", {
                    accept: "image/jpeg,image/png,image/webp",
                    "aria-label": "Charger une affiche",
                    disabled: Boolean(posterUrl.trim()),
                    onChange: (event: Event) => {
                      const input = event.currentTarget as HTMLInputElement;
                      const file = input.files?.[0] ?? null;
                      if (
                        file &&
                        (file.size > 2 * 1024 * 1024 ||
                          !["image/jpeg", "image/png", "image/webp"].includes(
                            file.type,
                          ))
                      ) {
                        setPosterFile(null);
                        setLocalError(COMMUNITY_POSTER_ERROR);
                        input.value = "";
                        return;
                      }
                      setLocalError(null);
                      setPosterFile(file);
                    },
                    type: "file",
                  })
                : null}
              <Text className="text-sm leading-5 text-muted">
                JPEG, PNG ou WebP · 2 Mo maximum · largeur minimale de 300 px.
              </Text>
              <Text className="text-sm leading-5 text-muted">
                Si la source refuse l’intégration, effacez l’URL et chargez le fichier.
              </Text>
            </View>

            <Text className="rounded-todam border border-selected-border bg-selected p-4 text-sm leading-6 text-muted">
              Merci de respecter notre{" "}
              <Link href="/politique-editoriale">
                <Text className="font-semibold text-accent">politique éditoriale</Text>
              </Link>
              .
            </Text>

            {localError ? (
              <Text
                accessibilityRole="alert"
                className="text-base leading-6 text-error"
              >
                {localError}
              </Text>
            ) : null}
            <View className="self-start">
              <Button
                disabled={!formComplete}
                label="Publier le spectacle"
                loading={createProduction.isPending}
                onPress={() => createProduction.mutate()}
              />
            </View>
          </View>
        </View>
        <LegalFooter />
      </PageScrollView>
    </>
  );
}
