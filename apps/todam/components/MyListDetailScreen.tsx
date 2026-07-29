import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, TextField, tokens } from "@todam/design-system";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { AsyncState } from "./AsyncState";
import { PageScrollView } from "./PageScrollView";
import { PrivatePageHead } from "./PrivatePageHead";
import { PrivateSessionLoading, PrivateSessionRequired } from "./PrivateSessionState";
import { ProductionListItem } from "./ProductionListItem";

export function MyListDetailScreen({ listId }: { listId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const [nameDraft, setName] = useState<string | null>(null);
  const [descriptionDraft, setDescription] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ["my-list", listId],
    queryFn: () => api.getList(listId),
    enabled: Boolean(session.data && listId),
  });
  const name = nameDraft ?? detail.data?.name ?? "";
  const description = descriptionDraft ?? detail.data?.description ?? "";

  const update = useMutation({
    mutationFn: () =>
      api.updateList(listId, {
        name: name.trim(),
        description: description.trim() || null,
        visibility: "private",
      }),
    onSuccess: async () => {
      setFeedback("La liste a été mise à jour.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-list", listId] }),
        queryClient.invalidateQueries({ queryKey: ["my-lists"] }),
      ]);
    },
    onError: () => setFeedback("La liste n’a pas pu être mise à jour."),
  });
  const removeItem = useMutation({
    mutationFn: (productionId: string) => api.removeListItem(listId, productionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-list", listId] }),
        queryClient.invalidateQueries({ queryKey: ["my-lists"] }),
      ]);
    },
    onError: () => setFeedback("Le spectacle n’a pas pu être retiré."),
  });
  const reorder = useMutation({
    mutationFn: (productionIds: string[]) => api.reorderList(listId, { productionIds }),
    onSuccess: async () => {
      setFeedback("L’ordre a été enregistré.");
      await queryClient.invalidateQueries({ queryKey: ["my-list", listId] });
    },
    onError: () => setFeedback("L’ordre n’a pas pu être enregistré."),
  });
  const removeList = useMutation({
    mutationFn: () => api.deleteList(listId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-lists"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      router.replace("/journal/listes");
    },
    onError: () => setFeedback("La liste n’a pas pu être supprimée."),
  });

  function move(index: number, direction: -1 | 1) {
    if (!detail.data) return;
    const target = index + direction;
    if (target < 0 || target >= detail.data.items.length) return;
    const productionIds = detail.data.items.map((item) => item.production.id);
    [productionIds[index], productionIds[target]] = [
      productionIds[target]!,
      productionIds[index]!,
    ];
    reorder.mutate(productionIds);
  }

  if (session.isPending) {
    return (
      <>
        <PrivatePageHead title="Ma liste" />
        <PrivateSessionLoading />
      </>
    );
  }
  if (!session.data) {
    return (
      <>
        <PrivatePageHead title="Ma liste" />
        <PrivateSessionRequired />
      </>
    );
  }

  return (
    <>
      <PrivatePageHead title={detail.data?.name ?? "Ma liste"} />
      <PageScrollView
        contentContainerClassName="mx-auto w-full max-w-4xl gap-6 px-4 py-6 md:px-8 md:py-10"
        keyboardShouldPersistTaps="handled"
      >
        <AsyncState
          empty={false}
          emptyMessage=""
          error={detail.isError}
          loading={detail.isPending}
          onRetry={() => void detail.refetch()}
        >
          {detail.data ? (
            <>
              <View className="gap-2">
                <Text
                  aria-level={1}
                  accessibilityRole="header"
                  className="font-serif text-4xl font-semibold text-ink"
                >
                  {detail.data.name}
                </Text>
                <Text className="text-base text-muted">
                  {detail.data.itemCount} spectacle
                  {detail.data.itemCount > 1 ? "s" : ""}
                </Text>
              </View>
              <View className="todam-form-panel gap-4 p-5">
                <Text
                  aria-level={2}
                  accessibilityRole="header"
                  className="font-serif text-2xl font-semibold text-ink"
                >
                  Informations
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
                <Text className="text-sm leading-5 text-muted">
                  Cette liste est privée et visible uniquement par vous.
                </Text>
                <Button
                  disabled={!name.trim()}
                  label="Enregistrer"
                  loading={update.isPending}
                  onPress={() => update.mutate()}
                />
              </View>
              {feedback ? (
                <Text accessibilityLiveRegion="polite" className="text-sm text-muted">
                  {feedback}
                </Text>
              ) : null}
              <View className="gap-4">
                <Text
                  aria-level={2}
                  accessibilityRole="header"
                  className="font-serif text-2xl font-semibold text-ink"
                >
                  Spectacles
                </Text>
                {detail.data.items.length === 0 ? (
                  <Text className="todam-editorial-empty p-5 text-base text-muted">
                    Cette liste est vide. Ajoutez-y un spectacle depuis sa fiche.
                  </Text>
                ) : (
                  detail.data.items.map((item, index) => (
                    <View className="gap-2" key={item.production.id}>
                      <ProductionListItem production={item.production} />
                      <View className="flex-row flex-wrap gap-2">
                        <Button
                          accessibilityLabel={`Monter ${item.production.title}`}
                          disabled={index === 0 || reorder.isPending}
                          label="Monter"
                          onPress={() => move(index, -1)}
                          variant="ghost"
                        />
                        <Button
                          accessibilityLabel={`Descendre ${item.production.title}`}
                          disabled={
                            index === detail.data.items.length - 1 || reorder.isPending
                          }
                          label="Descendre"
                          onPress={() => move(index, 1)}
                          variant="ghost"
                        />
                        <Button
                          label="Retirer de la liste"
                          loading={removeItem.isPending}
                          onPress={() => removeItem.mutate(item.production.id)}
                          variant="dangerGhost"
                        />
                      </View>
                    </View>
                  ))
                )}
              </View>
              <View className="gap-3 border-t border-danger/30 pt-6">
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    color={tokens.color.error}
                    name="warning-outline"
                    size={22}
                  />
                  <Text className="text-base font-bold text-danger">
                    Supprimer cette liste
                  </Text>
                </View>
                {confirmingDelete ? (
                  <View className="flex-row flex-wrap gap-2">
                    <Button
                      label="Confirmer la suppression"
                      loading={removeList.isPending}
                      onPress={() => removeList.mutate()}
                      variant="danger"
                    />
                    <Button
                      label="Annuler"
                      onPress={() => setConfirmingDelete(false)}
                      variant="quiet"
                    />
                  </View>
                ) : (
                  <View className="items-start">
                    <Button
                      label="Supprimer la liste"
                      onPress={() => setConfirmingDelete(true)}
                      variant="danger"
                    />
                  </View>
                )}
              </View>
            </>
          ) : null}
        </AsyncState>
      </PageScrollView>
    </>
  );
}
