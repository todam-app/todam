import { Button, TextField } from "@todam/design-system";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { authClient } from "../lib/auth-client";

function parameter(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function SignInScreen() {
  const params = useLocalSearchParams<{
    action?: string;
    rating?: string;
    returnTo?: string;
  }>();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    const returnTo = parameter(params.returnTo) ?? "/profile";
    router.replace({
      pathname: returnTo,
      params: {
        ...(params.action ? { resumeAction: parameter(params.action) } : {}),
        ...(params.rating ? { resumeRating: parameter(params.rating) } : {}),
      },
    });
  }

  return (
    <ScrollView
      contentContainerClassName="mx-auto w-full max-w-lg gap-6 px-5 py-10"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="font-serif text-4xl font-black text-ink"
        >
          Bon retour
        </Text>
        <Text className="text-muted">Retrouve ton journal Todam.</Text>
      </View>
      <TextField
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        value={email}
      />
      <TextField
        autoComplete="current-password"
        label="Mot de passe"
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
        disabled={!email || password.length < 8}
        label="Se connecter"
        loading={pending}
        onPress={() => void submit()}
      />
      <Link
        href={{
          pathname: "/sign-up",
          params: {
            ...(params.returnTo ? { returnTo: parameter(params.returnTo) } : {}),
            ...(params.action ? { action: parameter(params.action) } : {}),
            ...(params.rating ? { rating: parameter(params.rating) } : {}),
          },
        }}
        asChild
      >
        <Button label="Créer un compte" variant="ghost" />
      </Link>
    </ScrollView>
  );
}
