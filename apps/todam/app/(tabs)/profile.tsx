import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UsernameSchema } from "@todam/contracts";
import {
  Button,
  RatingLights,
  TextField,
  tokens,
} from "@todam/design-system";
import {
  Link,
  Redirect,
  type Href,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AccessibleChoiceGroup } from "../../components/AccessibleChoiceGroup";
import { AccessibleTabs } from "../../components/AccessibleTabs";
import { AsyncState } from "../../components/AsyncState";
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

function StatTile({
  href,
  label,
  value,
}: {
  href?: Href;
  label: string;
  value: string | number;
}) {
  const content = (
    <Pressable
      accessibilityRole={href ? "link" : undefined}
      className="min-h-24 min-w-[138px] flex-1 items-center justify-center gap-1 rounded-panel border border-line bg-paper p-4 shadow-soft"
      disabled={!href}
    >
      <Text className="font-serif text-3xl font-semibold text-ink">{value}</Text>
      <Text className="text-center text-sm font-semibold text-muted">{label}</Text>
    </Pressable>
  );

  return href ? (
    <Link href={href} asChild>
      {content}
    </Link>
  ) : (
    content
  );
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
        contentContainerClassName="mx-auto w-full max-w-4xl gap-6 px-4 py-6 md:px-8 md:py-10"
        keyboardShouldPersistTaps="handled"
      >
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
              <View className="items-center gap-3 pb-2">
                <View className="h-24 w-24 items-center justify-center rounded-full border border-line bg-canvas">
                  <Ionicons
                    accessibilityElementsHidden
                    color={tokens.color.muted}
                    importantForAccessibility="no"
                    name="person-outline"
                    size={54}
                  />
                </View>
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
                </Text>
                <Button
                  label={editing ? "Fermer la modification" : "Modifier mon profil"}
                  onPress={() => {
                    setEditing((value) => !value);
                    setFeedback(null);
                  }}
                  variant="quiet"
                />
              </View>

              {editing ? (
                <View className="todam-form-panel gap-4 p-5">
                  <TextField
                    autoCapitalize="none"
                    autoComplete="off"
                    label="Pseudonyme"
                    maxLength={30}
                    onChangeText={setUsernameDraft}
                    required
                    value={username}
                    webName="profile-username"
                  />
                  {!usernameValid ? (
                    <Text accessibilityRole="alert" className="text-sm text-danger">
                      Utilisez 3 à 30 lettres, chiffres, points, tirets ou underscores.
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
                        Pseudonyme
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
                <View className="gap-6">
                  <View className="flex-row flex-wrap gap-3">
                    <StatTile
                      href="/journal/vus"
                      label="Vus"
                      value={dashboard.data.counts.seen}
                    />
                    <StatTile
                      href="/journal/a-voir"
                      label="À voir"
                      value={dashboard.data.counts.watchlist}
                    />
                    <StatTile
                      href="/journal/notes"
                      label="Notés"
                      value={dashboard.data.counts.ratings}
                    />
                    <StatTile
                      href="/journal/listes"
                      label="Listes"
                      value={dashboard.data.counts.lists}
                    />
                    <StatTile
                      href="/journal/avis"
                      label="Avis écrits"
                      value={dashboard.data.counts.reviews}
                    />
                    <View className="min-h-24 min-w-[210px] flex-1 items-center justify-center gap-2 rounded-panel border border-line bg-paper p-4 shadow-soft">
                      <RatingLights showValue value={averageRating} />
                      <Text className="text-center text-sm font-semibold text-muted">
                        Moyenne personnelle
                      </Text>
                    </View>
                  </View>
                  <View className="todam-form-panel gap-4 p-5">
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
                          distribution.find((item) => item.value === value)?.count ?? 0;
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
                <View className="gap-6">
                  <View className="todam-form-panel gap-4 p-5">
                    <Text
                      aria-level={2}
                      accessibilityRole="header"
                      className="font-serif text-2xl font-semibold text-ink"
                    >
                      Visibilité
                    </Text>
                    <Text className="text-base leading-6 text-muted">
                      Un profil privé masque aussi les listes et avis réglés comme
                      publics.
                    </Text>
                    <AccessibleChoiceGroup
                      label="Visibilité du profil"
                      onChange={(value) => updateVisibility.mutate(value)}
                      options={[
                        ["public", "Public"],
                        ["private", "Privé"],
                      ]}
                      testIdPrefix="profile-visibility"
                      value={profile.data.profileVisibility}
                    />
                  </View>
                  <Link href="/parametres-compte" asChild>
                    <Pressable
                      accessibilityRole="link"
                      className="min-h-16 flex-row items-center justify-between rounded-panel border border-line bg-paper px-5 shadow-soft"
                    >
                      <Text className="text-base font-semibold text-ink">
                        Paramètres du compte
                      </Text>
                      <Ionicons
                        color={tokens.color.muted}
                        name="chevron-forward"
                        size={22}
                      />
                    </Pressable>
                  </Link>
                  <View className="items-start">
                    <Button
                      label="Se déconnecter"
                      onPress={() => void signOut()}
                      variant="quiet"
                    />
                  </View>
                  <View className="gap-3 rounded-panel border border-danger bg-error-soft p-5">
                    <Text className="text-lg font-bold text-danger">
                      Suppression du compte
                    </Text>
                    <Text className="text-sm leading-5 text-muted">
                      Cette action efface définitivement vos données personnelles.
                    </Text>
                    <View className="items-start">
                      <Button
                        label="Supprimer mon compte"
                        onPress={() => router.push("/supprimer-mon-compte")}
                        variant="danger"
                      />
                    </View>
                  </View>
                </View>
              ) : null}
            </>
          ) : null}
        </AsyncState>
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
