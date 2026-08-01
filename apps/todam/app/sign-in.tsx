import { Button, PasswordField, TextField } from "@todam/design-system";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { PageScrollView } from "../components/PageScrollView";
import { PrivatePageHead } from "../components/PrivatePageHead";
import { authClient } from "../lib/auth-client";
import { internalDestination, safeInternalPath } from "../lib/navigation";

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
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!identifier.trim() || password.length < 8 || pending) return;
    setPending(true);
    setError(null);
    try {
      const normalizedIdentifier = identifier.trim();
      const result = normalizedIdentifier.includes("@")
        ? await authClient.signIn.email({
            email: normalizedIdentifier,
            password,
          })
        : await authClient.signIn.username({
            username: normalizedIdentifier,
            password,
          });
      if (result.error) {
        setError("Email, nom d'utilisateur ou mot de passe incorrect.");
        return;
      }
      const destination = internalDestination(parameter(params.returnTo));
      router.replace({
        pathname: destination.pathname,
        params: {
          ...destination.params,
          ...(params.action ? { resumeAction: parameter(params.action) } : {}),
          ...(params.rating ? { resumeRating: parameter(params.rating) } : {}),
        },
      });
    } catch {
      setError("La connexion est momentanément indisponible. Réessaie.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PrivatePageHead title="Connexion" />
      <PageScrollView
        contentContainerClassName="flex-grow"
        footer="minimal"
        keyboardShouldPersistTaps="handled"
      >
        <View className="todam-page-before-footer w-full flex-1 justify-start py-6 md:justify-center md:py-12">
          <View className="todam-auth-panel mx-auto w-[calc(100%_-_2.5rem)] max-w-lg gap-5 p-5 md:gap-6 md:p-8">
            <View className="gap-2">
              <Text
                aria-level={1}
                accessibilityRole="header"
                className="font-serif text-4xl font-bold text-ink"
              >
                Bon retour
              </Text>
              <Text className="text-base text-muted">Retrouve ton journal Todam.</Text>
            </View>
            <TextField
              autoCapitalize="none"
              autoComplete="username"
              inputMode="text"
              label="Email ou nom d'utilisateur"
              onChangeText={setIdentifier}
              required
              value={identifier}
              webName="identifier"
            />
            <PasswordField
              autoComplete="current-password"
              label="Mot de passe"
              onChangeText={setPassword}
              onSubmitEditing={() => void submit()}
              required
              returnKeyType="go"
              value={password}
              webName="password"
            />
            {error ? (
              <Text
                accessibilityRole="alert"
                className="text-base leading-6 text-error"
              >
                {error}
              </Text>
            ) : null}
            <Button
              disabled={!identifier.trim() || password.length < 8}
              label="Se connecter"
              loading={pending}
              onPress={() => void submit()}
            />
            <View className="gap-2">
              <Link href="/mot-de-passe-oublie" asChild>
                <Button label="Mot de passe oublié" variant="ghost" />
              </Link>
              <Link
                href={{
                  pathname: "/sign-up",
                  params: {
                    ...(params.returnTo
                      ? { returnTo: safeInternalPath(parameter(params.returnTo)) }
                      : {}),
                    ...(params.action ? { action: parameter(params.action) } : {}),
                    ...(params.rating ? { rating: parameter(params.rating) } : {}),
                  },
                }}
                asChild
              >
                <Button label="Créer un compte" variant="ghost" />
              </Link>
            </View>
          </View>
        </View>
      </PageScrollView>
    </>
  );
}
