import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { signRequest, signChannel, signWebhookPayload } from "../src/crypto";
import { authenticateChannel } from "../src/auth";
import { Apinator } from "../src/client";
import { AuthenticationError } from "../src/errors";

const HMAC_FIXTURE = JSON.parse(
  readFileSync(new URL("./fixtures/hmac-request.v1.json", import.meta.url), "utf8")
);
const CHANNEL_FIXTURE = JSON.parse(
  readFileSync(new URL("./fixtures/channel-auth.v1.json", import.meta.url), "utf8")
);
const WEBHOOK_FIXTURE = JSON.parse(
  readFileSync(new URL("./fixtures/webhook-signature.v1.json", import.meta.url), "utf8")
);

describe("contract conformance", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("matches HMAC request fixture vectors", () => {
    for (const c of HMAC_FIXTURE.cases) {
      const actual = signRequest(c.secret, c.method, c.path, c.body, c.timestamp);
      expect(actual).toBe(c.expected_signature);
    }
  });

  it("enforces canonical-path signing for query cases", () => {
    const queryCase = HMAC_FIXTURE.cases.find((c: any) => c.name === "query-not-signed");
    expect(queryCase).toBeTruthy();

    const canonical = signRequest(
      queryCase.secret,
      queryCase.method,
      queryCase.path,
      queryCase.body,
      queryCase.timestamp
    );
    expect(canonical).toBe(queryCase.expected_signature);

    const legacy = signRequest(
      queryCase.secret,
      queryCase.method,
      queryCase.raw_path,
      queryCase.body,
      queryCase.timestamp
    );
    expect(legacy).not.toBe(queryCase.expected_signature);
  });

  it("matches channel auth fixture vectors", () => {
    for (const c of CHANNEL_FIXTURE.cases) {
      const sig = signChannel(c.secret, c.socket_id, c.channel_name, c.channel_data);
      expect(sig).toBe(c.expected_signature);

      const auth = authenticateChannel(
        c.secret,
        c.key,
        c.socket_id,
        c.channel_name,
        c.channel_data
      );
      expect(auth.auth).toBe(c.expected_auth);
    }
  });

  it("matches webhook fixture vectors", () => {
    for (const c of WEBHOOK_FIXTURE.cases) {
      expect(signWebhookPayload(c.secret, c.timestamp, c.body)).toBe(c.expected_signature);
    }
  });

  it("parses RFC7807 error payloads", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          type: "https://docs.apinator.io/problems/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "signature mismatch",
          code: "unauthorized",
        }),
    });

    const client = new Apinator({
      appId: "test-app-id",
      key: "test-key",
      secret: "test-secret",
      cluster: "eu",
    });

    await expect(
      client.trigger({
        name: "test-event",
        channel: "test-channel",
        data: JSON.stringify({ message: "hello" }),
      })
    ).rejects.toThrow(AuthenticationError);
  });
});
