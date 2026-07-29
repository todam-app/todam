import { useQuery } from "@tanstack/react-query";
import { TodamApiError } from "@todam/contracts";
import { Button, PasswordField, SectionTitle, TextField } from "@todam/design-system";
import * as Linking from "expo-linking";
import { useState } from "react";
import { Platform, Share, Text, View } from "react-native";

import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { AccessibleChoiceGroup } from "./AccessibleChoiceGroup";
import { AsyncState } from "./AsyncState";
import { HomeCitySelector } from "./HomeCitySelector";

type AccountSettingsContentProps = {
  onRatingVisibilityChange: (visibility: "review_only" | "public") => void;
  onVisibilityChange: (visibility: "public" | "private") => void;
  profileVisibility: "public" | "private";
  ratingVisibility: "review_only" | "public";
};

function problemMessage(error: unknown, fallback: string): string {
  if (!(error instanceof TodamApiError)) return fallback;
  switch (error.problem.code) {
    case "EMAIL_ALREADY_REGISTERED":
      return "Un compte existe déjà avec cette adresse e-mail.";
    case "EMAIL_UNCHANGED":
      return "Cette adresse e-mail est déjà associée à ton compte.";
    case "INVALID_CURRENT_PASSWORD":
      return "Le mot de passe actuel est incorrect.";
    case "PASSWORD_UNCHANGED":
      return "Le nouveau mot de passe doit être différent du mot de passe actuel.";
    default:
      return fallback;
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.trim());
}

