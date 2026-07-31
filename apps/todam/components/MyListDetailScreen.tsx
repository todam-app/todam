import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProductionCard } from "@todam/contracts";
import { Button, TextField, tokens } from "@todam/design-system";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { formatPerformance } from "../lib/format";
import { AsyncState } from "./AsyncState";
import { PageScrollView } from "./PageScrollView";
import { PrivatePageHead } from "./PrivatePageHead";
import { PrivateSessionLoading, PrivateSessionRequired } from "./PrivateSessionState";
import { ProductionPoster } from "./ProductionPoster";

const disciplineLabels: Record<ProductionCard["discipline"], string> = {
  theatre: "Théâtre",
  opera: "Opéra",
  ballet: "Ballet",
};
const disciplineClasses: Record<ProductionCard["discipline"], string> = {
  theatre: "text-coral-text",
  opera: "text-lilac-text",
  ballet: "text-aqua-text",
};

function ListItemAction({
  accessibilityLabel,
  disabled = false,
  divided = false,
  icon,
  loading = false,
  onPress,
  remove = false,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  divided?: boolean;
  icon: "chevron-up" | "chevron-down" | "remove-circle-outline";
  loading?: boolean;
  onPress: () => void;
  remove?: boolean;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: inactive }}
      className={`todam-icon-button todam-list-item-action h-11 w-11 items-center justify-center bg-transparent ${
        divided ? "border-l border-line" : ""
      } ${remove ? "todam-list-item-action--remove" : ""}`}
      disabled={inactive}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={tokens.color.muted} size="small" />
      ) : (
        <Ionicons
          color={inactive ? tokens.color.disabled : tokens.color.muted}
          name={icon}
          size={20}
        />
      )}
    </Pressable>
  );
}

