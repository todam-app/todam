import { Button, TextField } from "@todam/design-system";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { authClient } from "../lib/auth-client";

function parameter(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function SignUpScreen() {
  const params = useLocalSearchParams<{
    action?: string;
    rating?: string;
    returnTo?: string;
  }>();
  const router = useRouter();
  const [pseudonym, setPseudonym] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const input = {
      name: pseudonym.trim(),
      pseudonym: pseudonym.trim(),
      email: email.trim(),
      password,
      ageConfirmedAt: new Date(),
    };
    const result = await authClient.signUp.email(
      input as unknown as Parameters<typeof authClient.signUp.email>[0],
    );
    setPending(false);
    if (result.error) {
      setError(
        result.error.status === 422
          ? "Ce pseudonyme ou cet email est déjà utilisé."
          : "Le compte n’a pas pu être créé. Vérifie les informations.",
      );
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

  const canSubmit =
    pseudonym.trim().length >= 3 &&
    email.includes("@") &&
    password.length >= 8 &&
    ageConfirmed;

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
          Créer ton journal
        </Text>
        <Text className="text-muted">
          Un pseudonyme suffit pour commencer. Il sera unique sur Todam.
        </Text>
      </View>
      <TextField
        autoCapitalize="none"
        autoComplete="username-new"
        label="Pseudonyme"
        maxLength={30}
        onChangeText={setPseudonym}
        value={pseudonym}
      />
      <TextField
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        value={email}
      />
      <TextField
        autoComplete="new-password"
        label="Mot de passe (8 caractères minimum)"
        onChangeText={setPassword}
        secureTextEntry
        value={password}
      />
      <Pressable
        accessibilityLabel="Je confirme avoir 15 ans ou plus"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: ageConfirmed }}
        className="min-h-11 flex-row items-center gap-3"
        onPress={() => setAgeConfirmed((value) => !value)}
      >
        <View
          className={`h-6 w-6 items-center justify-center rounded border ${
            ageConfirmed ? "border-accent bg-accent" : "border-line bg-paper"
          }`}
        >
          <Text className="font-bold text-paper">{ageConfirmed ? "✓" : ""}</Text>
        </View>
        <Text className="flex-1 text-ink">J’ai 15 ans ou plus.</Text>
      </Pressable>
      {error ? (
        <Text accessibilityRole="alert" className="text-[#A1261A]">
          {error}
        </Text>
      ) : null}
      <Button
        disabled={!canSubmit}
        label="Créer mon compte"
        loading={pending}
        onPress={() => void submit()}
      />
      <Link
        href={{
          pathname: "/sign-in",
          params: {
            ...(params.returnTo ? { returnTo: parameter(params.returnTo) } : {}),
            ...(params.action ? { action: parameter(params.action) } : {}),
            ...(params.rating ? { rating: parameter(params.rating) } : {}),
          },
        }}
        asChild
      >
        <Button label="J’ai déjà un compte" variant="ghost" />
      </Link>
    </ScrollView>
  );
}
