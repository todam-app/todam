import { useMutation } from "@tanstack/react-query";
import { Button, SectionTitle, TextField } from "@todam/design-system";
import { ContactBodySchema, TodamApiError, type ContactBody } from "@todam/contracts";
import { Link } from "expo-router";
import Head from "expo-router/head";
import { createElement, useState, type ChangeEvent } from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";

import { LegalFooter } from "../components/LegalFooter";
import { PageScrollView } from "../components/PageScrollView";
import { api } from "../lib/api";
import { PUBLIC_WEB_URL } from "../lib/config";

type ContactField = "name" | "email" | "subject" | "message";
type ContactErrors = Partial<Record<ContactField, string>>;

function validateContact(input: ContactBody): {
  data?: ContactBody;
  errors: ContactErrors;
} {
  const result = ContactBodySchema.safeParse(input);
  if (result.success) return { data: result.data, errors: {} };

  const errors: ContactErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (
      (field === "name" ||
        field === "email" ||
        field === "subject" ||
        field === "message") &&
      !errors[field]
    ) {
      errors[field] = issue.message;
    }
  }
  return { errors };
}

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<ContactErrors>({});
  const contact = useMutation({
    mutationFn: (input: ContactBody) => api.sendContactMessage(input),
  });

  const submit = () => {
    const validation = validateContact({
      name,
      email,
      subject,
      message,
      website,
    });
    setErrors(validation.errors);
    if (validation.data) contact.mutate(validation.data);
  };

  return (
    <>
      <Head>
        <title>Contact | Todam</title>
        <meta
          content="Une question sur Todam, le catalogue ou votre compte ? Écrivez-nous depuis le formulaire de contact."
          name="description"
        />
        <link href={`${PUBLIC_WEB_URL}/contact`} rel="canonical" />
      </Head>
      <PageScrollView contentContainerClassName="flex-grow">
        <View className="todam-page-before-footer mx-auto w-full max-w-4xl flex-1 gap-10 px-5 py-10 md:px-8 md:py-14">
          <View className="max-w-3xl gap-4">
            <SectionTitle eyebrow="Contact" level={1}>
              Écrivez à Todam
            </SectionTitle>
            <Text className="max-w-[68ch] text-lg leading-8 text-muted">
              Une question sur le projet, le catalogue ou votre compte ? Une remarque,
              une proposition ? Écrivez à Todam depuis ce formulaire.
            </Text>
          </View>

          <View className="gap-6 lg:flex-row lg:items-start">
            <View className="todam-calm-panel gap-4 p-5 md:p-6 lg:w-72">
              <Text
                aria-level={2}
                accessibilityRole="header"
                className="font-serif text-2xl font-semibold text-ink"
              >
                Écrire directement
              </Text>
              <Pressable
                accessibilityLabel="Écrire à contact@todam.fr"
                accessibilityRole="link"
                className="min-h-11 self-start justify-center"
                onPress={() => void Linking.openURL("mailto:contact@todam.fr")}
              >
          <Text className="text-base font-semibold text-brand-text" selectable>
                  contact@todam.fr
                </Text>
              </Pressable>
              <Text className="text-base leading-6 text-muted">
                Le formulaire et cette adresse arrivent au même endroit.
              </Text>
            </View>

            <View className="min-w-0 flex-1">
              {contact.isSuccess ? (
                <View
                  accessibilityLiveRegion="polite"
                  className="gap-3 rounded-panel border border-success bg-success-soft p-5 md:p-6"
                >
                  <Text className="text-base font-semibold text-success">
                    Votre message a bien été envoyé.
                  </Text>
                  <Text className="text-base leading-6 text-ink">
                    Merci. Todam vous répondra à l’adresse indiquée.
                  </Text>
                </View>
              ) : (
                <View className="todam-form-panel gap-5 p-5 md:p-6">
                  <Text
                    aria-level={2}
                    accessibilityRole="header"
                    className="font-serif text-2xl font-semibold text-ink"
                  >
                    Votre message
                  </Text>
                  <TextField
                    autoCapitalize="words"
                    autoComplete="name"
                    error={errors.name}
                    label="Nom"
                    maxLength={120}
                    onChangeText={setName}
                    required
                    value={name}
                    webAutoComplete="name"
                    webName="name"
                  />
                  <TextField
                    autoCapitalize="none"
                    autoComplete="email"
                    error={errors.email}
                    keyboardType="email-address"
                    label="Adresse e-mail"
                    maxLength={254}
                    onChangeText={setEmail}
                    required
                    textContentType="emailAddress"
                    value={email}
                    webAutoComplete="email"
                    webName="email"
                  />
                  <TextField
                    autoComplete="off"
                    error={errors.subject}
                    label="Objet"
                    maxLength={160}
                    onChangeText={setSubject}
                    required
                    value={subject}
                    webName="subject"
                  />
                  <TextField
                    autoComplete="off"
                    error={errors.message}
                    label="Message"
                    maxLength={5000}
                    multiline
                    onChangeText={setMessage}
                    required
                    style={{ minHeight: 180, textAlignVertical: "top" }}
                    value={message}
                    webName="message"
                  />
                  {Platform.OS === "web"
                    ? createElement("input", {
                        "aria-hidden": true,
                        autoComplete: "off",
                        name: "website",
                        onChange: (event: ChangeEvent<HTMLInputElement>) =>
                          setWebsite(event.currentTarget.value),
                        style: {
                          height: 1,
                          left: -10000,
                          opacity: 0,
                          position: "absolute",
                          width: 1,
                        },
                        tabIndex: -1,
                        value: website,
                      })
                    : null}
                  <Button
                    label="Envoyer le message"
                    loading={contact.isPending}
                    onPress={submit}
                  />
                  {contact.isError ? (
                    <Text
                      accessibilityRole="alert"
                      className="text-base leading-6 text-error"
                    >
                      {contact.error instanceof TodamApiError
                        ? contact.error.problem.detail
                        : "Le message n’a pas pu être envoyé. Réessayez dans quelques instants."}{" "}
                      Vous pouvez aussi écrire directement à contact@todam.fr.
                    </Text>
                  ) : null}
                  <View className="gap-1 border-t border-line pt-4">
                    <Text className="text-xs leading-5 text-muted">
                      Todam utilise ces informations uniquement pour répondre à votre
                      message.
                    </Text>
                    <Link href="/confidentialite" asChild>
                      <Pressable
                        accessibilityRole="link"
                        className="min-h-11 self-start justify-center"
                      >
                        <Text className="text-xs font-semibold text-muted underline">
                          En savoir plus sur vos données et vos droits
                        </Text>
                      </Pressable>
                    </Link>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
        <LegalFooter />
      </PageScrollView>
    </>
  );
}
