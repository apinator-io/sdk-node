import { describe, it, expect } from "vitest";
import { verifyWebhook } from "../src/webhook";
import { signWebhookPayload } from "../src/crypto";

describe("webhook", () => {
  const secret = "my-secret-key";

  describe("verifyWebhook", () => {
    it("should return true for valid signature", () => {
      const timestamp = "1700000000";
      const body = '{"event":"channel_occupied","channel":"test"}';
      const signature = signWebhookPayload(secret, timestamp, body);

      const headers = {
        "x-realtime-signature": `sha256=${signature}`,
        "x-realtime-timestamp": timestamp,
      };

      const result = verifyWebhook(secret, headers, body);
      expect(result).toBe(true);
    });

    it("should return true for valid signature without sha256 prefix", () => {
      const timestamp = "1700000000";
      const body = '{"event":"channel_occupied","channel":"test"}';
      const signature = signWebhookPayload(secret, timestamp, body);

      const headers = {
        "x-realtime-signature": signature,
        "x-realtime-timestamp": timestamp,
      };

      const result = verifyWebhook(secret, headers, body);
      expect(result).toBe(true);
    });

    it("should return false for tampered body", () => {
      const timestamp = "1700000000";
      const body = '{"event":"channel_occupied","channel":"test"}';
      const signature = signWebhookPayload(secret, timestamp, body);

      const headers = {
        "x-realtime-signature": `sha256=${signature}`,
        "x-realtime-timestamp": timestamp,
      };

      const tamperedBody = '{"event":"channel_vacated","channel":"test"}';
      const result = verifyWebhook(secret, headers, tamperedBody);
      expect(result).toBe(false);
    });

    it("should return false for wrong secret", () => {
      const timestamp = "1700000000";
      const body = '{"event":"channel_occupied","channel":"test"}';
      const signature = signWebhookPayload(secret, timestamp, body);

      const headers = {
        "x-realtime-signature": `sha256=${signature}`,
        "x-realtime-timestamp": timestamp,
      };

      const result = verifyWebhook("wrong-secret", headers, body);
      expect(result).toBe(false);
    });

    it("should return false for missing signature header", () => {
      const timestamp = "1700000000";
      const body = '{"event":"channel_occupied","channel":"test"}';

      const headers = {
        "x-realtime-timestamp": timestamp,
      };

      const result = verifyWebhook(secret, headers, body);
      expect(result).toBe(false);
    });

    it("should return false for missing timestamp header", () => {
      const timestamp = "1700000000";
      const body = '{"event":"channel_occupied","channel":"test"}';
      const signature = signWebhookPayload(secret, timestamp, body);

      const headers = {
        "x-realtime-signature": `sha256=${signature}`,
      };

      const result = verifyWebhook(secret, headers, body);
      expect(result).toBe(false);
    });

    it("should handle case-insensitive headers", () => {
      const timestamp = "1700000000";
      const body = '{"event":"channel_occupied","channel":"test"}';
      const signature = signWebhookPayload(secret, timestamp, body);

      const headers = {
        "X-Realtime-Signature": `sha256=${signature}`,
        "X-Realtime-Timestamp": timestamp,
      };

      const result = verifyWebhook(secret, headers, body);
      expect(result).toBe(true);
    });

    it("should handle mixed case headers", () => {
      const timestamp = "1700000000";
      const body = '{"event":"channel_occupied","channel":"test"}';
      const signature = signWebhookPayload(secret, timestamp, body);

      const headers = {
        "X-ReAlTiMe-SiGnAtUrE": `sha256=${signature}`,
        "x-REALTIME-timestamp": timestamp,
      };

      const result = verifyWebhook(secret, headers, body);
      expect(result).toBe(true);
    });

    it("should handle array-valued headers from Node frameworks", () => {
      const timestamp = "1700000000";
      const body = '{"event":"channel_occupied","channel":"test"}';
      const signature = signWebhookPayload(secret, timestamp, body);

      const headers = {
        "x-realtime-signature": [`sha256=${signature}`],
        "x-realtime-timestamp": [timestamp],
      };

      const result = verifyWebhook(secret, headers, body);
      expect(result).toBe(true);
    });

    describe("with maxAge", () => {
      it("should return true for timestamp within maxAge", () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const timestamp = (currentTime - 100).toString(); // 100 seconds ago
        const body = '{"event":"channel_occupied","channel":"test"}';
        const signature = signWebhookPayload(secret, timestamp, body);

        const headers = {
          "x-realtime-signature": `sha256=${signature}`,
          "x-realtime-timestamp": timestamp,
        };

        const result = verifyWebhook(secret, headers, body, 300); // maxAge 300 seconds
        expect(result).toBe(true);
      });

      it("should return false for expired timestamp", () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const timestamp = (currentTime - 400).toString(); // 400 seconds ago
        const body = '{"event":"channel_occupied","channel":"test"}';
        const signature = signWebhookPayload(secret, timestamp, body);

        const headers = {
          "x-realtime-signature": `sha256=${signature}`,
          "x-realtime-timestamp": timestamp,
        };

        const result = verifyWebhook(secret, headers, body, 300); // maxAge 300 seconds
        expect(result).toBe(false);
      });

      it("should return false for future timestamp", () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const timestamp = (currentTime + 100).toString(); // 100 seconds in the future
        const body = '{"event":"channel_occupied","channel":"test"}';
        const signature = signWebhookPayload(secret, timestamp, body);

        const headers = {
          "x-realtime-signature": `sha256=${signature}`,
          "x-realtime-timestamp": timestamp,
        };

        const result = verifyWebhook(secret, headers, body, 300);
        expect(result).toBe(false);
      });

      it("should return false for invalid timestamp", () => {
        const timestamp = "not-a-number";
        const body = '{"event":"channel_occupied","channel":"test"}';
        const signature = signWebhookPayload(secret, timestamp, body);

        const headers = {
          "x-realtime-signature": `sha256=${signature}`,
          "x-realtime-timestamp": timestamp,
        };

        const result = verifyWebhook(secret, headers, body, 300);
        expect(result).toBe(false);
      });
    });

    it("should return false for invalid signature format", () => {
      const timestamp = "1700000000";
      const body = '{"event":"channel_occupied","channel":"test"}';

      const headers = {
        "x-realtime-signature": "not-a-hex-string",
        "x-realtime-timestamp": timestamp,
      };

      const result = verifyWebhook(secret, headers, body);
      expect(result).toBe(false);
    });

    it("should return false for mismatched signature length", () => {
      const timestamp = "1700000000";
      const body = '{"event":"channel_occupied","channel":"test"}';

      const headers = {
        "x-realtime-signature": "abc123", // Too short
        "x-realtime-timestamp": timestamp,
      };

      const result = verifyWebhook(secret, headers, body);
      expect(result).toBe(false);
    });
  });
});
