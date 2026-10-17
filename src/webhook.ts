import { timingSafeEqual } from "crypto";
import { signWebhookPayload } from "./crypto";

/**
 * How far in the future (in seconds) a webhook timestamp may be before it is
 * rejected, when a `maxAge` is given. Allows for clock skew between the
 * Apinator servers and the receiver.
 */
export const WEBHOOK_MAX_FUTURE_SKEW_SECONDS = 300;

/**
 * Verify the authenticity of a webhook request.
 *
 * This function verifies that the webhook was sent by Apinator by validating
 * the `X-Realtime-Signature` header:
 * `sha256=hex(hmac_sha256(secret, "{timestamp}.{raw_body}"))`.
 *
 * @param secret - The webhook endpoint's signing secret (`whsec_...`, shown in
 *   the console for each webhook endpoint). This is NOT the app's API secret.
 * @param headers - HTTP headers from the webhook request (case-insensitive keys;
 *   array values use the first entry)
 * @param body - Raw request body as string, exactly as received
 * @param maxAge - Optional maximum age in seconds for the webhook timestamp
 *   (300 recommended). When set, timestamps older than `maxAge` or more than
 *   300 seconds in the future are rejected.
 * @returns true if the webhook is valid, false otherwise
 *
 * @example
 * ```ts
 * // Express.js webhook handler
 * app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
 *   const headers = req.headers;
 *   const body = req.body.toString('utf8');
 *
 *   if (!verifyWebhook(process.env.APINATOR_WEBHOOK_SECRET!, headers, body, 300)) {
 *     return res.status(401).send('Invalid signature');
 *   }
 *
 *   // Process webhook
 *   const event = JSON.parse(body);
 *   // ...
 * });
 * ```
 */
export function verifyWebhook(
  secret: string,
  headers: Record<string, string | string[] | undefined>,
  body: string,
  maxAge?: number
): boolean {
  // Extract signature from X-Realtime-Signature header (case-insensitive)
  const signatureHeader = getHeaderCaseInsensitive(
    headers,
    "x-realtime-signature"
  );
  if (!signatureHeader) {
    return false;
  }

  // Strip "sha256=" prefix if present
  const actualSignature = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;

  // Extract timestamp from X-Realtime-Timestamp header (case-insensitive)
  const timestamp = getHeaderCaseInsensitive(headers, "x-realtime-timestamp");
  if (!timestamp) {
    return false;
  }

  // If maxAge provided, check timestamp is within maxAge in the past and
  // within the allowed clock skew in the future
  if (maxAge !== undefined) {
    const webhookTime = parseInt(timestamp, 10);
    if (isNaN(webhookTime)) {
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const age = currentTime - webhookTime;

    if (age > maxAge || -age > WEBHOOK_MAX_FUTURE_SKEW_SECONDS) {
      return false;
    }
  }

  // Compute expected signature
  const expectedSignature = signWebhookPayload(secret, timestamp, body);

  // Timing-safe comparison
  try {
    const actualBuffer = Buffer.from(actualSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    // Both buffers must be same length for timingSafeEqual
    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Get header value with case-insensitive key lookup.
 */
function getHeaderCaseInsensitive(
  headers: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const lowerKey = key.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lowerKey) {
      if (typeof v === "string") {
        return v;
      }
      if (Array.isArray(v)) {
        return v.find((entry): entry is string => typeof entry === "string");
      }
      return undefined;
    }
  }
  return undefined;
}
