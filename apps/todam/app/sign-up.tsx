import { useQuery } from "@tanstack/react-query";
import { UsernameSchema } from "@todam/contracts";
import { Button, PasswordField, TextField } from "@todam/design-system";
import { Link, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { useState, type ReactNode } from "react";
import { Platform, Text, View } from "react-native";

import { PageScrollView, PageStaticView } from "../components/PageScrollView";
import { PrivatePageHead } from "../components/PrivatePageHead";
import { api } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { safeInternalPath } from "../lib/navigation";

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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
    if (!legal.data || pending) return;
    setPending(true);
    setError(null);
    setDuplicateEmail(false);
    try {
      const returnTo = safeInternalPath(parameter(params.returnTo));
      const action = parameter(params.action);
      const rating = parameter(params.rating);
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
        callbackURL: Linking.createURL("/email-verifie", {
          queryParams: {
            returnTo,
            ...(action ? { action } : {}),
            ...(rating ? { rating } : {}),
          },
        }),
      };
      const result = await authClient.signUp.email(
        input as unknown as Parameters<typeof authClient.signUp.email>[0],
      );
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
    } catch {
      setError("La création du compte est momentanément indisponible. Réessaie.");
    } finally {
      setPending(false);
    }
  }

  if (created) {
    return (
      <>
        <PrivatePageHead title="Confirmer l’adresse e-mail" />
        <PageStaticView className="mx-auto w-full max-w-lg flex-1 items-center justify-center gap-5 px-5 py-12">
          <Text
            aria-level={1}
            accessibilityRole="header"
            className="text-center font-serif text-4xl font-bold text-ink"
          >
            Confirme ton adresse e-mail
          </Text>
          <Text className="text-center text-base leading-6 text-muted">
            Un lien valable 24 heures a été envoyé à {email.trim()}. Ton compte sera
            activé après cette vérification.
          </Text>
          <Link
            href={{
              pathname: "/sign-in",
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
            <Button label="Revenir à la connexion" variant="secondary" />
          </Link>
        </PageStaticView>
      </>
    );
  }

  const validUsername = UsernameSchema.safeParse(username).success;
  const canSubmit =
    validUsername &&
    validEmail(email.trim()) &&
    password.length >= 8 &&
    Boolean(legal.data);

  return (
    <>
      <PrivatePageHead title="Créer un compte" />
      <PageScrollView
        contentContainerClassName="mx-auto w-full max-w-lg gap-6 px-5 py-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Text
            aria-level={1}
            accessibilityRole="header"
            className="font-serif text-4xl font-bold text-ink"
          >
            Créer ton journal
          </Text>
        </View>
        <TextField
          autoCapitalize="none"
          autoComplete="email"
          error={
            email && !validEmail(email.trim())
              ? "Saisis une adresse e-mail valide."
              : undefined
          }
          inputMode="email"
          keyboardType="email-address"
          label="E-mail"
          onChangeText={setEmail}
          required
          value={email}
          webName="email"
        />
        <TextField
          autoCapitalize="none"
          autoComplete="username"
          error={
            username && !validUsername
              ? "Utilise 3 à 30 lettres, chiffres, points, tirets ou underscores."
              : undefined
          }
          inputMode="text"
          label="Nom d'utilisateur"
          maxLength={30}
          onChangeText={setUsername}
          required
          value={username}
          webName="username"
        />
        <PasswordField
          autoComplete="new-password"
          error={
            password && password.length < 8
              ? "Le mot de passe doit contenir au moins 8 caractères."
              : undefined
          }
          label="Mot de passe (8 caractères minimum)"
          onChangeText={setPassword}
          onSubmitEditing={() => {
            if (canSubmit) void submit();
          }}
          required
          returnKeyType="go"
          value={password}
          webName="new-password"
        />
        <View className="gap-2 border-l-2 border-accent pl-4">
          <Text className="text-base font-semibold text-ink">
            Visibilité de ton journal
          </Text>
          <Text className="text-base leading-6 text-muted">
            Ton profil pseudonyme et ton journal sont publics par défaut pour pouvoir
            être partagés. Ton e-mail et tes données de compte ne le sont jamais. Tu
            pourras rendre tout le profil privé — ce qui masque aussi les listes et avis
            publics. Chaque nouvelle liste et chaque nouvel avis sont privés par défaut,
            puis peuvent être rendus publics séparément.
          </Text>
        </View>
        <Text className="text-base leading-6 text-muted">
          En créant mon compte, je déclare avoir au moins 15 ans, j’accepte les{" "}
          <LegalLink href="/conditions-utilisation">
            Conditions générales d’utilisation
          </LegalLink>{" "}
          et je reconnais avoir pris connaissance de la{" "}
          <LegalLink href="/confidentialite">Politique de confidentialité</LegalLink>.
        </Text>
        {legal.isError ? (
          <View className="gap-2">
            <Text accessibilityRole="alert" className="text-base text-error">
              Les documents juridiques ne sont pas disponibles.
            </Text>
            <View className="self-start">
              <Button
                label="Réessayer"
                onPress={() => void legal.refetch()}
                variant="secondary"
              />
            </View>
          </View>
        ) : legal.isPending ? (
          <Text accessibilityLiveRegion="polite" className="text-base text-muted">
            Chargement des documents juridiques…
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" className="text-base text-[#A1261A]">
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
              ...(params.returnTo
                ? { returnTo: safeInternalPath(parameter(params.returnTo)) }
                : {}),
              ...(params.action ? { action: parameter(params.action) } : {}),
              ...(params.rating ? { rating: parameter(params.rating) } : {}),
            },
          }}
          asChild
        >
          <Button label="J'ai déjà un compte" variant="ghost" />
        </Link>
      </PageScrollView>
    </>
  );
}
