import { Button, TextField } from "@todam/design-system";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { LegalDocumentScreen } from "../components/LegalDocumentScreen";
import { api } from "../lib/api";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function AccountDeletionScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = first(params.token);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestDeletion() {
    setPending(true);
    setError(null);
    try {
      await api.requestAccountDeletion(email.trim());
      setMessage(
        "Si un compte correspond à cette adresse, un lien valable 24 heures vient d'être envoyé.",
      );
    } catch {
      setError("La demande n'a pas pu être envoyée. Réessaie plus tard.");
    } finally {
      setPending(false);
    }
  }

  async function confirmDeletion() {
    setPending(true);
    setError(null);
    try {
      await api.confirmAccountDeletion(token);
      setMessage("Le compte et ses données actives ont été supprimés.");
    } catch {
      setError("Ce lien est invalide ou expiré. Demande un nouveau lien.");
    } finally {
      setPending(false);
    }
  }

  return (
    <LegalDocumentScreen documentId="deletion">
      <View className="mt-6 gap-4 rounded-todam border border-line bg-paper p-5">
        {token ? (
          <Button
            label="Confirmer la suppression définitive"
            loading={pending}
            onPress={() => void confirmDeletion()}
          />
        ) : (
          <>
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Adresse e-mail du compte"
              onChangeText={setEmail}
              value={email}
            />
            <Button
              disabled={!email.includes("@")}
              label="Recevoir le lien de suppression"
              loading={pending}
              onPress={() => void requestDeletion()}
            />
          </>
        )}
        {message ? <Text className="leading-6 text-ink">{message}</Text> : null}
        {error ? (
          <Text accessibilityRole="alert" className="leading-6 text-[#A1261A]">
            {error}
          </Text>
        ) : null}
      </View>
    </LegalDocumentScreen>
  );
}
