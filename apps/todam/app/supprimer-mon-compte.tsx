import { Button, PasswordField } from "@todam/design-system";
import * as Linking from "expo-linking";
import { useState } from "react";
import { Text } from "react-native";

import { PageStaticView } from "../components/PageScrollView";
import { PrivatePageHead } from "../components/PrivatePageHead";
import { authClient } from "../lib/auth-client";

export default function DeleteMyAccountScreen() {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (password.length < 8 || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await authClient.deleteUser({
        password,
        callbackURL: Linking.createURL("/suppression-compte"),
      });
      if (result.error) {
        setError("Le mot de passe est incorrect ou la demande a échoué.");
        return;
      }
      setMessage(
        "Un e-mail de confirmation a été envoyé. Le compte ne sera supprimé qu'après ton clic sur ce lien.",
      );
    } catch {
      setError("La demande de suppression n’a pas pu être envoyée. Réessaie.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PrivatePageHead title="Supprimer mon compte" />
      <PageStaticView className="mx-auto w-full max-w-lg flex-1 justify-center gap-5 px-5 py-12">
        <Text
          aria-level={1}
          accessibilityRole="header"
          className="font-serif text-4xl font-bold text-ink"
        >
          Supprimer mon compte
        </Text>
        <Text className="text-base leading-6 text-muted">
          Exporte d’abord tes données si tu souhaites les conserver. La suppression
          effacera le journal, les notes, les avis, les listes personnalisées, la liste
          « À voir » et révoquera les sessions. Les contributions catalogue déjà
          publiées resteront dans l’historique, sans lien vers ton compte.
        </Text>
        <PasswordField
          autoComplete="current-password"
          error={error ?? undefined}
          label="Mot de passe actuel"
          onChangeText={setPassword}
          onSubmitEditing={() => void submit()}
          required
          returnKeyType="go"
          value={password}
          webName="current-password"
        />
        <Button
          disabled={password.length < 8}
          label="Envoyer l'e-mail de confirmation"
          loading={pending}
          onPress={() => void submit()}
        />
        {message ? (
          <Text
            accessibilityLiveRegion="polite"
            className="text-base leading-6 text-ink"
          >
            {message}
          </Text>
        ) : null}
      </PageStaticView>
    </>
  );
}
