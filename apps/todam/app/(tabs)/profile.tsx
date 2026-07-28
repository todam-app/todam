import Ionicons from "@expo/vector-icons/Ionicons";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Discipline, MemberJournalEntry } from "@todam/contracts";
import { Button, SectionTitle, TextField } from "@todam/design-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import Head from "expo-router/head";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { AsyncState } from "../../components/AsyncState";
import { AccessibleChoiceGroup } from "../../components/AccessibleChoiceGroup";
import { AccessibleTabs } from "../../components/AccessibleTabs";
import { LegalFooter } from "../../components/LegalFooter";
import { PageScrollView, PageStaticView } from "../../components/PageScrollView";
import { ProductionListItem } from "../../components/ProductionListItem";
import { api } from "../../lib/api";
import { authClient } from "../../lib/auth-client";
import { isIsoCalendarDate, isPastOrTodayCalendarDate } from "../../lib/dates";

export type ProfileTab = "journal" | "a-voir" | "listes" | "avis";

const tabs: { value: ProfileTab; label: string }[] = [
  { value: "journal", label: "Journal" },
  { value: "a-voir", label: "À voir" },
  { value: "listes", label: "Listes" },
  { value: "avis", label: "Avis" },
];
const disciplineLabels: Record<Discipline, string> = {
  theatre: "Théâtre",
  opera: "Opéra",
  ballet: "Ballet",
};
const reviewStatusLabels = {
  published: "Publié",
  hidden: "Masqué par l’équipe Todam",
  rejected: "Refusé",
} as const;

