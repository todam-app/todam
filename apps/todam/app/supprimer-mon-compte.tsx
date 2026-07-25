import { Button, TextField } from "@todam/design-system";
import * as Linking from "expo-linking";
import { useState } from "react";
import { Text, View } from "react-native";

import { authClient } from "../lib/auth-client";

export default function DeleteMyAccountScreen() {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await authClient.deleteUser({
      password,
      callbackURL: Linking.createURL("/suppression-compte"),
    });
    setPending(false);
    if (result.error) {
      setError("Le mot de passe est incorrect ou la demande a échoué.");
      return;
    }
    setMessage(
      "Un e-mail de confirmation a été envoyé. Le compte ne sera supprimé qu'après ton clic sur ce lien.",
    );
  }

  return (
    <View className="mx-auto w-full max-w-lg flex-1 justify-center gap-5 px-5 py-12">
      <Text
        accessibilityRole="header"
        className="font-serif text-4xl font-black text-ink"
      >
        Supprimer mon compte
      </Text>
      <Text className="leading-6 text-muted">
        Exporte d’abord tes données si tu souhaites les conserver. La suppression
        effacera le journal, les notes, la liste « À voir » et révoquera les sessions.
      </Text>
      <TextField
        autoComplete="current-password"
        label="Mot de passe actuel"
        onChangeText={setPassword}
        secureTextEntry
        value={password}
      />
      <Button
        disabled={password.length < 8}
        label="Envoyer l'e-mail de confirmation"
        loading={pending}
        onPress={() => void submit()}
      />
      {message ? <Text className="leading-6 text-ink">{message}</Text> : null}
      {error ? (
        <Text accessibilityRole="alert" className="text-[#A1261A]">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
