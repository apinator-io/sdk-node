import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Apinator } from "../src/client";
import { AuthenticationError, ValidationError, ApiError } from "../src/errors";

describe("Apinator client", () => {
  const options = {
    appId: "test-app-id",
    key: "test-key",
    secret: "test-secret",
    cluster: "eu",
  };

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should derive host from cluster", () => {
      const client = new Apinator(options);
      expect(client).toBeDefined();
    });

    it("should use an explicit host, without a trailing slash", async () => {
      fetchMock.mockResolvedValue({ ok: true, text: async () => '{"channels":[]}' });
      const client = new Apinator({ ...options, host: "http://localhost:8081/" });
      await client.getChannels();
      expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8081/apps/test-app-id/channels");
    });
  });

  describe("trigger", () => {
    it("should send POST request with correct headers and body for single channel", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => "{}",
      });

      const client = new Apinator(options);
      await client.trigger({
        name: "test-event",
        channel: "test-channel",
        data: JSON.stringify({ message: "hello" }),
      });

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0];

      expect(url).toBe("https://ws-eu.apinator.io/apps/test-app-id/events");
      expect(init.method).toBe("POST");
      expect(init.headers["Content-Type"]).toBe("application/json");
      expect(init.headers["X-Realtime-Key"]).toBe("test-key");
      expect(init.headers["X-Realtime-Timestamp"]).toBeDefined();
      expect(init.headers["X-Realtime-Signature"]).toBeDefined();

      const body = JSON.parse(init.body);
      expect(body.name).toBe("test-event");
      expect(body.channel).toBe("test-channel");
      expect(body.data).toBe('{"message":"hello"}');
    });

    it("should send POST request with multiple channels", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => "{}",
      });

      const client = new Apinator(options);
      await client.trigger({
        name: "test-event",
        channels: ["channel-1", "channel-2"],
        data: JSON.stringify({ message: "hello" }),
      });

      expect(fetchMock).toHaveBeenCalledOnce();
      const [, init] = fetchMock.mock.calls[0];

      const body = JSON.parse(init.body);
      expect(body.name).toBe("test-event");
      expect(body.channels).toEqual(["channel-1", "channel-2"]);
      expect(body).not.toHaveProperty("channel");
    });

    it("should include socket_id when provided", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => "{}",
      });

      const client = new Apinator(options);
      await client.trigger({
        name: "test-event",
        channel: "test-channel",
        data: JSON.stringify({ message: "hello" }),
        socketId: "12345.67890",
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.socket_id).toBe("12345.67890");
    });

    it("should throw ValidationError if both channel and channels provided", async () => {
      const client = new Apinator(options);

      await expect(
        client.trigger({
          name: "test-event",
          channel: "test-channel",
          channels: ["channel-1"],
          data: JSON.stringify({ message: "hello" }),
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError if neither channel nor channels provided", async () => {
      const client = new Apinator(options);

      await expect(
        client.trigger({
          name: "test-event",
          data: JSON.stringify({ message: "hello" }),
        } as any)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw AuthenticationError on 401 response", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({
            type: "https://docs.apinator.io/problems/unauthorized",
            title: "Unauthorized",
            status: 401,
            detail: "Invalid credentials",
            code: "unauthorized",
          }),
      });

      const client = new Apinator(options);

      await expect(
        client.trigger({
          name: "test-event",
          channel: "test-channel",
          data: JSON.stringify({ message: "hello" }),
        })
      ).rejects.toThrow(AuthenticationError);
    });

    it("should throw ValidationError on 400 response", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            type: "https://docs.apinator.io/problems/bad_request",
            title: "Bad Request",
            status: 400,
            detail: "Invalid event name",
            code: "bad_request",
          }),
      });

      const client = new Apinator(options);

      await expect(
        client.trigger({
          name: "",
          channel: "test-channel",
          data: JSON.stringify({ message: "hello" }),
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ApiError on other error responses", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      const client = new Apinator(options);

      await expect(
        client.trigger({
          name: "test-event",
          channel: "test-channel",
          data: JSON.stringify({ message: "hello" }),
        })
      ).rejects.toThrow(ApiError);
    });
  });

  describe("authenticateChannel", () => {
    it("should return auth response for private channel", () => {
      const client = new Apinator(options);

      const result = client.authenticateChannel("12345.67890", "private-chat");

      expect(result).toHaveProperty("auth");
      expect(result.auth).toMatch(/^test-key:[a-f0-9]{64}$/);
      expect(result).not.toHaveProperty("channel_data");
    });

    it("should return auth response with channel_data for presence channel", () => {
      const client = new Apinator(options);
      const channelData = JSON.stringify({ user_id: "user1" });

      const result = client.authenticateChannel(
        "12345.67890",
        "presence-chat",
        channelData
      );

      expect(result).toHaveProperty("auth");
      expect(result.auth).toMatch(/^test-key:[a-f0-9]{64}$/);
      expect(result).toHaveProperty("channel_data");
      expect(result.channel_data).toBe(channelData);
    });
  });

  describe("getChannels", () => {
    it("should send GET request to channels endpoint", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            channels: [
              { name: "channel-1", subscription_count: 5 },
              { name: "channel-2", subscription_count: 3 },
            ],
          }),
      });

      const client = new Apinator(options);
      const channels = await client.getChannels();

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0];

      expect(url).toBe("https://ws-eu.apinator.io/apps/test-app-id/channels");
      expect(init.method).toBe("GET");
      expect(init.headers["X-Realtime-Key"]).toBe("test-key");
      expect(init.headers["X-Realtime-Timestamp"]).toBeDefined();
      expect(init.headers["X-Realtime-Signature"]).toBeDefined();

      expect(channels).toHaveLength(2);
      expect(channels[0].name).toBe("channel-1");
      expect(channels[0].subscription_count).toBe(5);
    });

    it("should send GET request with prefix filter", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            channels: [{ name: "private-chat", subscription_count: 2 }],
          }),
      });

      const client = new Apinator(options);
      await client.getChannels("private-");

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url] = fetchMock.mock.calls[0];

      expect(url).toBe(
        "https://ws-eu.apinator.io/apps/test-app-id/channels?filter_by_prefix=private-"
      );
    });

    it("should URL encode prefix parameter", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ channels: [] }),
      });

      const client = new Apinator(options);
      await client.getChannels("test channel");

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url] = fetchMock.mock.calls[0];

      expect(url).toContain("filter_by_prefix=test%20channel");
    });
  });

  describe("getChannel", () => {
    it("should send GET request to specific channel endpoint", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({ name: "test-channel", subscription_count: 10 }),
      });

      const client = new Apinator(options);
      const channel = await client.getChannel("test-channel");

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0];

      expect(url).toBe(
        "https://ws-eu.apinator.io/apps/test-app-id/channels/test-channel"
      );
      expect(init.method).toBe("GET");

      expect(channel.name).toBe("test-channel");
      expect(channel.subscription_count).toBe(10);
    });

    it("should URL encode channel name", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({ name: "test channel", subscription_count: 5 }),
      });

      const client = new Apinator(options);
      await client.getChannel("test channel");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain("channels/test%20channel");
    });

    it("should throw ApiError on 404 response", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () =>
          JSON.stringify({
            type: "https://docs.apinator.io/problems/not_found",
            title: "Not Found",
            status: 404,
            detail: "Channel not found",
            code: "not_found",
          }),
      });

      const client = new Apinator(options);

      await expect(client.getChannel("nonexistent")).rejects.toThrow(ApiError);
    });
  });

  describe("verifyWebhook", () => {
    const webhookSecret =
      "whsec_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const body =
      '{"id":"cbb368a1-bc93-42bc-b939-51c7352cbd03","event":"member_added","app_id":"test-app-id","channel":"presence-room","user_id":"42","time_ms":1760000000000}';

    function signedHeaders(secret: string, timestamp: string) {
      const crypto = require("crypto");
      const signature = crypto
        .createHmac("sha256", secret)
        .update(`${timestamp}.${body}`, "utf8")
        .digest("hex");
      return {
        "x-realtime-signature": `sha256=${signature}`,
        "x-realtime-timestamp": timestamp,
      };
    }

    it("should verify a webhook signed with the webhook secret", () => {
      const client = new Apinator(options);
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const result = client.verifyWebhook(
        webhookSecret,
        signedHeaders(webhookSecret, timestamp),
        body,
        300
      );
      expect(result).toBe(true);
    });

    it("should not use the client's API secret", () => {
      const client = new Apinator(options);
      const timestamp = Math.floor(Date.now() / 1000).toString();

      // Signed with the API secret: must not verify against the webhook secret.
      const result = client.verifyWebhook(
        webhookSecret,
        signedHeaders(options.secret, timestamp),
        body
      );
      expect(result).toBe(false);
    });

    it("should reject invalid webhook signature", () => {
      const client = new Apinator(options);

      const timestamp = Math.floor(Date.now() / 1000).toString();

      const headers = {
        "x-realtime-signature": "sha256=invalid",
        "x-realtime-timestamp": timestamp,
      };

      const result = client.verifyWebhook(webhookSecret, headers, body);
      expect(result).toBe(false);
    });

    it("should respect maxAge parameter", () => {
      const client = new Apinator(options);
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString();
      const headers = signedHeaders(webhookSecret, oldTimestamp);

      expect(client.verifyWebhook(webhookSecret, headers, body)).toBe(true);
      expect(client.verifyWebhook(webhookSecret, headers, body, 300)).toBe(false);
    });

    it("should reject a timestamp more than 300s in the future", () => {
      const client = new Apinator(options);
      const futureTimestamp = (Math.floor(Date.now() / 1000) + 600).toString();
      const headers = signedHeaders(webhookSecret, futureTimestamp);

      expect(client.verifyWebhook(webhookSecret, headers, body, 300)).toBe(false);
    });

    it("should throw when the webhook secret is missing", () => {
      const client = new Apinator(options);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const headers = signedHeaders(webhookSecret, timestamp);

      expect(() => client.verifyWebhook("", headers, body)).toThrow(ValidationError);
      // Old call shape (headers first) from untyped JavaScript.
      const legacyCall = client.verifyWebhook as unknown as (
        ...args: unknown[]
      ) => boolean;
      expect(() => legacyCall.call(client, headers, body, 300)).toThrow(ValidationError);
    });
  });
});
