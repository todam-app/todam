import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UsernameSchema } from "@todam/contracts";
import { Button, RatingLights, TextField, tokens } from "@todam/design-system";
import { Redirect, type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { AccountSettingsContent } from "../../components/AccountSettingsContent";
import { AccessibleTabs } from "../../components/AccessibleTabs";
import { AsyncState } from "../../components/AsyncState";
import { MyShowsNavigation } from "../../components/MyShowsNavigation";
import { PageScrollView } from "../../components/PageScrollView";
import { PrivatePageHead } from "../../components/PrivatePageHead";
import {
  PrivateSessionLoading,
  PrivateSessionRequired,
} from "../../components/PrivateSessionState";
import { api } from "../../lib/api";
import { authClient } from "../../lib/auth-client";

type ProfileSection = "information" | "statistics" | "settings";

const profileSections = [
  { label: "Informations", value: "information" },
  { label: "Statistiques", value: "statistics" },
  { label: "Paramètres", value: "settings" },
] as const;

const legacyTabs: Record<string, Href> = {
  journal: "/journal",
  "a-voir": "/journal/a-voir",
  listes: "/journal/listes",
  avis: "/journal/avis",
  notes: "/journal/notes",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function ProfileContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const params = useLocalSearchParams<{
    section?: string | string[];
  }>();
  const requestedSection = first(params.section);
  const section: ProfileSection = profileSections.some(
    (item) => item.value === requestedSection,
  )
    ? (requestedSection as ProfileSection)
    : "information";
  const [editing, setEditing] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const [bioDraft, setBioDraft] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const profile = useQuery({
    queryKey: ["profile-settings"],
    queryFn: () => api.getProfileSettings(),
    enabled: Boolean(session.data),
  });
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
    enabled: Boolean(session.data),
  });
  const username = usernameDraft ?? profile.data?.username ?? "";
  const bio = bioDraft ?? profile.data?.bio ?? "";
  const usernameValid = UsernameSchema.safeParse(username).success;

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (username !== profile.data?.username) {
        await api.updateUsername(username);
      }
      return api.updateProfile({ bio: bio.trim() || null });
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(["profile-settings"], updated);
      await Promise.all([
        session.refetch(),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      setEditing(false);
      setUsernameDraft(null);
      setBioDraft(null);
      setFeedback("Votre profil a été modifié.");
    },
    onError: () => setFeedback("Le profil n’a pas pu être modifié."),
  });
  const updateVisibility = useMutation({
    mutationFn: (visibility: "public" | "private") =>
      api.updateProfile({ profileVisibility: visibility }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile-settings"], updated);
      setFeedback("La visibilité du profil a été modifiée.");
    },
    onError: () => setFeedback("La visibilité n’a pas pu être modifiée."),
  });
  const updateRatingVisibility = useMutation({
    mutationFn: (visibility: "review_only" | "public") =>
      api.updateProfile({ ratingVisibility: visibility }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile-settings"], updated);
      setFeedback("La visibilité des notes a été modifiée.");
    },
    onError: () => setFeedback("La visibilité des notes n’a pas pu être modifiée."),
  });

  function selectSection(next: ProfileSection) {
    router.replace({
      pathname: "/profile",
      params: next === "information" ? {} : { section: next },
    });
  }

  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
    router.replace("/");
  }

  if (session.isPending) {
    return (
      <>
        <PrivatePageHead title="Profil" />
        <PrivateSessionLoading />
      </>
    );
  }
  if (!session.data) {
    return (
      <>
        <PrivatePageHead title="Profil" />
        <PrivateSessionRequired description="Connectez-vous pour gérer votre profil et vos paramètres." />
      </>
    );
  }

  const distribution = dashboard.data?.ratingDistribution ?? [];
  const ratingTotal = distribution.reduce(
    (sum, item) => sum + item.value * item.count,
    0,
  );
  const ratingCount = distribution.reduce((sum, item) => sum + item.count, 0);
  const averageRating = ratingCount > 0 ? ratingTotal / ratingCount : null;
  const maxDistribution = Math.max(1, ...distribution.map((item) => item.count));

  return (
    <>
      <PrivatePageHead title="Profil" />
      <PageScrollView
        contentContainerClassName="flex-grow"
        keyboardShouldPersistTaps="handled"
      >
        <View className="todam-page-before-footer mx-auto w-full max-w-6xl flex-1 gap-6 px-4 py-6 md:px-8 md:py-10">
          <AsyncState
            empty={false}
            emptyMessage=""
            error={profile.isError || dashboard.isError}
            loading={profile.isPending || dashboard.isPending}
            onRetry={() => {
              void profile.refetch();
              void dashboard.refetch();
            }}
          >
            {profile.data && dashboard.data ? (
              <>
                <View className="flex-row flex-wrap items-center gap-4 rounded-panel border border-line bg-paper p-4 shadow-soft md:gap-5 md:p-6">
                  <View className="h-16 w-16 items-center justify-center rounded-full border border-line bg-canvas md:h-20 md:w-20">
                    <Ionicons
                      accessibilityElementsHidden
                      color={tokens.color.muted}
                      importantForAccessibility="no"
                      name="person-outline"
                      size={40}
                    />
                  </View>
                  <View className="min-w-0 flex-1 items-start gap-1">
                    <Text
                      aria-level={1}
                      accessibilityRole="header"
                      className="font-serif text-3xl font-semibold text-ink"
                    >
                      {profile.data.username}
                    </Text>
                    <Text className="text-sm font-semibold text-muted">
                      Profil{" "}
                      {profile.data.profileVisibility === "public" ? "public" : "privé"}
                      {" · "}
                      Membre depuis{" "}
                      {new Intl.DateTimeFormat("fr-FR", {
                        month: "long",
                        year: "numeric",
                      }).format(new Date(profile.data.memberSince))}
                    </Text>
                    {profile.data.bio ? (
                      <Text
                        className="pt-1 text-left text-sm leading-5 text-ink md:text-base md:leading-6"
                        numberOfLines={2}
                      >
                        {profile.data.bio}
                      </Text>
                    ) : null}
                  </View>
                  <View className="w-full flex-row flex-wrap justify-start gap-2 md:w-auto md:justify-end md:gap-3">
                    <Button
                      label={editing ? "Fermer" : "Modifier"}
                      onPress={() => {
                        setEditing((value) => !value);
                        setFeedback(null);
                      }}
                      variant={editing ? "quiet" : "primary"}
                    />
                    <Button
                      label="Déconnexion"
                      onPress={() => void signOut()}
                      variant="quiet"
                    />
                  </View>
                </View>

                {editing ? (
                  <View className="todam-form-panel gap-4 p-5">
                    <TextField
                      autoCapitalize="none"
                      autoComplete="off"
                      label="Nom d'utilisateur"
                      maxLength={30}
                      onChangeText={setUsernameDraft}
                      required
                      value={username}
                      webName="profile-username"
                    />
                    {!usernameValid ? (
                      <Text accessibilityRole="alert" className="text-sm text-danger">
                        Utilisez 3 à 30 lettres, chiffres, points, tirets ou
                        underscores.
                      </Text>
                    ) : null}
                    <TextField
                      autoComplete="off"
                      label="Présentation"
                      maxLength={500}
                      multiline
                      onChangeText={setBioDraft}
                      value={bio}
                      webName="profile-bio"
                    />
                    <Button
                      disabled={!usernameValid}
                      label="Enregistrer"
                      loading={updateProfile.isPending}
                      onPress={() => updateProfile.mutate()}
                    />
                  </View>
                ) : null}

                {feedback ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    className="text-center text-sm text-muted"
                  >
                    {feedback}
                  </Text>
                ) : null}

                <MyShowsNavigation
                  accessibilityLabel="Activité du profil"
                  counts={{
                    watchlist: dashboard.data.counts.watchlist,
                    seen: dashboard.data.counts.seen,
                    ratings: dashboard.data.counts.ratings,
                    reviews: dashboard.data.counts.reviews,
                    lists: dashboard.data.counts.lists,
                  }}
                  variant="compact"
                />

                <AccessibleTabs
                  appearance="underline"
                  compactOnMobile
                  label="Sections du profil"
                  onChange={selectSection}
                  tabs={profileSections}
                  testIdPrefix="profile-section"
                  value={section}
                />

                {section === "information" ? (
                  <View className="gap-4">
                    <Text
                      aria-level={2}
                      accessibilityRole="header"
                      className="font-serif text-2xl font-semibold text-ink"
                    >
                      Informations
                    </Text>
                    <View className="todam-form-panel gap-4 p-5">
                      <View className="gap-1">
                        <Text className="text-sm font-semibold text-muted">
                          {"Nom d'utilisateur"}
                        </Text>
                        <Text className="text-base text-ink">
                          {profile.data.username}
                        </Text>
                      </View>
                      <View className="gap-1">
                        <Text className="text-sm font-semibold text-muted">
                          Présentation
                        </Text>
                        <Text className="text-base leading-6 text-ink">
                          {profile.data.bio || "Aucune présentation renseignée."}
                        </Text>
                      </View>
                      <View className="gap-1">
                        <Text className="text-sm font-semibold text-muted">
                          Inscription
                        </Text>
                        <Text className="text-base text-ink">
                          {new Intl.DateTimeFormat("fr-FR", {
                            dateStyle: "long",
                          }).format(new Date(profile.data.memberSince))}
                        </Text>
                      </View>
                      <View className="gap-1">
                        <Text className="text-sm font-semibold text-muted">
                          Visibilité
                        </Text>
                        <Text className="text-base text-ink">
                          {profile.data.profileVisibility === "public"
                            ? "Profil public"
                            : "Profil privé"}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {section === "statistics" ? (
                  <View className="gap-6 md:flex-row md:items-start">
                    <View className="todam-form-panel w-full items-center justify-center gap-3 p-6 md:w-72">
                      <Text
                        aria-level={2}
                        accessibilityRole="header"
                        className="text-lg font-bold text-ink"
                      >
                        Moyenne personnelle
                      </Text>
                      <View className="items-center gap-2">
                        <RatingLights showValue value={averageRating} />
                        <Text className="text-center text-sm font-semibold text-muted">
                          {ratingCount > 0
                            ? `${ratingCount} ${ratingCount > 1 ? "notes" : "note"}`
                            : "Aucune note"}
                        </Text>
                      </View>
                    </View>
                    <View className="todam-form-panel min-w-0 flex-1 gap-4 p-5 md:p-6">
                      <Text
                        aria-level={2}
                        accessibilityRole="header"
                        className="font-serif text-2xl font-semibold text-ink"
                      >
                        Distribution des notes
                      </Text>
                      {Array.from({ length: 10 }, (_, index) => 10 - index).map(
                        (value) => {
                          const count =
                            distribution.find((item) => item.value === value)?.count ??
                            0;
                          return (
                            <View
                              accessibilityLabel={`${value} sur 10 : ${count}`}
                              className="flex-row items-center gap-3"
                              key={value}
                            >
                              <Text className="w-10 text-sm font-semibold text-ink">
                                {value}/10
                              </Text>
                              <View className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-canvas">
                                <View
                                  className="h-full rounded-full bg-accent"
                                  style={{
                                    width: `${(count / maxDistribution) * 100}%`,
                                  }}
                                />
                              </View>
                              <Text className="w-8 text-right text-sm text-muted">
                                {count}
                              </Text>
                            </View>
                          );
                        },
                      )}
                    </View>
                  </View>
                ) : null}

                {section === "settings" ? (
                  <AccountSettingsContent
                    onRatingVisibilityChange={(value) =>
                      updateRatingVisibility.mutate(value)
                    }
                    onVisibilityChange={(value) => updateVisibility.mutate(value)}
                    profileVisibility={profile.data.profileVisibility}
                    ratingVisibility={profile.data.ratingVisibility}
                  />
                ) : null}
              </>
            ) : null}
          </AsyncState>
        </View>
      </PageScrollView>
    </>
  );
}

export default function ProfileRoute() {
  const params = useLocalSearchParams<{
    tab?: string | string[];
  }>();
  const legacyTab = first(params.tab);
  if (legacyTab && legacyTabs[legacyTab]) {
    return <Redirect href={legacyTabs[legacyTab]} />;
  }
  return <ProfileContent />;
}
