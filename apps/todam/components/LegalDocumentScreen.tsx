import Head from "expo-router/head";
import type { ReactNode } from "react";
import {
  Linking,
  Platform,
  Text,
  View,
  type ViewProps,
} from "react-native";

import {
  legalDocumentMarkdown,
  legalPdfUrl,
  type LegalDocumentId,
} from "../lib/legal-documents";
import { LegalFooter } from "./LegalFooter";
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
          className="font-semibold text-accent"
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
      >
        <View
          className={`${Platform.OS === "web" ? "todam-page-before-footer " : ""}mx-auto w-full max-w-3xl gap-5 px-5 py-10 md:px-8 md:py-14`}
        >
          <View className="gap-4" {...viewProps}>
            {blocks.map((block, index) => {
              if (block.kind === "title") {
                return (
                  <Text
                    accessibilityRole="header"
                    className="font-serif text-4xl font-black leading-tight text-ink"
                    key={`${block.kind}-${index}`}
                  >
                    {block.text}
                  </Text>
                );
              }
              if (block.kind === "section") {
                return (
                  <Text
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
          {children}
          <Text
            accessibilityRole="link"
            className="min-h-11 py-3 font-semibold text-accent"
            onPress={() => void Linking.openURL(legalPdfUrl(documentId))}
          >
            Télécharger la version PDF archivée
          </Text>
        </View>
        <LegalFooter alwaysVisible />
      </PageScrollView>
    </>
  );
}
