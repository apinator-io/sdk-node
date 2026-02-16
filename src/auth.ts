import { signChannel } from "./crypto";
import type { ChannelAuthResponse } from "./types";

/**
 * Authenticate a channel subscription request.
 *
 * This generates the authentication signature required for private and presence channels.
 * The returned auth string should be sent back to the client for channel subscription.
 *
 * @param secret - API secret
 * @param key - API key
 * @param socketId - WebSocket connection socket ID from the client
 * @param channelName - Channel name to authenticate
 * @param channelData - Optional channel data for presence channels (JSON string with user info)
 * @returns Channel authentication response with auth signature
 *
 * @example
 * ```ts
 * const authResponse = authenticateChannel(
 *   "my-secret",
 *   "my-key",
 *   "12345.67890",
 *   "private-chat"
 * );
 * // Returns: { auth: "my-key:abc123..." }
 * ```
 *
 * @example Presence channel with user data
 * ```ts
 * const authResponse = authenticateChannel(
 *   "my-secret",
 *   "my-key",
 *   "12345.67890",
 *   "presence-room",
 *   JSON.stringify({ user_id: "user1", user_info: { name: "Alice" } })
 * );
 * // Returns: { auth: "my-key:abc123...", channel_data: "..." }
 * ```
 */
export function authenticateChannel(
  secret: string,
  key: string,
  socketId: string,
  channelName: string,
  channelData?: string
): ChannelAuthResponse {
  const signature = signChannel(secret, socketId, channelName, channelData);

  const response: ChannelAuthResponse = {
    auth: `${key}:${signature}`,
  };

  if (channelData !== undefined) {
    response.channel_data = channelData;
  }

  return response;
}
