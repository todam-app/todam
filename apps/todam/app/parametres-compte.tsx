import { useQueryClient } from "@tanstack/react-query";
import { TodamApiError } from "@todam/contracts";
import { Button, SectionTitle, TextField, tokens } from "@todam/design-system";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useState } from "react";
import { Platform, Share, Text, View } from "react-native";

import { AsyncState } from "../components/AsyncState";
import { LegalFooter } from "../components/LegalFooter";
import { PageScrollView } from "../components/PageScrollView";
import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";

function problemMessage(error: unknown, fallback: string): string {
  if (!(error instanceof TodamApiError)) return fallback;
  switch (error.problem.code) {
    case "EMAIL_ALREADY_REGISTERED":
      return "Un compte existe déjà avec cette adresse e-mail.";
    case "EMAIL_UNCHANGED":
      return "Cette adresse e-mail est déjà associée à ton compte.";
    case "USERNAME_ALREADY_TAKEN":
      return "Ce nom d'utilisateur est déjà utilisé.";
    case "INVALID_CURRENT_PASSWORD":
      return "Le mot de passe actuel est incorrect.";
    case "PASSWORD_UNCHANGED":
      return "Le nouveau mot de passe doit être différent du mot de passe actuel.";
    default:
      return fallback;
  }
}

