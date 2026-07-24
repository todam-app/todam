import Ionicons from "@expo/vector-icons/Ionicons";
import {
  TodamApiError,
  type DiarySession,
  type ViewerProductionState,
} from "@todam/contracts";
import { Button, tokens } from "@todam/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { api } from "../lib/api";
import { formatPerformance } from "../lib/format";

function formatCalendarDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function sessionPresentation(session: DiarySession) {
  if (session.performance) {
    return {
      title: formatPerformance(
        session.performance.startsAt,
        session.performance.venue.timezone,
      ),
      detail: `${session.performance.venue.name} · ${session.performance.venue.locality}`,
    };
  }
  if (session.attendedOn) {
    return {
      title: formatCalendarDate(session.attendedOn),
      detail: "Date déclarée",
    };
  }
  return {
    title: "Séance sans date",
    detail: `Ajoutée le ${formatCreatedAt(session.createdAt)}`,
  };
}

export interface DiaryManagerModalProps {
  onClose: () => void;
  onReturnToRating: () => void;
  onStateChange: (state: ViewerProductionState) => void;
  productionId: string;
  rating: number | null;
  visible: boolean;
}

export function DiaryManagerModal({
  onClose,
  onReturnToRating,
  onStateChange,
  productionId,
  rating,
  visible,
}: DiaryManagerModalProps) {
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const queryKey = ["production-diary", productionId] as const;
  const diary = useQuery({
    queryKey,
    queryFn: () => api.getProductionDiary(productionId),
    enabled: visible && Boolean(productionId),
  });
  const [confirmingEntryId, setConfirmingEntryId] = React.useState<string | null>(null);
  const [blockedByRating, setBlockedByRating] = React.useState(false);
  const [actionError, setActionError] = React.useState(false);

  function resetTransientState() {
    setConfirmingEntryId(null);
    setBlockedByRating(false);
    setActionError(false);
  }

  function closeModal() {
    resetTransientState();
    onClose();
  }

  function returnToRating() {
    resetTransientState();
    onReturnToRating();
  }

  function refreshSharedState(state: ViewerProductionState) {
    onStateChange(state);
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const addMutation = useMutation({
    mutationFn: () =>
      api.markSeen({
        productionId,
        performanceId: null,
        attendedOn: null,
      }),
    onMutate: () => {
      setActionError(false);
      setBlockedByRating(false);
    },
    onSuccess: (state) => {
      refreshSharedState(state);
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: () => setActionError(true),
  });

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => api.deleteDiaryEntry(entryId),
    onMutate: () => {
      setActionError(false);
      setBlockedByRating(false);
    },
    onSuccess: (state, entryId) => {
      queryClient.setQueryData<DiarySession[]>(queryKey, (current) =>
        current?.filter((entry) => entry.id !== entryId),
      );
      refreshSharedState(state);
      setConfirmingEntryId(null);
      if (!state.seen) closeModal();
    },
    onError: (error) => {
      setConfirmingEntryId(null);
      if (
        error instanceof TodamApiError &&
        error.problem.code === "RATING_REQUIRES_DIARY_ENTRY"
      ) {
        setBlockedByRating(true);
      } else {
        setActionError(true);
      }
    },
  });

  function requestRemoval(entryId: string) {
    if (diary.data?.length === 1 && rating !== null) {
      setConfirmingEntryId(null);
      setBlockedByRating(true);
      return;
    }
    setBlockedByRating(false);
    setConfirmingEntryId(entryId);
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={closeModal}
      transparent
      visible={visible}
    >
      <View
        accessibilityViewIsModal
        style={[styles.overlay, width >= 768 && styles.overlayWide]}
      >
        <Pressable
          accessibilityLabel="Fermer la gestion des séances"
          onPress={closeModal}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.panel, width >= 768 && styles.panelWide]}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" style={styles.title}>
                Mes séances
              </Text>
              <Text style={styles.intro}>
                Ajoutez un nouveau souvenir ou retirez une séance précise.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Fermer"
              accessibilityRole="button"
              hitSlop={10}
              onPress={closeModal}
              style={({ pressed }) => [styles.close, pressed && styles.controlPressed]}
            >
              <Ionicons color={tokens.color.ink} name="close" size={24} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Button
              label="Ajouter une séance"
              loading={addMutation.isPending}
              onPress={() => addMutation.mutate()}
              variant="secondary"
            />

            {blockedByRating ? (
              <View accessibilityRole="alert" style={styles.blocker}>
                <Text style={styles.blockerTitle}>Supprimez d’abord votre note</Text>
                <Text style={styles.blockerText}>
                  Une note doit rester associée à au moins une séance dans votre
                  journal.
                </Text>
                <View style={styles.blockerAction}>
                  <Button
                    label="Revenir à ma note"
                    onPress={returnToRating}
                    variant="ghost"
                  />
                </View>
              </View>
            ) : null}

            {actionError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                L’action n’a pas été enregistrée. Réessaie.
              </Text>
            ) : null}

            {diary.isPending ? (
              <ActivityIndicator
                accessibilityLabel="Chargement des séances"
                color={tokens.color.accent}
                size="large"
              />
            ) : diary.isError ? (
              <View style={styles.feedback}>
                <Text accessibilityRole="alert" style={styles.error}>
                  Les séances n’ont pas pu être chargées.
                </Text>
                <Button
                  label="Réessayer"
                  onPress={() => void diary.refetch()}
                  variant="secondary"
                />
              </View>
            ) : diary.data?.length ? (
              <View style={styles.sessions}>
                {diary.data.map((session) => {
                  const presentation = sessionPresentation(session);
                  const confirming = confirmingEntryId === session.id;
                  const deleting =
                    deleteMutation.isPending && deleteMutation.variables === session.id;
                  return (
                    <View key={session.id} style={styles.session}>
                      <View style={styles.sessionRow}>
                        <View style={styles.sessionCopy}>
                          <Text style={styles.sessionTitle}>{presentation.title}</Text>
                          <Text style={styles.sessionDetail}>
                            {presentation.detail}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityLabel={`Retirer la séance : ${presentation.title}`}
                          accessibilityRole="button"
                          disabled={deleteMutation.isPending}
                          onPress={() => requestRemoval(session.id)}
                          style={({ pressed }) => [
                            styles.remove,
                            pressed && styles.controlPressed,
                            deleteMutation.isPending && styles.controlDisabled,
                          ]}
                        >
                          <Ionicons
                            color={tokens.color.error}
                            name="trash-outline"
                            size={19}
                          />
                          <Text style={styles.removeText}>Retirer</Text>
                        </Pressable>
                      </View>
                      {confirming ? (
                        <View style={styles.confirmation}>
                          <Text style={styles.confirmationText}>
                            Retirer cette séance du journal ?
                          </Text>
                          <View style={styles.confirmationActions}>
                            <Pressable
                              accessibilityRole="button"
                              disabled={deleting}
                              onPress={() => setConfirmingEntryId(null)}
                              style={({ pressed }) => [
                                styles.textAction,
                                pressed && styles.controlPressed,
                              ]}
                            >
                              <Text style={styles.cancelText}>Annuler</Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              disabled={deleting}
                              onPress={() => deleteMutation.mutate(session.id)}
                              style={({ pressed }) => [
                                styles.dangerAction,
                                pressed && styles.controlPressed,
                              ]}
                            >
                              {deleting ? (
                                <ActivityIndicator
                                  accessibilityLabel="Suppression"
                                  color={tokens.color.surface}
                                />
                              ) : (
                                <Text style={styles.dangerText}>Retirer</Text>
                              )}
                            </Pressable>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.empty}>Aucune séance enregistrée.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blocker: {
    backgroundColor: "#FCE9E5",
    borderColor: "#E8B6AD",
    borderRadius: tokens.radius.medium,
    borderWidth: 1,
    gap: tokens.space.sm,
    padding: tokens.space.md,
  },
  blockerAction: {
    alignSelf: "flex-start",
  },
  blockerText: {
    color: tokens.color.ink,
    lineHeight: 20,
  },
  blockerTitle: {
    color: tokens.color.error,
    fontSize: 16,
    fontWeight: "800",
  },
  cancelText: {
    color: tokens.color.ink,
    fontWeight: "700",
  },
  close: {
    alignItems: "center",
    borderRadius: tokens.radius.round,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  confirmation: {
    backgroundColor: tokens.color.background,
    borderRadius: tokens.radius.small,
    gap: 12,
    padding: 12,
  },
  confirmationActions: {
    flexDirection: "row",
    gap: tokens.space.sm,
    justifyContent: "flex-end",
  },
  confirmationText: {
    color: tokens.color.ink,
    fontWeight: "700",
  },
  content: {
    gap: tokens.space.md,
    padding: tokens.space.md,
    paddingBottom: tokens.space.lg,
  },
  controlDisabled: {
    opacity: 0.45,
  },
  controlPressed: {
    opacity: 0.65,
  },
  dangerAction: {
    alignItems: "center",
    backgroundColor: tokens.color.error,
    borderRadius: tokens.radius.small,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: 14,
  },
  dangerText: {
    color: tokens.color.surface,
    fontWeight: "800",
  },
  empty: {
    color: tokens.color.muted,
    paddingVertical: tokens.space.md,
    textAlign: "center",
  },
  error: {
    color: tokens.color.error,
    fontWeight: "600",
  },
  feedback: {
    gap: tokens.space.md,
  },
  header: {
    alignItems: "flex-start",
    borderBottomColor: tokens.color.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: tokens.space.md,
    justifyContent: "space-between",
    padding: tokens.space.md,
  },
  headerCopy: {
    flex: 1,
    gap: tokens.space.xs,
  },
  intro: {
    color: tokens.color.muted,
    lineHeight: 20,
  },
  overlay: {
    backgroundColor: "rgba(21, 21, 21, 0.56)",
    flex: 1,
    justifyContent: "flex-end",
  },
  overlayWide: {
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.space.lg,
  },
  panel: {
    backgroundColor: tokens.color.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "88%",
    overflow: "hidden",
    width: "100%",
  },
  panelWide: {
    borderRadius: 20,
    maxWidth: 560,
  },
  remove: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 6,
  },
  removeText: {
    color: tokens.color.error,
    fontSize: 13,
    fontWeight: "700",
  },
  session: {
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.medium,
    borderWidth: 1,
    gap: tokens.space.sm,
    padding: 12,
  },
  sessionCopy: {
    flex: 1,
    gap: tokens.space.xs,
  },
  sessionDetail: {
    color: tokens.color.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  sessionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.space.sm,
  },
  sessionTitle: {
    color: tokens.color.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  sessions: {
    gap: tokens.space.sm,
  },
  textAction: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  title: {
    color: tokens.color.ink,
    fontFamily: "serif",
    fontSize: 26,
    fontWeight: "800",
  },
});
