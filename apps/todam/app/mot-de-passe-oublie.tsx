import { Button, TextField } from "@todam/design-system";
import * as Linking from "expo-linking";
import { useState } from "react";
import { Text } from "react-native";

import { PageStaticView } from "../components/PageScrollView";
import { PrivatePageHead } from "../components/PrivatePageHead";
import { authClient } from "../lib/auth-client";

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!validEmail(email.trim()) || pending) return;
    setPending(true);
    setError(null);
    setSent(false);
    try {
      await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: Linking.createURL("/reinitialiser-mot-de-passe"),
      });
      setSent(true);
    } catch {
      setError("Le service d’e-mail est momentanément indisponible. Réessaie.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PrivatePageHead title="Mot de passe oublié" />
      <PageStaticView className="mx-auto w-full max-w-lg flex-1 justify-center gap-5 px-5 py-12">
        <Text
          aria-level={1}
          accessibilityRole="header"
          className="font-serif text-4xl font-bold text-ink"
        >
          Mot de passe oublié
        </Text>
        <Text className="text-base leading-6 text-muted">
          Saisis ton adresse e-mail. Si un compte correspond, un lien valable une heure
          sera envoyé.
        </Text>
        <TextField
          autoCapitalize="none"
          autoComplete="email"
          error={
            email && !validEmail(email.trim())
              ? "Saisis une adresse e-mail valide."
              : undefined
          }
          keyboardType="email-address"
          label="E-mail"
          onChangeText={setEmail}
          onSubmitEditing={() => void submit()}
          required
          returnKeyType="go"
          value={email}
          webName="email"
        />
        <Button
          disabled={!validEmail(email.trim())}
          label="Envoyer le lien"
          loading={pending}
          onPress={() => void submit()}
        />
        {sent ? (
          <Text
            accessibilityLiveRegion="polite"
            className="text-base leading-6 text-ink"
          >
            Si cette adresse existe, l’e-mail vient d’être envoyé.
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" className="text-base leading-6 text-error">
            {error}
          </Text>
        ) : null}
      </PageStaticView>
    </>
  );
}