function ManagedProductionListItem({
  index,
  itemCount,
  onMove,
  onRemove,
  production,
  removing,
  reordering,
}: {
  index: number;
  itemCount: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  production: ProductionCard;
  removing: boolean;
  reordering: boolean;
}) {
  return (
    <View className="todam-managed-list-item relative min-h-48 flex-row overflow-hidden rounded-panel border border-line bg-paper md:min-h-[250px]">
      <Link href={`/production/${production.slug}`} asChild>
        <Pressable
          accessibilityHint="Ouvre la fiche du spectacle"
          accessibilityLabel={production.title}
          accessibilityRole="link"
          className="todam-managed-list-item__link min-w-0 flex-1 flex-row"
        >
          <View className="w-32 shrink-0 self-stretch overflow-hidden bg-placeholder sm:w-36 md:w-44">
            <ProductionPoster
              bleed
              discipline={production.discipline}
              fill
              poster={production.poster}
              title={production.title}
            />
          </View>
          <View className="min-w-0 flex-1 justify-center gap-1 p-4 pb-16 md:p-6 md:pb-20">
            <Text
              className={`text-xs font-bold uppercase tracking-wide ${disciplineClasses[production.discipline]}`}
            >
              {disciplineLabels[production.discipline]}
              {production.minimumAge !== null
                ? ` · Dès ${production.minimumAge} ans`
                : ""}
            </Text>
            <Text
              aria-level={3}
              accessibilityRole="header"
              className="font-serif text-2xl font-semibold leading-7 text-ink md:text-3xl md:leading-9"
              numberOfLines={2}
            >
              {production.title}
            </Text>
            {production.company ? (
              <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
                {production.company.name}
              </Text>
            ) : production.primaryCredit ? (
              <Text className="text-sm text-muted" numberOfLines={1}>
                {production.primaryCredit}
              </Text>
            ) : null}
            {production.nextPerformance && production.nextVenue ? (
              <Text className="text-sm leading-5 text-muted" numberOfLines={2}>
                {formatPerformance(
                  production.nextPerformance,
                  production.nextVenue.timezone,
                )}
                {" · "}
                {production.nextVenue.name}, {production.nextVenue.locality}
              </Text>
            ) : production.venueNames.length > 0 ? (
              <Text className="text-sm text-muted" numberOfLines={2}>
                {production.venueNames.join(" · ")}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Link>

      <View
        accessibilityLabel={`Actions pour ${production.title}`}
        className="todam-list-item-actions absolute bottom-3 right-3 z-10 flex-row overflow-hidden rounded-full border border-line bg-paper"
      >
        <ListItemAction
          accessibilityLabel={`Monter ${production.title}`}
          disabled={index === 0 || reordering}
          icon="chevron-up"
          onPress={() => onMove(-1)}
        />
        <ListItemAction
          accessibilityLabel={`Descendre ${production.title}`}
          disabled={index === itemCount - 1 || reordering}
          divided
          icon="chevron-down"
          onPress={() => onMove(1)}
        />
        <ListItemAction
          accessibilityLabel={`Retirer ${production.title} de la liste`}
          divided
          icon="remove-circle-outline"
          loading={removing}
          onPress={onRemove}
          remove
        />
      </View>
    </View>
  );
}

export function MyListDetailScreen({ listId }: { listId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const [editing, setEditing] = useState(false);
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
      setName(null);
      setDescription(null);
      setEditing(false);
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
        contentContainerClassName="flex-grow"
        keyboardShouldPersistTaps="handled"
      >
        <View className="todam-page-before-footer mx-auto w-full max-w-4xl flex-1 gap-6 px-4 py-6 md:px-8 md:py-10">
          <AsyncState
            empty={false}
            emptyMessage=""
            error={detail.isError}
            loading={detail.isPending}
            onRetry={() => void detail.refetch()}
          >
            {detail.data ? (
              <>
                <View className="flex-row items-start justify-between gap-4">
                  <View className="min-w-0 flex-1 gap-2">
                    <Text
                      aria-level={1}
                      accessibilityRole="header"
                      className="font-serif text-4xl font-semibold text-ink"
                    >
                      {detail.data.name}
                    </Text>
                    {detail.data.description ? (
                      <Text className="text-base leading-6 text-ink">
                        {detail.data.description}
                      </Text>
                    ) : null}
                    <Text className="text-base text-muted">
                      {detail.data.itemCount} spectacle
                      {detail.data.itemCount > 1 ? "s" : ""}
                    </Text>
                  </View>
                  {!editing ? (
                    <Pressable
                      accessibilityLabel="Modifier le titre et la description"
                      accessibilityRole="button"
                      className="todam-icon-button h-11 w-11 shrink-0 items-center justify-center rounded-todam border border-control bg-paper"
                      onPress={() => {
                        setEditing(true);
                        setFeedback(null);
                      }}
                    >
                      <Ionicons
                        color={tokens.color.ink}
                        name="pencil-outline"
                        size={21}
                      />
                    </Pressable>
                  ) : null}
                </View>
                {editing ? (
                  <View className="todam-form-panel gap-4 p-5">
                    <Text
                      aria-level={2}
                      accessibilityRole="header"
                      className="font-serif text-2xl font-semibold text-ink"
                    >
                      Modifier la liste
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
                    <View className="flex-row flex-wrap gap-3">
                      <Button
                        disabled={!name.trim()}
                        label="Enregistrer"
                        loading={update.isPending}
                        onPress={() => update.mutate()}
                      />
                      <Button
                        disabled={update.isPending}
                        label="Annuler"
                        onPress={() => {
                          setName(null);
                          setDescription(null);
                          setEditing(false);
                        }}
                        variant="quiet"
                      />
                    </View>
                  </View>
                ) : null}
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
                      <ManagedProductionListItem
                        index={index}
                        itemCount={detail.data.items.length}
                        key={item.production.id}
                        onMove={(direction) => move(index, direction)}
                        onRemove={() => removeItem.mutate(item.production.id)}
                        production={item.production}
                        removing={
                          removeItem.isPending &&
                          removeItem.variables === item.production.id
                        }
                        reordering={reorder.isPending}
                      />
                    ))
                  )}
                </View>
                <View className="gap-3 border-t border-danger/30 pt-6">
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
        </View>
      </PageScrollView>
    </>
  );
}