export function AccountSettingsContent({
  onRatingVisibilityChange,
  onVisibilityChange,
  profileVisibility,
  ratingVisibility,
}: AccountSettingsContentProps) {
  const session = authClient.useSession();
  const home = useQuery({
    queryKey: ["home"],
    queryFn: () => api.getHome(),
    enabled: Boolean(session.data),
  });
  const sessionData = session.data as unknown as {
    user: {
      email?: string;
    };
  } | null;
  const sessionUser = sessionData?.user;

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailPending, setEmailPending] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [exportPending, setExportPending] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const [deleteExpanded, setDeleteExpanded] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function submitEmailChange() {
    setEmailPending(true);
    setEmailError(null);
    setEmailMessage(null);
    try {
      const callbackURL = Linking.createURL("/email-verifie", {
        queryParams: { mode: "change-email" },
      });
      await api.requestEmailChange({
        currentPassword: emailPassword,
        newEmail: newEmail.trim(),
        callbackURL,
      });
      setEmailPassword("");
      setEmailMessage(
        "Un lien a été envoyé à la nouvelle adresse. Ton adresse actuelle reste active jusqu’à sa confirmation.",
      );
    } catch (error) {
      setEmailError(
        problemMessage(error, "La modification de l’adresse e-mail a échoué."),
      );
    } finally {
      setEmailPending(false);
    }
  }

  async function submitPassword() {
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword !== passwordConfirmation) {
      setPasswordError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    setPasswordPending(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordConfirmation("");
      await session.refetch();
      setPasswordMessage(
        "Ton mot de passe a été modifié. Tes autres sessions ont été déconnectées.",
      );
    } catch (error) {
      setPasswordError(
        problemMessage(error, "Le mot de passe n'a pas pu être modifié."),
      );
    } finally {
      setPasswordPending(false);
    }
  }

  async function exportData(format: "json" | "csv") {
    setExportPending(true);
    setExportMessage(null);
    try {
      const contents =
        format === "json"
          ? JSON.stringify(await api.exportAccountJson(), null, 2)
          : await api.exportAccountCsv();
      const mediaType =
        format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8";
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([contents], { type: mediaType }));
        const link = document.createElement("a");
        link.href = url;
        link.download = `todam-export-${new Date().toISOString().slice(0, 10)}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: contents,
          title: `Export ${format.toUpperCase()} de mes données Todam`,
        });
      }
      setExportMessage(`L'export ${format.toUpperCase()} a été préparé.`);
    } catch {
      setExportMessage("L'export n'a pas pu être créé. Réessaie plus tard.");
    } finally {
      setExportPending(false);
    }
  }

  async function submitDeleteRequest() {
    if (deletePassword.length < 8 || deletePending) return;
    setDeletePending(true);
    setDeleteError(null);
    setDeleteMessage(null);
    try {
      const result = await authClient.deleteUser({
        password: deletePassword,
        callbackURL: Linking.createURL("/suppression-compte"),
      });
      if (result.error) {
        setDeleteError("Le mot de passe est incorrect ou la demande a échoué.");
        return;
      }
      setDeletePassword("");
      setDeleteMessage(
        "Un e-mail de confirmation a été envoyé. Le compte ne sera supprimé qu’après ton clic sur ce lien.",
      );
    } catch {
      setDeleteError("La demande de suppression n’a pas pu être envoyée. Réessaie.");
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <View className="gap-6">
      <View className="gap-6 md:flex-row md:items-start">
        <View className="todam-form-panel w-full gap-4 p-5 md:flex-1 md:p-6">
          <SectionTitle>Visibilité du profil</SectionTitle>
          <Text className="text-base leading-6 text-muted">
            Un profil privé masque aussi les listes et avis réglés comme publics.
          </Text>
          <AccessibleChoiceGroup
            label="Visibilité du profil"
            onChange={onVisibilityChange}
            options={[
              ["public", "Public"],
              ["private", "Privé"],
            ]}
            testIdPrefix="profile-visibility"
            value={profileVisibility}
          />
        </View>

        <View className="todam-form-panel w-full gap-4 p-5 md:flex-1 md:p-6">
          <SectionTitle>Ville de découverte</SectionTitle>
          <Text className="text-base leading-6 text-muted">
            Choisis ou modifie la ville utilisée pour classer les spectacles proches sur
            ton accueil.
          </Text>
          <AsyncState
            empty={!home.data}
            emptyAction={
              <Button
                label="Recharger les préférences"
                onPress={() => void home.refetch()}
                variant="quiet"
              />
            }
            emptyMessage="Aucune préférence de découverte n’est disponible."
            error={home.isError}
            loading={home.isPending}
            onRetry={() => void home.refetch()}
          >
            {home.data ? <HomeCitySelector city={home.data.homeCity} /> : null}
          </AsyncState>
        </View>
      </View>

      <View className="todam-form-panel gap-4 p-5 md:p-6">
        <SectionTitle>Visibilité des notes</SectionTitle>
        <Text className="text-base leading-6 text-muted">
          Une note liée à un avis public est toujours visible. Sans avis public, elle
          reste privée par défaut, mais compte anonymement dans la moyenne du spectacle.
        </Text>
        <AccessibleChoiceGroup
          label="Visibilité des notes sans avis public"
          onChange={onRatingVisibilityChange}
          options={[
            ["review_only", "Privées sans avis"],
            ["public", "Toutes publiques"],
          ]}
          testIdPrefix="rating-visibility"
          value={ratingVisibility}
        />
      </View>

      <View className="gap-6 md:flex-row md:items-start">
        <View className="todam-form-panel w-full gap-4 p-5 md:flex-1 md:p-6">
          <SectionTitle>Adresse e-mail</SectionTitle>
          <Text className="text-base leading-6 text-muted">
            Adresse actuelle : {sessionUser?.email}
          </Text>
          <TextField
            autoCapitalize="none"
            autoComplete="username"
            inputMode="email"
            keyboardType="email-address"
            label="Nouvelle adresse e-mail"
            onChangeText={setNewEmail}
            required
            value={newEmail}
            webName="new-email"
          />
          <PasswordField
            autoComplete="current-password"
            label="Mot de passe actuel"
            onChangeText={setEmailPassword}
            required
            value={emailPassword}
            webName="email-current-password"
          />
          {newEmail.length > 0 && !isValidEmail(newEmail) ? (
            <Text accessibilityRole="alert" className="text-base text-error">
              Saisis une adresse e-mail complète, par exemple nom@domaine.fr.
            </Text>
          ) : null}
          {emailError ? (
            <Text accessibilityRole="alert" className="text-base text-error">
              {emailError}
            </Text>
          ) : null}
          {emailMessage ? (
            <Text
              accessibilityLiveRegion="polite"
              className="text-base leading-6 text-success"
            >
              {emailMessage}
            </Text>
          ) : null}
          <View className="w-full md:items-end">
            <View className="w-full md:w-auto md:min-w-[240px]">
              <Button
                disabled={!isValidEmail(newEmail) || emailPassword.length < 8}
                label="Confirmer la nouvelle adresse"
                loading={emailPending}
                onPress={() => void submitEmailChange()}
              />
            </View>
          </View>
        </View>

        <View className="todam-form-panel w-full gap-4 p-5 md:flex-1 md:p-6">
          <SectionTitle>Mot de passe</SectionTitle>
          <PasswordField
            autoComplete="current-password"
            label="Mot de passe actuel"
            onChangeText={setCurrentPassword}
            required
            value={currentPassword}
            webName="current-password"
          />
          <PasswordField
            autoComplete="new-password"
            label="Nouveau mot de passe"
            onChangeText={setNewPassword}
            required
            value={newPassword}
            webName="new-password"
          />
          <PasswordField
            autoComplete="new-password"
            label="Confirmer le nouveau mot de passe"
            onChangeText={setPasswordConfirmation}
            required
            value={passwordConfirmation}
            webName="new-password-confirmation"
          />
          {newPassword.length > 0 && newPassword.length < 8 ? (
            <Text accessibilityRole="alert" className="text-base text-error">
              Le nouveau mot de passe doit contenir au moins 8 caractères.
            </Text>
          ) : null}
          {passwordConfirmation.length > 0 && newPassword !== passwordConfirmation ? (
            <Text accessibilityRole="alert" className="text-base text-error">
              La confirmation ne correspond pas au nouveau mot de passe.
            </Text>
          ) : null}
          {passwordError ? (
            <Text accessibilityRole="alert" className="text-base text-error">
              {passwordError}
            </Text>
          ) : null}
          {passwordMessage ? (
            <Text
              accessibilityLiveRegion="polite"
              className="text-base leading-6 text-success"
            >
              {passwordMessage}
            </Text>
          ) : null}
          <View className="w-full md:items-end">
            <View className="w-full md:w-auto md:min-w-[240px]">
              <Button
                disabled={
                  currentPassword.length < 8 ||
                  newPassword.length < 8 ||
                  passwordConfirmation.length < 8 ||
                  newPassword !== passwordConfirmation
                }
                label="Modifier le mot de passe"
                loading={passwordPending}
                onPress={() => void submitPassword()}
              />
            </View>
          </View>
        </View>
      </View>

      <View className="todam-form-panel gap-4 p-5 md:p-6" testID="account-data-card">
        <SectionTitle>Mes données</SectionTitle>
        <Text className="text-base leading-6 text-muted">
          Télécharge une copie de tes données Todam au format JSON ou CSV.
        </Text>
        <View className="flex-row flex-wrap gap-3 md:self-start">
          <Button
            label="Exporter en JSON"
            loading={exportPending}
            onPress={() => void exportData("json")}
            variant="quiet"
          />
          <Button
            disabled={exportPending}
            label="Exporter en CSV"
            onPress={() => void exportData("csv")}
            variant="quiet"
          />
        </View>
        {exportMessage ? (
          <Text
            accessibilityLiveRegion="polite"
            className="text-sm leading-5 text-muted"
          >
            {exportMessage}
          </Text>
        ) : null}
      </View>

      <View
        className="gap-4 rounded-panel border border-danger bg-error-soft p-5 md:p-6"
        testID="account-danger-zone"
      >
        <Text className="text-xs font-bold uppercase tracking-[1.5px] text-danger">
          Zone sensible
        </Text>
        <Text className="text-lg font-bold text-ink">Supprimer mon compte</Text>
        <Text className="text-base leading-6 text-muted">
          Exporte d’abord tes données si tu souhaites les conserver. La suppression
          effacera ton journal, tes notes, tes avis, tes listes personnalisées et ta
          liste « À voir », puis révoquera tes sessions. Les contributions
          professionnelles déjà publiées resteront dans l’historique sans être
          rattachées à ton identité. La suppression devra être confirmée depuis l’e-mail
          envoyé par Todam.
        </Text>
        {deleteExpanded ? (
          <View className="gap-4">
            <PasswordField
              autoComplete="current-password"
              error={deleteError ?? undefined}
              label="Mot de passe actuel"
              onChangeText={setDeletePassword}
              onSubmitEditing={() => void submitDeleteRequest()}
              required
              returnKeyType="go"
              value={deletePassword}
              webName="delete-current-password"
            />
            <View className="flex-row flex-wrap gap-3">
              <Button
                disabled={deletePassword.length < 8}
                label="Envoyer l’e-mail de confirmation"
                loading={deletePending}
                onPress={() => void submitDeleteRequest()}
                variant="danger"
              />
              <Button
                label="Annuler"
                onPress={() => {
                  setDeleteExpanded(false);
                  setDeletePassword("");
                  setDeleteError(null);
                }}
                variant="quiet"
              />
            </View>
          </View>
        ) : (
          <View className="w-full md:self-start md:w-auto">
            <Button
              label="Supprimer mon compte"
              onPress={() => {
                setDeleteExpanded(true);
                setDeleteMessage(null);
              }}
              variant="danger"
            />
          </View>
        )}
        {deleteMessage ? (
          <Text
            accessibilityLiveRegion="polite"
            className="text-base leading-6 text-ink"
          >
            {deleteMessage}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
