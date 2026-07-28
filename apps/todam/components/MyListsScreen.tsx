import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, TextField } from "@todam/design-system";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { AccessibleChoiceGroup } from "./AccessibleChoiceGroup";
import { AsyncState } from "./AsyncState";
import { MyShowsNavigation } from "./MyShowsNavigation";
import { PageScrollView } from "./PageScrollView";
import { PrivatePageHead } from "./PrivatePageHead";
import { PrivateSessionLoading, PrivateSessionRequired } from "./PrivateSessionState";

export function MyListsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [feedback, setFeedback] = useState<string | null>(null);
  const lists = useQuery({
    queryKey: ["my-lists"],
    queryFn: () => api.getLists(),
    enabled: Boolean(session.data),
  });
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
    enabled: Boolean(session.data),
  });
  const create = useMutation({
    mutationFn: () =>
      api.createList({
        name: name.trim(),
        description: description.trim() || null,
        visibility,
      }),
    onSuccess: async (created) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-lists"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      router.push(`/journal/listes/${created.id}`);
    },
    onError: () => setFeedback("La liste n’a pas pu être créée."),
  });

  if (session.isPending) {
    return (
      <>
        <PrivatePageHead title="Mes listes" />
        <PrivateSessionLoading />
      </>
    );
  }
  if (!session.data) {
    return (
      <>
        <PrivatePageHead title="Mes listes" />
        <PrivateSessionRequired />
      </>
    );
  }

  return (
    <>
      <PrivatePageHead title="Mes listes" />
      <PageScrollView
        contentContainerClassName="mx-auto w-full max-w-4xl gap-6 px-4 py-6 md:px-8 md:py-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row flex-wrap items-center justify-between gap-4">
          <View className="gap-2">
            <Text
              aria-level={1}
              accessibilityRole="header"
              className="font-serif text-4xl font-semibold text-ink"
            >
              Mes listes
            </Text>
            <Text className="text-base text-muted">
              Composez des sélections personnelles de spectacles.
            </Text>
          </View>
          <Button
            label={creating ? "Fermer" : "Nouvelle liste"}
            onPress={() => {
              setCreating((value) => !value);
              setFeedback(null);
            }}
            variant={creating ? "secondary" : "primary"}
          />
        </View>
        <MyShowsNavigation
          counts={{
            watchlist: dashboard.data?.counts.watchlist ?? 0,
            seen: dashboard.data?.counts.seen ?? 0,
            ratings: dashboard.data?.counts.ratings ?? 0,
            lists: dashboard.data?.counts.lists ?? 0,
            reviews: dashboard.data?.counts.reviews ?? 0,
          }}
        />
        {creating ? (
          <View className="gap-4 rounded-todam border border-line bg-paper p-5">
            <Text
              aria-level={2}
              accessibilityRole="header"
              className="font-serif text-2xl font-semibold text-ink"
            >
              Créer une liste
            </Text>
            <TextField
              autoComplete="off"
              label="Nom"
              maxLength={80}
              onChangeText={setName}
              required
              value={name}
              webName="list-name"
            />
            <TextField
              autoComplete="off"
              label="Description"
              maxLength={500}
              multiline
              onChangeText={setDescription}
              value={description}
              webName="list-description"
            />
            <AccessibleChoiceGroup
              label="Visibilité de la liste"
              onChange={setVisibility}
              options={[
                ["private", "Privée"],
                ["public", "Publique"],
              ]}
              testIdPrefix="new-list-visibility"
              value={visibility}
            />
            <Button
              disabled={!name.trim()}
              label="Créer la liste"
              loading={create.isPending}
              onPress={() => create.mutate()}
            />
            {feedback ? (
              <Text accessibilityRole="alert" className="text-sm text-danger">
                {feedback}
              </Text>
            ) : null}
          </View>
        ) : null}
        <AsyncState
          empty={!lists.isPending && !lists.isError && lists.data?.length === 0}
          emptyAction={
            <Button label="Créer ma première liste" onPress={() => setCreating(true)} />
          }
          emptyMessage="Vous n’avez encore créé aucune liste."
          error={lists.isError}
          loading={lists.isPending}
          onRetry={() => void lists.refetch()}
        >
          <View className="gap-3">
            {lists.data?.map((list) => (
              <Link href={`/journal/listes/${list.id}`} asChild key={list.id}>
                <Pressable
                  accessibilityRole="link"
                  className="min-h-24 flex-row items-center justify-between gap-4 rounded-todam border border-line bg-paper p-5 active:opacity-70"
                >
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="font-serif text-xl font-semibold text-ink">
                      {list.name}
                    </Text>
                    {list.description ? (
                      <Text className="text-sm text-muted" numberOfLines={2}>
                        {list.description}
                      </Text>
                    ) : null}
                    <Text className="text-sm text-muted">
                      {list.itemCount} spectacle{list.itemCount > 1 ? "s" : ""}
                      {" · "}
                      {list.visibility === "public" ? "Publique" : "Privée"}
                    </Text>
                  </View>
                  <Ionicons color="#6F6B64" name="chevron-forward" size={22} />
                </Pressable>
              </Link>
            ))}
          </View>
        </AsyncState>
      </PageScrollView>
    </>
  );
}
