export interface TransactionalEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSender {
  send(message: TransactionalEmail): Promise<void>;
}

class UnconfiguredEmailSender implements EmailSender {
  async send(): Promise<void> {
    throw new Error(
      "L'envoi d'e-mails transactionnels n'est pas configuré. Renseignez BREVO_API_KEY et EMAIL_FROM.",
    );
  }
}

class BrevoEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fromName: string,
  ) {}

  async send(message: TransactionalEmail): Promise<void> {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": this.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: this.from, name: this.fromName },
        to: [{ email: message.to }],
        subject: message.subject,
        ...(message.html
          ? { htmlContent: message.html }
          : { textContent: message.text }),
      }),
    });

    if (!response.ok) {
      throw new Error(`Brevo a refusé l'e-mail transactionnel (${response.status}).`);
    }
  }
}

export function createEmailSenderFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): EmailSender {
  const apiKey = environment.BREVO_API_KEY;
  const from = environment.EMAIL_FROM;
  if (!apiKey || !from) {
    return new UnconfiguredEmailSender();
  }
  return new BrevoEmailSender(apiKey, from, environment.EMAIL_FROM_NAME ?? "Todam");
}
