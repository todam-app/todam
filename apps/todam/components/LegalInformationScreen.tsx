import Head from "expo-router/head";
import { useState } from "react";
import { Platform, Text, View } from "react-native";

import type { LegalDocumentId } from "../lib/legal-documents";
import { AccessibleTabs } from "./AccessibleTabs";
import { LegalDocumentContent, LegalDocumentPdfLink } from "./LegalDocumentScreen";
import { PageScrollView } from "./PageScrollView";

const legalTabs = [
  { label: "Conditions d’utilisation", value: "terms" },
  { label: "Confidentialité", value: "privacy" },
  { label: "Mentions légales", value: "notices" },
] as const satisfies readonly {
  label: string;
  value: LegalDocumentId;
}[];

export function LegalInformationScreen() {
  const [documentId, setDocumentId] = useState<LegalDocumentId>("terms");
  const selectedLabel =
    legalTabs.find((tab) => tab.value === documentId)?.label ??
    "Conditions d’utilisation";

  return (
    <>
      <Head>
        <title>Informations légales — Todam</title>
        <meta content="noindex,nofollow,noarchive,nosnippet" name="robots" />
      </Head>
      <PageScrollView
        contentContainerClassName="flex-grow"
        contentInsetAdjustmentBehavior="automatic"
        footerAlwaysVisible
      >
        <View
          className={`${Platform.OS === "web" ? "todam-page-before-footer " : ""}todam-legal-document mx-auto w-full max-w-3xl gap-8 px-5 py-10 md:px-10 md:py-14`}
        >
          <View className="gap-3">
            <Text
              aria-level={1}
              accessibilityRole="header"
              className="font-serif text-4xl font-bold leading-tight text-ink"
            >
              Informations légales
            </Text>
            <Text className="text-base leading-7 text-muted">
              Consulte ici les conditions d’utilisation, la politique de confidentialité
              et les mentions légales de Todam.
            </Text>
          </View>
          <AccessibleTabs
            appearance="boxed"
            label="Documents juridiques"
            onChange={setDocumentId}
            tabs={legalTabs}
            testIdPrefix="legal-document"
            value={documentId}
          />
          <View
            accessibilityLabel={selectedLabel}
            className="gap-5"
            testID="legal-document-content"
          >
            <LegalDocumentContent documentId={documentId} titleLevel={2} />
            <LegalDocumentPdfLink documentId={documentId} />
          </View>
        </View>
      </PageScrollView>
    </>
  );
}
