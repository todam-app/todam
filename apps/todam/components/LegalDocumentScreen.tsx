import Head from "expo-router/head";
import type { ReactNode } from "react";
import { Linking, Platform, Text, View, type ViewProps } from "react-native";

import {
  legalDocumentMarkdown,
  legalPdfUrl,
  type LegalDocumentId,
} from "../lib/legal-documents";
import { PageScrollView } from "./PageScrollView";

interface Block {
  kind: "title" | "section" | "paragraph" | "bullet";
  text: string;
}

function inlineText(text: string): ReactNode[] {
  return text
    .replaceAll("`", "")
    .split(/(\[[^\]]+\]\(mailto:[^)]+\)|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g)
    .filter(Boolean)
    .map((part, index) => {
      const markdownEmail = part.match(/^\[([^\]]+)\]\(mailto:([^)]+)\)$/);
      const address = markdownEmail?.[2] ?? (part.includes("@") ? part : null);
      const label = markdownEmail?.[1] ?? part;
      return address ? (
        <Text
          accessibilityRole="link"
          className="text-base font-semibold text-brand-text"
          key={`${part}-${index}`}
          onPress={() => void Linking.openURL(`mailto:${address}`)}
        >
          {label}
        </Text>
      ) : (
        part
      );
    });
}

function parseMarkdown(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
    } else if (trimmed.startsWith("# ")) {
      flush();
      blocks.push({ kind: "title", text: trimmed.slice(2) });
    } else if (trimmed.startsWith("## ")) {
      flush();
      blocks.push({ kind: "section", text: trimmed.slice(3) });
    } else if (trimmed.startsWith("- ")) {
      flush();
      blocks.push({ kind: "bullet", text: trimmed.slice(2) });
    } else {
      paragraph.push(trimmed);
    }
  }
  flush();
  return blocks;
}

export function LegalDocumentContent({
  documentId,
  titleLevel = 1,
}: {
  documentId: LegalDocumentId;
  titleLevel?: 1 | 2;
}) {
  const blocks = parseMarkdown(legalDocumentMarkdown(documentId));

  return (
    <View className="gap-4">
      {blocks.map((block, index) => {
        if (block.kind === "title") {
          return (
            <Text
              aria-level={titleLevel}
              accessibilityRole="header"
              className={
                titleLevel === 1
                  ? "font-serif text-4xl font-bold leading-tight text-ink"
                  : "font-serif text-3xl font-bold leading-tight text-ink"
              }
              key={`${block.kind}-${index}`}
            >
              {block.text}
            </Text>
          );
        }
        if (block.kind === "section") {
          return (
            <Text
              aria-level={titleLevel + 1}
              accessibilityRole="header"
              className="mt-5 font-serif text-2xl font-bold text-ink"
              key={`${block.kind}-${index}`}
            >
              {block.text}
            </Text>
          );
        }
        return (
          <Text
            className="text-base leading-7 text-ink"
            key={`${block.kind}-${index}`}
            selectable
          >
            {block.kind === "bullet" ? "• " : null}
            {inlineText(block.text)}
          </Text>
        );
      })}
    </View>
  );
}

export function LegalDocumentPdfLink({ documentId }: { documentId: LegalDocumentId }) {
  return (
    <Text
      accessibilityRole="link"
      className="min-h-11 py-3 text-base font-semibold text-brand-text"
      onPress={() => void Linking.openURL(legalPdfUrl(documentId))}
    >
      Télécharger la version PDF archivée
    </Text>
  );
}

export function LegalDocumentScreen({
  children,
  documentId,
  ...viewProps
}: ViewProps & {
  children?: ReactNode;
  documentId: LegalDocumentId;
}) {
  const blocks = parseMarkdown(legalDocumentMarkdown(documentId));
  const title = blocks.find((block) => block.kind === "title")?.text ?? "Todam";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta content="noindex,nofollow,noarchive,nosnippet" name="robots" />
      </Head>
      <PageScrollView
        contentContainerClassName="flex-grow"
        contentInsetAdjustmentBehavior="automatic"
        footerAlwaysVisible
      >
        <View
          className={`${Platform.OS === "web" ? "todam-page-before-footer " : ""}todam-legal-document mx-auto w-full max-w-3xl gap-5 px-5 py-10 md:px-10 md:py-14`}
        >
          <View className="gap-4" {...viewProps}>
            <LegalDocumentContent documentId={documentId} />
          </View>
          {children}
          <LegalDocumentPdfLink documentId={documentId} />
        </View>
      </PageScrollView>
    </>
  );
}
