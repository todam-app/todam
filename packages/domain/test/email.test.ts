import { afterEach, describe, expect, it, vi } from "vitest";

import { createEmailSenderFromEnvironment } from "../src/index.js";

describe("transport des e-mails transactionnels", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("transmet simultanément les versions texte et HTML à Brevo", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _request?: RequestInit) =>
        new Response(null, { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const sender = createEmailSenderFromEnvironment({
      BREVO_API_KEY: "test-api-key",
      EMAIL_FROM: "envoi@example.test",
      EMAIL_FROM_NAME: "Todam",
    });

    await sender.send({
      html: "<p>Bonjour</p>",
      subject: "Bienvenue",
      text: "Bonjour",
      to: "destinataire@example.test",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(request).toBeDefined();
    if (!request) throw new Error("La requête Brevo est absente.");
    expect(request.method).toBe("POST");
    expect(JSON.parse(request.body as string)).toMatchObject({
      htmlContent: "<p>Bonjour</p>",
      sender: { email: "envoi@example.test", name: "Todam" },
      subject: "Bienvenue",
      textContent: "Bonjour",
      to: [{ email: "destinataire@example.test" }],
    });
  });
});