function parameter(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function PrivateProfileHead() {
  return (
    <Head>
      <title>Mon journal et mes listes | Todam</title>
      <meta content="noindex,nofollow" name="robots" />
    </Head>
  );
}

function JournalItem({
  entry,
  onDelete,
  onUpdateDate,
}: {
  entry: MemberJournalEntry;
  onDelete: () => void;
  onUpdateDate: (date: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [date, setDate] = useState(entry.attendedOn ?? "");
  return (
    <View className="gap-3 border-b border-line py-4">
      <ProductionListItem headingLevel={2} production={entry.production} />
      <View className="flex-row flex-wrap gap-x-5 gap-y-1">
        {entry.attendedOn ? (
          <Text className="text-sm text-muted">
            Vu le{" "}
            {new Intl.DateTimeFormat("fr-FR").format(
              new Date(`${entry.attendedOn}T12:00:00Z`),
            )}
          </Text>
        ) : null}
        <Text className="text-sm text-muted">
          Ajouté au journal le{" "}
          {new Intl.DateTimeFormat("fr-FR").format(new Date(entry.addedAt))}
        </Text>
        {entry.ratedAt ? (
          <Text className="text-sm text-muted">
            Noté le {new Intl.DateTimeFormat("fr-FR").format(new Date(entry.ratedAt))}
          </Text>
        ) : null}
        {entry.rating ? (
          <Text className="text-sm font-semibold text-ink">{entry.rating}/10</Text>
        ) : null}
      </View>
      {editing ? (
        <View className="max-w-sm gap-3 border-l-2 border-accent pl-4">
          <TextField
            autoComplete="off"
            error={
              date && !isIsoCalendarDate(date)
                ? "Saisissez une date valide au format AAAA-MM-JJ."
                : date && !isPastOrTodayCalendarDate(date)
                  ? "La date vue ne peut pas être dans le futur."
                  : undefined
            }
            label="Date vue"
            onChangeText={setDate}
            placeholder="AAAA-MM-JJ"
            value={date}
            webName={`journal-attended-on-${entry.id}`}
          />
          <View className="flex-row flex-wrap gap-2">
            <Button
              disabled={!isPastOrTodayCalendarDate(date)}
              label="Enregistrer"
              onPress={() => {
                onUpdateDate(date);
                setEditing(false);
              }}
            />
            <Button
              label="Date inconnue"
              onPress={() => {
                setDate("");
                onUpdateDate(null);
                setEditing(false);
              }}
              variant="secondary"
            />
          </View>
        </View>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        <Button
          label="Modifier la date"
          onPress={() => setEditing((value) => !value)}
          variant="ghost"
        />
        {confirmingDelete ? (
          <View className="w-full gap-3 border-l-2 border-danger bg-danger/5 p-4">
            <Text className="text-base font-semibold text-ink">
              Supprimer cette séance ?
            </Text>
            <Text className="text-sm leading-5 text-muted">
              Si c’est votre dernière séance de ce spectacle, sa note et son avis seront
              également supprimés. Cette action est irréversible.
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <Button
                label="Confirmer la suppression"
                onPress={onDelete}
                variant="danger"
              />
              <Button
                label="Annuler"
                onPress={() => setConfirmingDelete(false)}
                variant="secondary"
              />
            </View>
          </View>
        ) : (
          <Button
            label="Supprimer l’entrée"
            onPress={() => setConfirmingDelete(true)}
            variant="danger"
          />
        )}
      </View>
    </View>
  );
}

export function ProfileScreen({ initialTab = "journal" }: { initialTab?: ProfileTab }) {
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const requestedTab = parameter(params.tab) as ProfileTab;
  const [tab, setTab] = useState<ProfileTab>(
    tabs.some((item) => item.value === requestedTab) ? requestedTab : initialTab,
  );
  const [discipline, setDiscipline] = useState<Discipline | undefined>();
  const [year, setYear] = useState("");
  const [venueFilter, setVenueFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState<
    "all" | "with-review" | "without-review"
  >("all");
  const [sort, setSort] = useState<"attended" | "added" | "rated" | "rating" | "title">(
    "attended",
  );
  const [journalView, setJournalView] = useState<"list" | "grid">("list");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [bioDraft, setBioDraft] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [newListVisibility, setNewListVisibility] = useState<"public" | "private">(
    "private",
  );
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [renamedList, setRenamedList] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [confirmingListId, setConfirmingListId] = useState<string | null>(null);
  const [confirmingReviewProductionId, setConfirmingReviewProductionId] = useState<
    string | null
  >(null);

  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
    enabled: Boolean(session.data),
  });
  const profileSettings = useQuery({
    queryKey: ["profile-settings"],
    queryFn: () => api.getProfileSettings(),
    enabled: Boolean(session.data),
  });
  const journal = useInfiniteQuery({
    queryKey: [
      "my-journal",
      discipline,
      year,
      venueFilter,
      ratingFilter,
      reviewFilter,
      sort,
    ],
    queryFn: ({ pageParam }) =>
      api.getMyJournal({
        ...(discipline ? { discipline } : {}),
        ...(/^\d{4}$/.test(year) ? { year: Number(year) } : {}),
        ...(venueFilter.trim() ? { venue: venueFilter.trim() } : {}),
        ...(/^(?:[1-9]|10)$/.test(ratingFilter)
          ? { rating: Number(ratingFilter) }
          : {}),
        ...(reviewFilter === "with-review"
          ? { hasReview: true }
          : reviewFilter === "without-review"
            ? { hasReview: false }
            : {}),
        sort,
        order: sort === "title" ? "asc" : "desc",
        cursor: pageParam,
        limit: 20,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(session.data && tab === "journal"),
  });
  const watchlist = useQuery({
    queryKey: ["watchlist"],
    queryFn: () => api.getWatchlist(),
    enabled: Boolean(session.data && tab === "a-voir"),
  });
  const lists = useQuery({
    queryKey: ["my-lists"],
    queryFn: () => api.getLists(),
    enabled: Boolean(session.data && tab === "listes"),
  });
  const listDetail = useQuery({
    queryKey: ["my-list", selectedListId],
    queryFn: () => api.getList(selectedListId!),
    enabled: Boolean(session.data && selectedListId),
  });
  const reviews = useQuery({
    queryKey: ["my-reviews"],
    queryFn: () => api.getOwnReviews(),
    enabled: Boolean(session.data && tab === "avis"),
  });

  const bio = bioDraft ?? profileSettings.data?.bio ?? "";

  const deleteDiary = useMutation({
    mutationFn: (entryId: string) => api.deleteDiaryEntry(entryId),
    onSuccess: () => {
      setFeedback(
        "L’entrée a été supprimée. La note et l’avis ont aussi été retirés s’il s’agissait de votre dernière séance.",
      );
      void journal.refetch();
      void dashboard.refetch();
      void reviews.refetch();
    },
    onError: () => setFeedback("Impossible de supprimer cette entrée."),
  });
  const updateDiary = useMutation({
    mutationFn: ({ entryId, date }: { entryId: string; date: string | null }) =>
      api.updateDiaryEntry(entryId, {
        performanceId: null,
        attendedOn: date,
      }),
    onSuccess: () => {
      setFeedback("La date a été modifiée.");
      void journal.refetch();
    },
    onError: () => setFeedback("La date du journal n’a pas pu être modifiée."),
  });
  const removeWatchlist = useMutation({
    mutationFn: (productionId: string) => api.removeFromWatchlist(productionId),
    onSuccess: () => {
      void watchlist.refetch();
      void dashboard.refetch();
    },
    onError: () => setFeedback("La liste « À voir » n’a pas pu être modifiée."),
  });
  const createList = useMutation({
    mutationFn: () =>
      api.createList({
        name: newListName,
        description: newListDescription.trim() || null,
        visibility: newListVisibility,
      }),
    onSuccess: (created) => {
      setNewListName("");
      setNewListDescription("");
      setNewListVisibility("private");
      setSelectedListId(created.id);
      setRenamedList(created.name);
      setListDescription(created.description ?? "");
      void lists.refetch();
      void dashboard.refetch();
      setFeedback("La liste a été créée.");
    },
    onError: () => setFeedback("La liste n’a pas pu être créée."),
  });
  const updateList = useMutation({
    mutationFn: ({
      listId,
      input,
    }: {
      listId: string;
      input: {
        description?: string | null;
        name?: string;
        visibility?: "public" | "private";
      };
    }) => api.updateList(listId, input),
    onSuccess: (updated) => {
      setRenamedList(updated.name);
      setListDescription(updated.description ?? "");
      void lists.refetch();
      void listDetail.refetch();
      setFeedback("La liste a été mise à jour.");
    },
    onError: () => setFeedback("La liste n’a pas pu être mise à jour."),
  });
  const deleteList = useMutation({
    mutationFn: (listId: string) => api.deleteList(listId),
    onSuccess: () => {
      setConfirmingListId(null);
      setSelectedListId(null);
      void lists.refetch();
      void dashboard.refetch();
      setFeedback("La liste a été supprimée.");
    },
    onError: () => setFeedback("La liste n’a pas pu être supprimée."),
  });
  const removeListItem = useMutation({
    mutationFn: ({ listId, productionId }: { listId: string; productionId: string }) =>
      api.removeListItem(listId, productionId),
    onSuccess: () => {
      void listDetail.refetch();
      void lists.refetch();
      setFeedback("Le spectacle a été retiré de la liste.");
    },
    onError: () => setFeedback("Le spectacle n’a pas pu être retiré de la liste."),
  });
  const reorderList = useMutation({
    mutationFn: ({
      listId,
      productionIds,
    }: {
      listId: string;
      productionIds: string[];
    }) => api.reorderList(listId, { productionIds }),
    onSuccess: () => {
      void listDetail.refetch();
      setFeedback("L’ordre de la liste a été enregistré.");
    },
    onError: () => setFeedback("L’ordre de la liste n’a pas pu être enregistré."),
  });
  const deleteReview = useMutation({
    mutationFn: (productionId: string) => api.deleteReview(productionId),
    onSuccess: () => {
      setConfirmingReviewProductionId(null);
      void reviews.refetch();
      void dashboard.refetch();
      setFeedback("L’avis a été supprimé.");
    },
    onError: () => setFeedback("L’avis n’a pas pu être supprimé."),
  });
  const updateReviewVisibility = useMutation({
    mutationFn: ({
      body,
      containsSpoiler,
      productionId,
      visibility,
    }: {
      body: string;
      containsSpoiler: boolean;
      productionId: string;
      visibility: "public" | "private";
    }) =>
      api.upsertReview(productionId, {
        body,
        containsSpoiler,
        visibility,
      }),
    onSuccess: () => {
      void reviews.refetch();
      setFeedback("La visibilité de l’avis a été modifiée.");
    },
    onError: () => setFeedback("La visibilité de l’avis n’a pas pu être modifiée."),
  });
  const updateVisibility = useMutation({
    mutationFn: (visibility: "public" | "private") =>
      api.updateProfile({ profileVisibility: visibility }),
    onSuccess: (profile) => {
      queryClient.setQueryData(["profile-settings"], profile);
      setFeedback(
        profile.profileVisibility === "public"
          ? "Votre profil et ses contenus publics sont de nouveau partageables."
          : "Votre profil, votre journal, vos listes et vos avis sont maintenant privés.",
      );
    },
    onError: () => setFeedback("La visibilité du journal n’a pas pu être modifiée."),
  });
  const updateBio = useMutation({
    mutationFn: () => api.updateProfile({ bio: bio.trim() || null }),
    onSuccess: (profile) => {
      queryClient.setQueryData(["profile-settings"], profile);
      setBioDraft(null);
      setFeedback("Votre présentation publique a été enregistrée.");
    },
    onError: () => setFeedback("Votre présentation n’a pas pu être enregistrée."),
  });

  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
  }

  function selectTab(nextTab: ProfileTab) {
    setTab(nextTab);
    if (Platform.OS === "web") {
      router.replace({ pathname: "/profile", params: { tab: nextTab } });
    }
  }

  if (session.isPending) {
    return (
      <>
        <PrivateProfileHead />
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
        <PrivateProfileHead />
        <PageScrollView contentContainerClassName="flex-grow">
          <View className="todam-page-before-footer mx-auto w-full max-w-xl flex-1 items-center justify-center gap-5 px-5 py-12">
            <Text
              aria-level={1}
              accessibilityRole="header"
              className="text-center font-serif text-4xl font-semibold text-ink"
            >
              Votre journal vous attend
            </Text>
            <Text className="text-center text-base leading-6 text-muted">
              Créez un compte pour conserver vos spectacles, vos notes, vos avis et vos
              listes.
            </Text>
            <View className="w-full max-w-xs gap-2">
              <Button label="Créer un compte" onPress={() => router.push("/sign-up")} />
              <Button
                label="Se connecter"
                onPress={() => router.push("/sign-in")}
                variant="secondary"
              />
            </View>
          </View>
          <LegalFooter />
        </PageScrollView>
      </>
    );
  }

  const journalEntries = journal.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <PrivateProfileHead />
      <PageScrollView contentContainerClassName="flex-grow">
        <View className="todam-page-before-footer mx-auto w-full max-w-content flex-1 gap-8 px-5 py-8 md:px-8 md:py-12">
          <View className="gap-5 md:flex-row md:flex-wrap md:items-start md:justify-between">
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-accent">
                Mon espace
              </Text>
              <Text
                aria-level={1}
                accessibilityRole="header"
                className="font-serif text-4xl font-semibold text-ink"
              >
                {dashboard.data?.profile.pseudonym ?? "Mon profil"}
              </Text>
              <Text className="text-sm text-muted">
                Profil{" "}
                {profileSettings.data?.profileVisibility === "private"
                  ? "privé"
                  : "public et partageable"}
              </Text>
            </View>
            <View className="w-full gap-2 md:w-auto md:flex-row md:flex-wrap">
              <Button
                label={
                  profileSettings.data?.profileVisibility === "private"
                    ? "Rendre le profil public"
                    : "Rendre le profil privé"
                }
                loading={updateVisibility.isPending}
                onPress={() =>
                  updateVisibility.mutate(
                    profileSettings.data?.profileVisibility === "private"
                      ? "public"
                      : "private",
                  )
                }
                variant="secondary"
              />
              <Button
                label="Paramètres du compte"
                onPress={() => router.push("/parametres-compte")}
                variant="ghost"
              />
              <Button
                label="Se déconnecter"
                onPress={() => void signOut()}
                variant="ghost"
              />
            </View>
          </View>

          {feedback ? (
            <Text
              accessibilityLiveRegion="polite"
              className="border-l-2 border-accent py-1 pl-4 text-base leading-6 text-ink"
            >
              {feedback}
            </Text>
          ) : null}

          {profileSettings.data?.profileVisibility === "private" ? (
            <Text className="max-w-3xl border-l-2 border-ink py-1 pl-4 text-sm leading-5 text-muted">
              Le journal, les listes et les avis sont masqués au public, même lorsque
              leur visibilité individuelle est réglée sur « public ».
            </Text>
          ) : null}

          <View className="max-w-3xl gap-3 border-l-2 border-accent bg-paper px-5 py-4">
            <Text className="text-base font-semibold text-ink">
              Présentation du profil
            </Text>
            <Text className="text-sm leading-5 text-muted">
              Cette présentation apparaît avec votre pseudonyme lorsque votre journal
              est public. Votre adresse e-mail n’est jamais affichée.
            </Text>
            <TextField
              label="Présentation publique, facultative"
              maxLength={500}
              multiline
              onChangeText={setBioDraft}
              style={{ minHeight: 88, textAlignVertical: "top" }}
              value={bio}
              webName="profile-bio"
            />
            <View className="self-start">
              <Button
                disabled={bio.trim() === (profileSettings.data?.bio ?? "")}
                label="Enregistrer la présentation"
                loading={updateBio.isPending}
                onPress={() => updateBio.mutate()}
                variant="secondary"
              />
            </View>
          </View>

          <View className="grid grid-cols-2 border-y border-line md:grid-cols-4">
            {[
              ["Vus", dashboard.data?.counts.seen ?? 0],
              ["À voir", dashboard.data?.counts.watchlist ?? 0],
              ["Notes", dashboard.data?.counts.ratings ?? 0],
              ["Listes", dashboard.data?.counts.lists ?? 0],
            ].map(([label, value]) => (
              <View className="items-center gap-1 border-line py-4" key={label}>
                <Text className="text-2xl font-bold text-accent">{value}</Text>
                <Text className="text-sm font-semibold text-muted">{label}</Text>
              </View>
            ))}
          </View>

          <AccessibleTabs
            label="Sections du profil"
            onChange={selectTab}
            tabs={tabs}
            testIdPrefix="profile-tab"
            value={tab}
          />

          {tab === "journal" ? (
            <View className="gap-6">
              <View className="gap-3 border-b border-line pb-5 md:flex-row md:flex-wrap md:items-end">
                <View className="w-full flex-row flex-wrap gap-2 md:w-auto">
                  <Button
                    accessibilityState={{ selected: !discipline }}
                    label="Toutes"
                    onPress={() => setDiscipline(undefined)}
                    variant={!discipline ? "primary" : "secondary"}
                  />
                  {(Object.keys(disciplineLabels) as Discipline[]).map((value) => (
                    <Button
                      accessibilityState={{ selected: discipline === value }}
                      key={value}
                      label={disciplineLabels[value]}
                      onPress={() => setDiscipline(value)}
                      variant={discipline === value ? "primary" : "secondary"}
                    />
                  ))}
                </View>
                <View className="w-full md:w-32">
                  <TextField
                    autoComplete="off"
                    error={
                      year && !/^\d{4}$/.test(year)
                        ? "Saisissez une année sur quatre chiffres."
                        : undefined
                    }
                    keyboardType="number-pad"
                    label="Année"
                    maxLength={4}
                    onChangeText={setYear}
                    placeholder="2026"
                    value={year}
                    webName="journal-year"
                  />
                </View>
                <View className="w-full md:w-64">
                  <TextField
                    autoComplete="off"
                    label="Lieu"
                    maxLength={240}
                    onChangeText={setVenueFilter}
                    placeholder="Nom du lieu"
                    value={venueFilter}
                    webName="journal-venue"
                  />
                </View>
                <View className="w-full md:w-28">
                  <TextField
                    autoComplete="off"
                    error={
                      ratingFilter && !/^(?:[1-9]|10)$/.test(ratingFilter)
                        ? "La note doit être comprise entre 1 et 10."
                        : undefined
                    }
                    inputMode="numeric"
                    keyboardType="number-pad"
                    label="Note /10"
                    maxLength={2}
                    onChangeText={setRatingFilter}
                    placeholder="1 à 10"
                    value={ratingFilter}
                    webName="journal-rating"
                  />
                </View>
                <View className="w-full gap-2 md:w-auto">
                  <Text className="text-sm font-semibold text-ink">Avis</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {(
                      [
                        ["all", "Tous"],
                        ["with-review", "Avec avis"],
                        ["without-review", "Sans avis"],
                      ] as const
                    ).map(([value, label]) => (
                      <Button
                        accessibilityState={{ selected: reviewFilter === value }}
                        key={value}
                        label={label}
                        onPress={() => setReviewFilter(value)}
                        variant={reviewFilter === value ? "primary" : "secondary"}
                      />
                    ))}
                  </View>
                </View>
                <View className="w-full flex-row flex-wrap gap-2 md:w-auto">
                  <Button
                    accessibilityState={{ selected: sort === "attended" }}
                    label="Date vue"
                    onPress={() => setSort("attended")}
                    variant={sort === "attended" ? "primary" : "secondary"}
                  />
                  <Button
                    accessibilityState={{ selected: sort === "added" }}
                    label="Date d’ajout"
                    onPress={() => setSort("added")}
                    variant={sort === "added" ? "primary" : "secondary"}
                  />
                  <Button
                    accessibilityState={{ selected: sort === "rated" }}
                    label="Date de notation"
                    onPress={() => setSort("rated")}
                    variant={sort === "rated" ? "primary" : "secondary"}
                  />
                  <Button
                    accessibilityState={{ selected: sort === "rating" }}
                    label="Note"
                    onPress={() => setSort("rating")}
                    variant={sort === "rating" ? "primary" : "secondary"}
                  />
                  <Button
                    accessibilityState={{ selected: sort === "title" }}
                    label="Titre"
                    onPress={() => setSort("title")}
                    variant={sort === "title" ? "primary" : "secondary"}
                  />
                  <Button
                    label={journalView === "list" ? "Vue grille" : "Vue liste"}
                    onPress={() =>
                      setJournalView((value) => (value === "list" ? "grid" : "list"))
                    }
                    variant="ghost"
                  />
                </View>
              </View>
              <AsyncState
                empty={!journal.isPending && journalEntries.length === 0}
                emptyAction={
                  <Button
                    label="Rechercher un spectacle"
                    onPress={() => router.push("/search")}
                  />
                }
                emptyMessage="Votre journal est vide. Recherchez un spectacle et marquez-le comme vu."
                error={journal.isError}
                loading={journal.isPending}
                onRetry={() => void journal.refetch()}
              >
                <View
                  className={
                    journalView === "grid" ? "flex-row flex-wrap gap-5" : "gap-1"
                  }
                >
                  {journalEntries.map((entry) => (
                    <View
                      className={
                        journalView === "grid" ? "w-full md:w-[48%]" : "w-full"
                      }
                      key={entry.id}
                    >
                      <JournalItem
                        entry={entry}
                        onDelete={() => deleteDiary.mutate(entry.id)}
                        onUpdateDate={(date) =>
                          updateDiary.mutate({ entryId: entry.id, date })
                        }
                      />
                    </View>
                  ))}
                </View>
                {journal.hasNextPage ? (
                  <View className="mt-5 w-full max-w-xs self-center">
                    <Button
                      label="Charger la suite"
                      loading={journal.isFetchingNextPage}
                      onPress={() => void journal.fetchNextPage()}
                      variant="secondary"
                    />
                  </View>
                ) : null}
              </AsyncState>
            </View>
          ) : null}

          {tab === "a-voir" ? (
            <AsyncState
              empty={!watchlist.isPending && (watchlist.data?.length ?? 0) === 0}
              emptyAction={
                <Button
                  label="Découvrir les spectacles"
                  onPress={() => router.push("/decouvrir")}
                />
              }
              emptyMessage="Votre liste « À voir » est vide. Découvrez les spectacles à venir."
              error={watchlist.isError}
              loading={watchlist.isPending}
              onRetry={() => void watchlist.refetch()}
            >
              <View className="gap-1">
                {watchlist.data?.map((item) => (
                  <View className="gap-2" key={item.production.id}>
                    <ProductionListItem headingLevel={2} production={item.production} />
                    <View className="self-start">
                      <Button
                        label="Retirer de « À voir »"
                        onPress={() => removeWatchlist.mutate(item.production.id)}
                        variant="ghost"
                      />
                    </View>
                  </View>
                ))}
                {(watchlist.data?.length ?? 0) === 0 ? (
                  <View className="self-start">
                    <Button
                      label="Découvrir les spectacles"
                      onPress={() => router.push("/decouvrir")}
                    />
                  </View>
                ) : null}
              </View>
            </AsyncState>
          ) : null}

          {tab === "listes" ? (
            <View className="gap-7 md:flex-row md:items-start">
              <View className="w-full gap-4 md:max-w-sm">
                <SectionTitle>Mes listes</SectionTitle>
                <View className="gap-3 border border-control bg-paper p-4">
                  <TextField
                    label="Nom de la nouvelle liste"
                    maxLength={80}
                    onChangeText={setNewListName}
                    required
                    value={newListName}
                    webName="new-list-name"
                  />
                  <TextField
                    label="Description, facultative"
                    maxLength={500}
                    multiline
                    onChangeText={setNewListDescription}
                    style={{ minHeight: 88, textAlignVertical: "top" }}
                    value={newListDescription}
                    webName="new-list-description"
                  />
                  <AccessibleChoiceGroup
                    label="Visibilité"
                    onChange={setNewListVisibility}
                    options={[
                      ["private", "Privée"],
                      ["public", "Publique"],
                    ]}
                    testIdPrefix="new-list-visibility"
                    value={newListVisibility}
                  />
                  <Text className="text-sm leading-5 text-muted">
                    Une liste publique est partageable lorsque votre profil est public ;
                    une liste privée reste visible par vous seul.
                  </Text>
                  <Button
                    disabled={!newListName.trim()}
                    label="Créer la liste"
                    loading={createList.isPending}
                    onPress={() => createList.mutate()}
                  />
                </View>
                <AsyncState
                  empty={!lists.isPending && (lists.data?.length ?? 0) === 0}
                  emptyMessage="Aucune liste personnalisée. Utilisez le formulaire ci-dessus pour créer la première."
                  error={lists.isError}
                  loading={lists.isPending}
                  onRetry={() => void lists.refetch()}
                >
                  <View className="gap-1">
                    {lists.data?.map((list) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: selectedListId === list.id }}
                        className={`min-h-16 justify-center border-b border-line py-3 ${
                          selectedListId === list.id
                            ? "border-l-2 border-l-accent pl-3"
                            : ""
                        }`}
                        key={list.id}
                        onPress={() => {
                          setSelectedListId(list.id);
                          setRenamedList(list.name);
                          setListDescription(list.description ?? "");
                        }}
                      >
                        <Text className="text-base font-semibold text-ink">
                          {list.name}
                        </Text>
                        <Text className="text-sm text-muted">
                          {list.itemCount} spectacle
                          {list.itemCount > 1 ? "s" : ""} ·{" "}
                          {list.visibility === "public" ? "Publique" : "Privée"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </AsyncState>
              </View>

              <View className="min-w-0 flex-1 gap-4">
                {selectedListId && listDetail.isPending ? (
                  <AsyncState empty={false} emptyMessage="" error={false} loading>
                    {null}
                  </AsyncState>
                ) : selectedListId && listDetail.isError ? (
                  <AsyncState
                    empty={false}
                    emptyMessage=""
                    error
                    loading={false}
                    onRetry={() => void listDetail.refetch()}
                  >
                    {null}
                  </AsyncState>
                ) : listDetail.data ? (
                  <>
                    <View className="gap-3 border-b border-line pb-5">
                      <SectionTitle>{listDetail.data.name}</SectionTitle>
                      {listDetail.data.visibility === "public" &&
                      profileSettings.data?.profileVisibility === "public" ? (
                        <View className="self-start">
                          <Button
                            label="Ouvrir la page publique"
                            onPress={() =>
                              router.push(
                                `/membre/${listDetail.data!.username}/listes/${listDetail.data!.slug}`,
                              )
                            }
                            variant="secondary"
                          />
                        </View>
                      ) : listDetail.data.visibility === "public" ? (
                        <Text className="text-sm text-muted">
                          Cette liste redeviendra partageable lorsque votre profil sera
                          public.
                        </Text>
                      ) : (
                        <Text className="text-sm text-muted">
                          Cette liste est privée et ne possède pas de page partageable.
                        </Text>
                      )}
                      <TextField
                        label="Nom"
                        maxLength={80}
                        onChangeText={setRenamedList}
                        required
                        value={renamedList}
                        webName={`list-${listDetail.data.id}-name`}
                      />
                      <TextField
                        label="Description"
                        maxLength={500}
                        multiline
                        onChangeText={setListDescription}
                        style={{ minHeight: 88, textAlignVertical: "top" }}
                        value={listDescription}
                        webName={`list-${listDetail.data.id}-description`}
                      />
                      <View className="flex-row flex-wrap gap-2">
                        <Button
                          disabled={!renamedList.trim()}
                          label="Enregistrer"
                          onPress={() =>
                            updateList.mutate({
                              listId: listDetail.data!.id,
                              input: {
                                name: renamedList,
                                description: listDescription.trim() || null,
                              },
                            })
                          }
                        />
                        <Button
                          label={
                            listDetail.data.visibility === "public"
                              ? "Rendre privée"
                              : "Rendre publique"
                          }
                          onPress={() =>
                            updateList.mutate({
                              listId: listDetail.data!.id,
                              input: {
                                visibility:
                                  listDetail.data!.visibility === "public"
                                    ? "private"
                                    : "public",
                              },
                            })
                          }
                          variant="secondary"
                        />
                      </View>
                      {confirmingListId === listDetail.data.id ? (
                        <View
                          accessibilityLiveRegion="polite"
                          className="gap-3 border-l-2 border-error bg-[#FFF4F2] p-4"
                        >
                          <Text className="text-base font-semibold text-ink">
                            Supprimer définitivement cette liste ?
                          </Text>
                          <Text className="text-base leading-6 text-muted">
                            Son nom, sa description et son ordre seront perdus. Les
                            spectacles resteront dans votre journal.
                          </Text>
                          <View className="flex-row flex-wrap gap-2">
                            <Button
                              label="Oui, supprimer"
                              loading={deleteList.isPending}
                              onPress={() => deleteList.mutate(listDetail.data!.id)}
                              variant="danger"
                            />
                            <Button
                              label="Annuler"
                              onPress={() => setConfirmingListId(null)}
                              variant="secondary"
                            />
                          </View>
                        </View>
                      ) : (
                        <View className="self-start">
                          <Button
                            label="Supprimer la liste"
                            onPress={() => setConfirmingListId(listDetail.data!.id)}
                            variant="danger"
                          />
                        </View>
                      )}
                    </View>
                    {listDetail.data.items.length > 0 ? (
                      listDetail.data.items.map((item, index, items) => (
                        <View className="gap-2" key={item.production.id}>
                          <ProductionListItem
                            headingLevel={2}
                            production={item.production}
                          />
                          <View className="flex-row flex-wrap gap-2">
                            <Pressable
                              accessibilityLabel={`Monter ${item.production.title} dans la liste`}
                              accessibilityRole="button"
                              accessibilityState={{ disabled: index === 0 }}
                              className={`h-11 w-11 items-center justify-center border border-control ${
                                index === 0 ? "bg-disabled" : "bg-paper"
                              }`}
                              disabled={index === 0}
                              onPress={() => {
                                const ids = items.map((entry) => entry.production.id);
                                [ids[index - 1], ids[index]] = [
                                  ids[index]!,
                                  ids[index - 1]!,
                                ];
                                reorderList.mutate({
                                  listId: listDetail.data!.id,
                                  productionIds: ids,
                                });
                              }}
                            >
                              <Ionicons
                                color={index === 0 ? "#6F6B64" : "#151515"}
                                name="arrow-up"
                                size={20}
                              />
                            </Pressable>
                            <Pressable
                              accessibilityLabel={`Descendre ${item.production.title} dans la liste`}
                              accessibilityRole="button"
                              accessibilityState={{
                                disabled: index === items.length - 1,
                              }}
                              className={`h-11 w-11 items-center justify-center border border-control ${
                                index === items.length - 1 ? "bg-disabled" : "bg-paper"
                              }`}
                              disabled={index === items.length - 1}
                              onPress={() => {
                                const ids = items.map((entry) => entry.production.id);
                                [ids[index], ids[index + 1]] = [
                                  ids[index + 1]!,
                                  ids[index]!,
                                ];
                                reorderList.mutate({
                                  listId: listDetail.data!.id,
                                  productionIds: ids,
                                });
                              }}
                            >
                              <Ionicons
                                color={
                                  index === items.length - 1 ? "#6F6B64" : "#151515"
                                }
                                name="arrow-down"
                                size={20}
                              />
                            </Pressable>
                            <Button
                              label="Retirer"
                              onPress={() =>
                                removeListItem.mutate({
                                  listId: listDetail.data!.id,
                                  productionId: item.production.id,
                                })
                              }
                              variant="ghost"
                            />
                          </View>
                        </View>
                      ))
                    ) : (
                      <View className="gap-3 border-l-2 border-accent pl-4">
                        <Text className="text-base leading-6 text-muted">
                          Cette liste est vide. Ajoutez-y un spectacle depuis sa fiche.
                        </Text>
                        <View className="self-start">
                          <Button
                            label="Rechercher un spectacle"
                            onPress={() => router.push("/search")}
                          />
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  <Text className="border-l-2 border-accent pl-4 text-base leading-6 text-muted">
                    Sélectionnez une liste pour la modifier et la réordonner.
                  </Text>
                )}
              </View>
            </View>
          ) : null}

          {tab === "avis" ? (
            <AsyncState
              empty={!reviews.isPending && (reviews.data?.length ?? 0) === 0}
              emptyAction={
                <Button
                  label="Trouver un spectacle à commenter"
                  onPress={() => router.push("/search")}
                />
              }
              emptyMessage="Vous n’avez pas encore écrit d’avis."
              error={reviews.isError}
              loading={reviews.isPending}
              onRetry={() => void reviews.refetch()}
            >
              <View className="gap-1">
                {reviews.data?.map((review) => (
                  <View className="gap-3 border-b border-line py-5" key={review.id}>
                    <ProductionListItem
                      headingLevel={2}
                      production={review.production}
                    />
                    <Text className="max-w-[72ch] text-base leading-6 text-ink">
                      {review.body}
                    </Text>
                    <Text className="text-sm text-muted">
                      {review.visibility === "public" ? "Avis public" : "Avis privé"} ·{" "}
                      {reviewStatusLabels[review.status]}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      <Button
                        label={
                          review.visibility === "public"
                            ? "Rendre l’avis privé"
                            : "Rendre l’avis public"
                        }
                        loading={updateReviewVisibility.isPending}
                        onPress={() =>
                          updateReviewVisibility.mutate({
                            body: review.body,
                            containsSpoiler: review.containsSpoiler,
                            productionId: review.production.id,
                            visibility:
                              review.visibility === "public" ? "private" : "public",
                          })
                        }
                        variant="secondary"
                      />
                    </View>
                    {confirmingReviewProductionId === review.production.id ? (
                      <View
                        accessibilityLiveRegion="polite"
                        className="gap-3 border-l-2 border-error bg-[#FFF4F2] p-4"
                      >
                        <Text className="text-base font-semibold text-ink">
                          Supprimer définitivement cet avis ?
                        </Text>
                        <Text className="text-base leading-6 text-muted">
                          Votre note et votre entrée de journal seront conservées.
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                          <Button
                            label="Oui, supprimer"
                            loading={deleteReview.isPending}
                            onPress={() => deleteReview.mutate(review.production.id)}
                            variant="danger"
                          />
                          <Button
                            label="Annuler"
                            onPress={() => setConfirmingReviewProductionId(null)}
                            variant="secondary"
                          />
                        </View>
                      </View>
                    ) : (
                      <View className="self-start">
                        <Button
                          label="Supprimer l’avis"
                          onPress={() =>
                            setConfirmingReviewProductionId(review.production.id)
                          }
                          variant="danger"
                        />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </AsyncState>
          ) : null}
        </View>
        <LegalFooter />
      </PageScrollView>
    </>
  );
}

export default function ProfileRoute() {
  return <ProfileScreen />;
}
