import { createHmac, createHash } from "crypto";

/**
 * Compute MD5 hash of data and return as hex string.
 */
export function md5Hex(data: string): string {
  return createHash("md5").update(data, "utf8").digest("hex");
}

/**
 * Sign an API request using HMAC-SHA256.
 *
 * @param secret - API secret
 * @param method - HTTP method (e.g., "POST", "GET")
 * @param path - Request path (e.g., "/apps/123/events")
 * @param body - Request body as string
 * @param timestamp - Unix timestamp in seconds
 * @returns HMAC signature as hex string
 */
export function signRequest(
  secret: string,
  method: string,
  path: string,
  body: string,
  timestamp: number
): string {
  // If body is empty string, bodyMD5 = "" (NOT md5 of empty bytes)
  const bodyMD5 = body === "" ? "" : md5Hex(body);

  // sigString = ${timestamp}\n${method}\n${path}\n${bodyMD5}
  const sigString = `${timestamp}\n${method}\n${path}\n${bodyMD5}`;

  // Return hex(hmac-sha256(secret, sigString))
  return createHmac("sha256", secret).update(sigString, "utf8").digest("hex");
}

/**
 * Sign a channel authentication request using HMAC-SHA256.
 *
 * @param secret - API secret
 * @param socketId - WebSocket connection socket ID
 * @param channelName - Channel name to authenticate
 * @param channelData - Optional channel data for presence channels (JSON string)
 * @returns HMAC signature as hex string
 */
export function signChannel(
  secret: string,
  socketId: string,
  channelName: string,
  channelData?: string
): string {
  // sigString = ${socketId}:${channelName} or ${socketId}:${channelName}:${channelData}
  const sigString = channelData
    ? `${socketId}:${channelName}:${channelData}`
    : `${socketId}:${channelName}`;

  // Return hex(hmac-sha256(secret, sigString))
  return createHmac("sha256", secret).update(sigString, "utf8").digest("hex");
}

/**
 * Sign a webhook payload using HMAC-SHA256.
 *
 * @param secret - Webhook secret
 * @param timestamp - Timestamp from X-Realtime-Timestamp header
 * @param payload - Raw webhook body
 * @returns HMAC signature as hex string
 */
export function signWebhookPayload(
  secret: string,
  timestamp: string,
  payload: string
): string {
  // input = ${timestamp}.${payload} (dot-separated)
  const input = `${timestamp}.${payload}`;

  // Return hex(hmac-sha256(secret, input))
  return createHmac("sha256", secret).update(input, "utf8").digest("hex");
}
