import { describe, it, expect } from "vitest";
import { authenticateChannel } from "../src/auth";

describe("auth", () => {
  const secret = "my-secret-key";
  const key = "my-key";

  describe("authenticateChannel", () => {
    it("should return auth with correct format for private channel", () => {
      const socketId = "12345.67890";
      const channelName = "private-chat";

      const result = authenticateChannel(secret, key, socketId, channelName);

      expect(result).toHaveProperty("auth");
      expect(result.auth).toMatch(/^my-key:[a-f0-9]{64}$/);
      expect(result).not.toHaveProperty("channel_data");
    });

    it("should return auth with channel_data for presence channel", () => {
      const socketId = "12345.67890";
      const channelName = "presence-chat";
      const channelData = '{"user_id":"user1"}';

      const result = authenticateChannel(secret, key, socketId, channelName, channelData);

      expect(result).toHaveProperty("auth");
      expect(result.auth).toMatch(/^my-key:[a-f0-9]{64}$/);
      expect(result).toHaveProperty("channel_data");
      expect(result.channel_data).toBe(channelData);
    });

    it("should produce deterministic auth signatures", () => {
      const socketId = "12345.67890";
      const channelName = "private-chat";

      const result1 = authenticateChannel(secret, key, socketId, channelName);
      const result2 = authenticateChannel(secret, key, socketId, channelName);

      expect(result1.auth).toBe(result2.auth);
    });

    it("should include key in auth string", () => {
      const socketId = "12345.67890";
      const channelName = "private-chat";

      const result = authenticateChannel(secret, key, socketId, channelName);

      expect(result.auth).toContain(key);
      expect(result.auth.startsWith(`${key}:`)).toBe(true);
    });

    it("should produce different signatures for different secrets", () => {
      const socketId = "12345.67890";
      const channelName = "private-chat";

      const result1 = authenticateChannel("secret1", key, socketId, channelName);
      const result2 = authenticateChannel("secret2", key, socketId, channelName);

      expect(result1.auth).not.toBe(result2.auth);
    });

    it("should produce different signatures for different socket IDs", () => {
      const channelName = "private-chat";

      const result1 = authenticateChannel(secret, key, "12345.67890", channelName);
      const result2 = authenticateChannel(secret, key, "99999.11111", channelName);

      expect(result1.auth).not.toBe(result2.auth);
    });

    it("should produce different signatures for different channel names", () => {
      const socketId = "12345.67890";

      const result1 = authenticateChannel(secret, key, socketId, "private-chat");
      const result2 = authenticateChannel(secret, key, socketId, "private-room");

      expect(result1.auth).not.toBe(result2.auth);
    });

    it("should handle presence channel data correctly", () => {
      const socketId = "12345.67890";
      const channelName = "presence-chat";
      const channelData1 = '{"user_id":"user1"}';
      const channelData2 = '{"user_id":"user2"}';

      const result1 = authenticateChannel(secret, key, socketId, channelName, channelData1);
      const result2 = authenticateChannel(secret, key, socketId, channelName, channelData2);

      // Different channel data should produce different signatures
      expect(result1.auth).not.toBe(result2.auth);
      expect(result1.channel_data).toBe(channelData1);
      expect(result2.channel_data).toBe(channelData2);
    });
  });
});
