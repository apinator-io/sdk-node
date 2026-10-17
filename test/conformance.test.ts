import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { signRequest, signChannel, signWebhookPayload } from "../src/crypto";
import { authenticateChannel } from "../src/auth";
import { verifyWebhook } from "../src/webhook";
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

  it("matches webhook verification fixture cases", () => {
    type VerifyCase = {
      name: string;
      secret: string;
      signing_secret?: string;
      body: string;
      timestamp_offset: number;
      max_age: number | null;
      headers: Record<string, string | string[]>;
      expected_valid: boolean;
    };
    const cases: VerifyCase[] = WEBHOOK_FIXTURE.verify_cases;
    expect(cases.length).toBeGreaterThan(0);

    for (const c of cases) {
      const timestamp = String(Math.floor(Date.now() / 1000) + c.timestamp_offset);
      const signature = signWebhookPayload(c.signing_secret ?? c.secret, timestamp, c.body);
      const fill = (v: string) =>
        v.replace("{timestamp}", timestamp).replace("{signature}", signature);
      const headers: Record<string, string | string[]> = {};
      for (const [k, v] of Object.entries(c.headers)) {
        headers[k] = Array.isArray(v) ? v.map(fill) : fill(v);
      }

      const valid = verifyWebhook(c.secret, headers, c.body, c.max_age ?? undefined);
      expect(valid, c.name).toBe(c.expected_valid);
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
