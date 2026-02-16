import { describe, it, expect } from "vitest";
import { signRequest, signChannel, signWebhookPayload, md5Hex } from "../src/crypto";

describe("crypto", () => {
  const secret = "my-secret-key";

  describe("md5Hex", () => {
    it("should compute MD5 hash of string", () => {
      const hash = md5Hex("hello");
      expect(hash).toBe("5d41402abc4b2a76b9719d911017c592");
    });

    it("should compute MD5 hash of empty string", () => {
      const hash = md5Hex("");
      expect(hash).toBe("d41d8cd98f00b204e9800998ecf8427e");
    });

    it("should compute MD5 hash of JSON", () => {
      const hash = md5Hex('{"name":"test"}');
      expect(hash).toBe("2b895b6efaa28b818284e5c696a18799");
    });
  });

  describe("signRequest", () => {
    it("should sign request with empty body", () => {
      const method = "GET";
      const path = "/apps/123/channels";
      const body = "";
      const timestamp = 1700000000;

      const signature = signRequest(secret, method, path, body, timestamp);

      // With empty body, bodyMD5 should be "" (not md5 of empty bytes)
      // sigString = "1700000000\nGET\n/apps/123/channels\n"
      expect(signature).toBe("ef64acd57f8011c92968cb57c875ed59c06adc5b4bc7f1aed04f739bd1856e34");
    });

    it("should sign request with body", () => {
      const method = "POST";
      const path = "/apps/123/events";
      const body = '{"name":"test"}';
      const timestamp = 1700000000;

      const signature = signRequest(secret, method, path, body, timestamp);

      // bodyMD5 = md5('{"name":"test"}') = "2b895b6efaa28b818284e5c696a18799"
      // sigString = "1700000000\nPOST\n/apps/123/events\n2b895b6efaa28b818284e5c696a18799"
      expect(signature).toBe("b4e3bd1aa726fe02d0c28b4316e7e1d507d11971fea0f5cfd3cd71b101dc325c");
    });

    it("should produce deterministic signatures", () => {
      const method = "POST";
      const path = "/apps/123/events";
      const body = '{"name":"test"}';
      const timestamp = 1700000000;

      const sig1 = signRequest(secret, method, path, body, timestamp);
      const sig2 = signRequest(secret, method, path, body, timestamp);

      expect(sig1).toBe(sig2);
    });

    it("should produce different signatures for different secrets", () => {
      const method = "POST";
      const path = "/apps/123/events";
      const body = '{"name":"test"}';
      const timestamp = 1700000000;

      const sig1 = signRequest("secret1", method, path, body, timestamp);
      const sig2 = signRequest("secret2", method, path, body, timestamp);

      expect(sig1).not.toBe(sig2);
    });

    it("should produce different signatures for different timestamps", () => {
      const method = "POST";
      const path = "/apps/123/events";
      const body = '{"name":"test"}';

      const sig1 = signRequest(secret, method, path, body, 1700000000);
      const sig2 = signRequest(secret, method, path, body, 1700000001);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe("signChannel", () => {
    it("should sign private channel without channel data", () => {
      const socketId = "12345.67890";
      const channelName = "private-chat";

      const signature = signChannel(secret, socketId, channelName);

      // sigString = "12345.67890:private-chat"
      expect(signature).toBe("a938cf2c05ce33130efb37b4b730d4e3c0a5bef21ce68604d87684efdcb68ec3");
    });

    it("should sign presence channel with channel data", () => {
      const socketId = "12345.67890";
      const channelName = "presence-chat";
      const channelData = '{"user_id":"user1"}';

      const signature = signChannel(secret, socketId, channelName, channelData);

      // sigString = "12345.67890:presence-chat:{"user_id":"user1"}"
      expect(signature).toBe("34138811c35c4adda7a7e76f03ce5d54908df7d2b51748081b405a8df4f1a217");
    });

    it("should produce deterministic signatures", () => {
      const socketId = "12345.67890";
      const channelName = "private-chat";

      const sig1 = signChannel(secret, socketId, channelName);
      const sig2 = signChannel(secret, socketId, channelName);

      expect(sig1).toBe(sig2);
    });

    it("should produce different signatures for different socket IDs", () => {
      const channelName = "private-chat";

      const sig1 = signChannel(secret, "12345.67890", channelName);
      const sig2 = signChannel(secret, "99999.11111", channelName);

      expect(sig1).not.toBe(sig2);
    });

    it("should produce different signatures for different channel names", () => {
      const socketId = "12345.67890";

      const sig1 = signChannel(secret, socketId, "private-chat");
      const sig2 = signChannel(secret, socketId, "private-room");

      expect(sig1).not.toBe(sig2);
    });
  });

  describe("signWebhookPayload", () => {
    it("should sign webhook payload", () => {
      const timestamp = "1700000000";
      const payload = '{"event":"channel_occupied","channel":"test"}';

      const signature = signWebhookPayload(secret, timestamp, payload);

      // input = "1700000000.{\"event\":\"channel_occupied\",\"channel\":\"test\"}"
      expect(signature).toBe("79bbc868f72034bf5d7ea77727d6c705f0edc6de24bdcb51dd52ca05c11617f8");
    });

    it("should produce deterministic signatures", () => {
      const timestamp = "1700000000";
      const payload = '{"event":"channel_occupied"}';

      const sig1 = signWebhookPayload(secret, timestamp, payload);
      const sig2 = signWebhookPayload(secret, timestamp, payload);

      expect(sig1).toBe(sig2);
    });

    it("should produce different signatures for different timestamps", () => {
      const payload = '{"event":"channel_occupied"}';

      const sig1 = signWebhookPayload(secret, "1700000000", payload);
      const sig2 = signWebhookPayload(secret, "1700000001", payload);

      expect(sig1).not.toBe(sig2);
    });

    it("should produce different signatures for different payloads", () => {
      const timestamp = "1700000000";

      const sig1 = signWebhookPayload(secret, timestamp, '{"event":"channel_occupied"}');
      const sig2 = signWebhookPayload(secret, timestamp, '{"event":"channel_vacated"}');

      expect(sig1).not.toBe(sig2);
    });
  });
});
