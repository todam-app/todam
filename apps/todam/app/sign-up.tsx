import { useQuery } from "@tanstack/react-query";
import { Button, TextField } from "@todam/design-system";
import { Link, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { useState, type ReactNode } from "react";
import { Platform, Text, View } from "react-native";

import { PageScrollView } from "../components/PageScrollView";
import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";

function parameter(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function LegalLink({
  children,
  href,
}: {
  children: ReactNode;
  href: "/conditions-utilisation" | "/confidentialite";
}) {
  if (Platform.OS === "web") {
    return (
      <a
        className="font-semibold text-accent"
        href={href}
        rel="noreferrer"
        target="_blank"
      >
        {children}
      </a>
    );
  }
  return (
    <Link className="font-semibold text-accent" href={href}>
      {children}
    </Link>
  );
}

export default function SignUpScreen() {
  const params = useLocalSearchParams<{
    action?: string;
    rating?: string;
    returnTo?: string;
  }>();
  const legal = useQuery({
    queryKey: ["legal-current"],
    queryFn: () => api.getCurrentLegalDocuments(),
    staleTime: 5 * 60_000,
  });
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [created, setCreated] = useState(false);
  const [duplicateEmail, setDuplicateEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!legal.data) return;
    setPending(true);
    setError(null);
    setDuplicateEmail(false);
    const input = {
      name: username.trim(),
      username: username.trim(),
      displayUsername: username.trim(),
      email: email.trim(),
      password,
      age15OrOlder: true,
      termsVersion: legal.data.terms.version,
      privacyNoticeVersion: legal.data.privacyNotice.version,
      channel: Platform.OS === "android" ? "android" : "web",
      callbackURL: Linking.createURL("/email-verifie"),
    };
    const result = await authClient.signUp.email(
      input as unknown as Parameters<typeof authClient.signUp.email>[0],
    );
    setPending(false);
    if (result.error) {
      const code = (result.error as { code?: string }).code;
      if (code === "EMAIL_ALREADY_REGISTERED") {
        setDuplicateEmail(true);
        setError("Un compte existe déjà avec cette adresse e-mail");
      } else if (code === "USERNAME_ALREADY_TAKEN") {
        setError("Ce nom d'utilisateur est déjà utilisé.");
      } else if (code === "LEGAL_VERSION_OUTDATED") {
        await legal.refetch();
        setError(
          "Les documents juridiques ont été mis à jour. Relis-les puis réessaie.",
        );
      } else {
        setError("Le compte n'a pas pu être créé. Vérifie les informations.");
      }
      return;
    }
    setCreated(true);
  }

  if (created) {
    return (
      <View className="mx-auto w-full max-w-lg flex-1 items-center justify-center gap-5 px-5 py-12">
        <Text
          accessibilityRole="header"
          className="text-center font-serif text-4xl font-black text-ink"
        >
          Confirme ton adresse e-mail
        </Text>
        <Text className="text-center leading-6 text-muted">
          Un lien valable 24 heures a été envoyé à {email.trim()}. Ton compte sera
          activé après cette vérification.
        </Text>
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
          <Button label="Revenir à la connexion" variant="secondary" />
        </Link>
      </View>
    );
  }

  const canSubmit =
    username.trim().length >= 3 &&
    email.includes("@") &&
    password.length >= 8 &&
    Boolean(legal.data);

  return (
    <PageScrollView
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
      </View>
      <TextField
        autoCapitalize="none"
        autoComplete="username"
        inputMode="email"
        keyboardType="email-address"
        label="E-mail"
        onChangeText={setEmail}
        value={email}
      />
      <TextField
        autoCapitalize="none"
        autoComplete="off"
        inputMode="text"
        label="Nom d'utilisateur"
        maxLength={30}
        onChangeText={setUsername}
        value={username}
      />
      <TextField
        autoComplete="new-password"
        label="Mot de passe (8 caractères minimum)"
        onChangeText={setPassword}
        secureTextEntry
        value={password}
      />
      <Text className="leading-6 text-muted">
        En créant mon compte, je déclare avoir au moins 15 ans, j’accepte les{" "}
        <LegalLink href="/conditions-utilisation">
          Conditions générales d’utilisation
        </LegalLink>{" "}
        et je reconnais avoir pris connaissance de la{" "}
        <LegalLink href="/confidentialite">Politique de confidentialité</LegalLink>.
      </Text>
      {legal.isError ? (
        <Text accessibilityRole="alert" className="text-[#A1261A]">
          Les documents juridiques ne sont pas disponibles. Réessaie plus tard.
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" className="text-[#A1261A]">
          {error}
        </Text>
      ) : null}
      {duplicateEmail ? (
        <View className="gap-2 rounded-todam border border-line bg-paper p-4">
          <Text className="text-sm leading-5 text-muted">
            Retrouve ton compte existant :
          </Text>
          <Link href="/sign-in" asChild>
            <Button label="Se connecter" variant="secondary" />
          </Link>
          <Link href="/mot-de-passe-oublie" asChild>
            <Button label="Mot de passe oublié" variant="ghost" />
          </Link>
        </View>
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
        <Button label="J'ai déjà un compte" variant="ghost" />
      </Link>
    </PageScrollView>
  );
}
