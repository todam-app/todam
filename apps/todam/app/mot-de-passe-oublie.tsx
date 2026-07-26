import { Button, TextField } from "@todam/design-system";
import * as Linking from "expo-linking";
import { useState } from "react";
import { Text } from "react-native";

import { PageStaticView } from "../components/PageScrollView";
import { authClient } from "../lib/auth-client";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setPending(true);
    await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: Linking.createURL("/reinitialiser-mot-de-passe"),
    });
    setPending(false);
    setSent(true);
  }

  return (
    <PageStaticView className="mx-auto w-full max-w-lg flex-1 justify-center gap-5 px-5 py-12">
      <Text
        accessibilityRole="header"
        className="font-serif text-4xl font-black text-ink"
      >
        Mot de passe oublié
      </Text>
      <Text className="leading-6 text-muted">
        Saisis ton adresse e-mail. Si un compte correspond, un lien valable une heure
        sera envoyé.
      </Text>
      <TextField
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label="E-mail"
        onChangeText={setEmail}
        value={email}
      />
      <Button
        disabled={!email.includes("@")}
        label="Envoyer le lien"
        loading={pending}
        onPress={() => void submit()}
      />
      {sent ? (
        <Text className="leading-6 text-ink">
          Si cette adresse existe, l’e-mail vient d’être envoyé.
        </Text>
      ) : null}
    </PageStaticView>
  );
}
