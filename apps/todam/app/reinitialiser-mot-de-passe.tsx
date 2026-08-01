import { Button, PasswordField } from "@todam/design-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { PageScrollView } from "../components/PageScrollView";
import { PrivatePageHead } from "../components/PrivatePageHead";
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
    if (!token || password.length < 8 || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (result.error) {
        setError("Ce lien est invalide ou expiré.");
        return;
      }
      router.replace("/sign-in");
    } catch {
      setError("Le mot de passe n’a pas pu être modifié. Réessaie.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PrivatePageHead title="Nouveau mot de passe" />
      <PageScrollView contentContainerClassName="flex-grow" footer="minimal">
        <View className="todam-page-before-footer w-full flex-1 justify-start py-6 md:justify-center md:py-12">
          <View className="todam-auth-panel mx-auto w-[calc(100%_-_2.5rem)] max-w-lg gap-5 p-5 md:p-8">
            <Text
              aria-level={1}
              accessibilityRole="header"
              className="font-serif text-4xl font-bold text-ink"
            >
              Nouveau mot de passe
            </Text>
            <PasswordField
              autoComplete="new-password"
              error={
                error ??
                (password && password.length < 8
                  ? "Le mot de passe doit contenir au moins 8 caractères."
                  : undefined)
              }
              label="Mot de passe (8 caractères minimum)"
              onChangeText={setPassword}
              onSubmitEditing={() => void submit()}
              required
              returnKeyType="go"
              value={password}
              webName="new-password"
            />
            <Button
              disabled={!token || password.length < 8}
              label="Enregistrer le mot de passe"
              loading={pending}
              onPress={() => void submit()}
            />
          </View>
        </View>
      </PageScrollView>
    </>
  );
}
