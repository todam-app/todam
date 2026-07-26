import { Button, TextField } from "@todam/design-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { authClient } from "../lib/auth-client";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const token = first(params.token);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setPending(false);
    if (result.error) {
      setError("Ce lien est invalide ou expiré.");
      return;
    }
    router.replace("/sign-in");
  }

  return (
    <View className="mx-auto w-full max-w-lg flex-1 justify-center gap-5 px-5 py-12">
      <Text
        accessibilityRole="header"
        className="font-serif text-4xl font-black text-ink"
      >
        Nouveau mot de passe
      </Text>
      <TextField
        autoComplete="new-password"
        label="Mot de passe (8 caractères minimum)"
        onChangeText={setPassword}
        secureTextEntry
        value={password}
      />
      {error ? (
        <Text accessibilityRole="alert" className="text-[#A1261A]">
          {error}
        </Text>
      ) : null}
      <Button
        disabled={!token || password.length < 8}
        label="Enregistrer le mot de passe"
        loading={pending}
        onPress={() => void submit()}
      />
    </View>
  );
}