export default function AccountSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const sessionData = session.data as unknown as {
    user: {
      email?: string;
      displayUsername?: string | null;
      name?: string;
      username?: string | null;
    };
  } | null;
  const sessionUser = sessionData?.user as
    | {
        email?: string;
        displayUsername?: string | null;
        name?: string;
        username?: string | null;
      }
    | undefined;
  const currentUsername =
    sessionUser?.username ?? sessionUser?.displayUsername ?? sessionUser?.name ?? "";

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailPending, setEmailPending] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [username, setUsername] = useState<string | null>(null);
  const [usernamePending, setUsernamePending] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [exportPending, setExportPending] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const usernameValue = username ?? currentUsername;

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

  async function submitUsername() {
    setUsernamePending(true);
    setUsernameError(null);
    setUsernameMessage(null);
    try {
      const updatedUsername = await api.updateUsername(usernameValue);
      setUsername(updatedUsername);
      await session.refetch();
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setUsernameMessage("Ton nom d'utilisateur a été modifié.");
    } catch (error) {
      setUsernameError(
        problemMessage(error, "Le nom d'utilisateur n'a pas pu être modifié."),
      );
    } finally {
      setUsernamePending(false);
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

  async function exportData() {
    setExportPending(true);
    setExportMessage(null);
    try {
      const exported = await api.exportAccountJson();
      const contents = JSON.stringify(exported, null, 2);
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(
          new Blob([contents], { type: "application/json;charset=utf-8" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = `todam-export-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: contents,
          title: "Export de mes données Todam",
        });
      }
      setExportMessage("L'export a été préparé.");
    } catch {
      setExportMessage("L'export n'a pas pu être créé. Réessaie plus tard.");
    } finally {
      setExportPending(false);
    }
  }

  if (session.isPending) {
    return (
      <AsyncState empty={false} emptyMessage="" error={false} loading>
        {null}
      </AsyncState>
    );
  }

  if (!session.data) {
    return (
      <View className="mx-auto w-full max-w-lg flex-1 items-center justify-center gap-5 px-5 py-12">
        <Text
          accessibilityRole="header"
          className="text-center font-serif text-4xl font-black text-ink"
        >
          Connecte-toi pour gérer ton compte
        </Text>
        <Button
          label="Se connecter"
          onPress={() =>
            router.replace({
              pathname: "/sign-in",
              params: { returnTo: "/parametres-compte" },
            })
          }
        />
      </View>
    );
  }

  return (
    <PageScrollView
      contentContainerClassName="flex-grow"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View
        className={`${Platform.OS === "web" ? "todam-page-before-footer " : ""}mx-auto w-full max-w-3xl flex-1 gap-8 px-5 py-8 md:px-8 md:py-12`}
      >
        <View className="gap-2">
          <Text className="text-xs font-extrabold uppercase tracking-[1.5px] text-accent">
            Mon compte
          </Text>
          <Text
            accessibilityRole="header"
            className="font-serif text-4xl font-black text-ink"
          >
            Paramètres du compte
          </Text>
          <Text className="leading-6 text-muted">
            Gère tes identifiants, ton mot de passe et tes données Todam.
          </Text>
        </View>

        <View className="gap-4 rounded-todam border border-line bg-paper p-5 md:p-6">
          <SectionTitle>Adresse e-mail</SectionTitle>
          <Text className="leading-6 text-muted">
            Adresse actuelle : {sessionUser?.email}
          </Text>
          <TextField
            autoCapitalize="none"
            autoComplete="username"
            inputMode="email"
            keyboardType="email-address"
            label="Nouvelle adresse e-mail"
            onChangeText={setNewEmail}
            value={newEmail}
          />
          <TextField
            autoComplete="current-password"
            label="Mot de passe actuel"
            onChangeText={setEmailPassword}
            secureTextEntry
            value={emailPassword}
          />
          {emailError ? (
            <Text accessibilityRole="alert" className="text-[#A1261A]">
              {emailError}
            </Text>
          ) : null}
          {emailMessage ? (
            <Text className="leading-6 text-ink">{emailMessage}</Text>
          ) : null}
          <View className="w-full md:items-end">
            <View className="w-full md:w-auto md:min-w-[240px]">
              <Button
                disabled={!newEmail.includes("@") || emailPassword.length < 8}
                label="Confirmer la nouvelle adresse"
                loading={emailPending}
                onPress={() => void submitEmailChange()}
              />
            </View>
          </View>
        </View>

        <View className="gap-4 rounded-todam border border-line bg-paper p-5 md:p-6">
          <SectionTitle>Nom d{"'"}utilisateur</SectionTitle>
          <Text className="leading-6 text-muted">
            Entre 3 et 30 caractères. Actuellement : {currentUsername}
          </Text>
          <TextField
            autoCapitalize="none"
            autoComplete="off"
            inputMode="text"
            label="Nom d'utilisateur Todam"
            maxLength={30}
            onChangeText={setUsername}
            value={usernameValue}
          />
          {usernameError ? (
            <Text accessibilityRole="alert" className="text-[#A1261A]">
              {usernameError}
            </Text>
          ) : null}
          {usernameMessage ? (
            <Text className="leading-6 text-ink">{usernameMessage}</Text>
          ) : null}
          <View className="w-full md:items-end">
            <View className="w-full md:w-auto md:min-w-[240px]">
              <Button
                disabled={
                  usernameValue.trim().length < 3 ||
                  usernameValue.trim() === currentUsername
                }
                label="Modifier le nom d'utilisateur"
                loading={usernamePending}
                onPress={() => void submitUsername()}
              />
            </View>
          </View>
        </View>

        <View className="gap-4 rounded-todam border border-line bg-paper p-5 md:p-6">
          <SectionTitle>Mot de passe</SectionTitle>
          <TextField
            autoComplete="current-password"
            label="Mot de passe actuel"
            onChangeText={setCurrentPassword}
            secureTextEntry
            value={currentPassword}
          />
          <TextField
            autoComplete="new-password"
            label="Nouveau mot de passe"
            onChangeText={setNewPassword}
            secureTextEntry
            value={newPassword}
          />
          <TextField
            autoComplete="new-password"
            label="Confirmer le nouveau mot de passe"
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            value={passwordConfirmation}
          />
          {passwordError ? (
            <Text accessibilityRole="alert" className="text-[#A1261A]">
              {passwordError}
            </Text>
          ) : null}
          {passwordMessage ? (
            <Text className="leading-6 text-ink">{passwordMessage}</Text>
          ) : null}
          <View className="w-full md:items-end">
            <View className="w-full md:w-auto md:min-w-[240px]">
              <Button
                disabled={
                  currentPassword.length < 8 ||
                  newPassword.length < 8 ||
                  passwordConfirmation.length < 8
                }
                label="Modifier le mot de passe"
                loading={passwordPending}
                onPress={() => void submitPassword()}
              />
            </View>
          </View>
        </View>

        <View
          className="gap-6 rounded-todam border border-line bg-paper p-5 md:p-6"
          testID="account-data-card"
        >
          <View className="gap-4">
            <SectionTitle>Mes données</SectionTitle>
            <Text className="leading-6 text-muted">
              Télécharge une copie de tes données Todam au format JSON.
            </Text>
            <View className="w-full md:self-start md:w-auto">
              <Button
                label="Exporter mes données"
                loading={exportPending}
                onPress={() => void exportData()}
                variant="secondary"
              />
            </View>
            {exportMessage ? (
              <Text className="text-sm leading-5 text-muted">{exportMessage}</Text>
            ) : null}
          </View>

          <View
            className="gap-4 border-t pt-6"
            style={{ borderColor: tokens.color.error }}
            testID="account-danger-zone"
          >
            <Text
              className="text-xs font-extrabold uppercase tracking-[1.5px]"
              style={{ color: tokens.color.error }}
            >
              Zone sensible
            </Text>
            <Text className="text-lg font-bold text-ink">Supprimer mon compte</Text>
            <Text className="leading-6 text-muted">
              La suppression effacera ton journal, tes notes et ta liste « À voir ».
              Elle devra être confirmée depuis l’e-mail envoyé par Todam.
            </Text>
            <View className="w-full md:self-start md:w-auto">
              <Button
                label="Supprimer mon compte"
                onPress={() => router.push("/supprimer-mon-compte")}
                variant="danger"
              />
            </View>
          </View>
        </View>
      </View>
      <LegalFooter />
    </PageScrollView>
  );
}
