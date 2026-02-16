import { signRequest } from "./crypto";
import { authenticateChannel as authChannel } from "./auth";
import { verifyWebhook as verifyWebhookSignature } from "./webhook";
import {
  ApiError,
  AuthenticationError,
  ValidationError,
  RealtimeError,
} from "./errors";
import type {
  RealtimeOptions,
  TriggerParams,
  ChannelAuthResponse,
  ChannelInfo,
} from "./types";

type ProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  details?: unknown;
};

/**
 * Server-side client for triggering events and managing channels.
 *
 * @example
 * ```ts
 * import { Apinator } from '@apinator/server';
 *
 * const client = new Apinator({
 *   appId: 'my-app-id',
 *   key: 'my-key',
 *   secret: 'my-secret',
 *   cluster: 'eu', // or 'us'
 * });
 *
 * // Trigger an event
 * await client.trigger({
 *   name: 'order-placed',
 *   channel: 'orders',
 *   data: JSON.stringify({ orderId: '123' }),
 * });
 *
 * // Authenticate a channel subscription
 * const auth = client.authenticateChannel(socketId, 'private-chat');
 *
 * // Get channel info
 * const channel = await client.getChannel('orders');
 * console.log(channel.subscription_count);
 * ```
 */
export class Apinator {
  private readonly appId: string;
  private readonly key: string;
  private readonly secret: string;
  private readonly host: string;

  constructor(options: RealtimeOptions) {
    this.appId = options.appId;
    this.key = options.key;
    this.secret = options.secret;
    this.host = `https://ws-${options.cluster}.apinator.io`;
  }

  /**
   * Trigger an event on one or more channels.
   *
   * @param params - Event parameters
   * @throws {ValidationError} If the request is invalid (400)
   * @throws {AuthenticationError} If authentication fails (401)
   * @throws {ApiError} For other API errors
   *
   * @example Single channel
   * ```ts
   * await client.trigger({
   *   name: 'message',
   *   channel: 'chat',
   *   data: JSON.stringify({ text: 'Hello!' }),
   * });
   * ```
   *
   * @example Multiple channels
   * ```ts
   * await client.trigger({
   *   name: 'notification',
   *   channels: ['user-1', 'user-2'],
   *   data: JSON.stringify({ message: 'New update' }),
   * });
   * ```
   *
   * @example Exclude socket
   * ```ts
   * await client.trigger({
   *   name: 'message',
   *   channel: 'chat',
   *   data: JSON.stringify({ text: 'Hello!' }),
   *   socketId: '12345.67890', // Don't send to this connection
   * });
   * ```
   */
  async trigger(params: TriggerParams): Promise<void> {
    // Validate mutually exclusive channel/channels
    if (params.channel && params.channels) {
      throw new ValidationError(
        "Cannot specify both 'channel' and 'channels' parameters"
      );
    }

    if (!params.channel && !params.channels) {
      throw new ValidationError(
        "Must specify either 'channel' or 'channels' parameter"
      );
    }

    // Build request body
    const body: Record<string, unknown> = {
      name: params.name,
      data: params.data,
    };

    if (params.channel) {
      body.channel = params.channel;
    }

    if (params.channels) {
      body.channels = params.channels;
    }

    if (params.socketId) {
      body.socket_id = params.socketId;
    }

    const bodyString = JSON.stringify(body);
    const path = `/apps/${this.appId}/events`;

    await this.request("POST", path, bodyString);
  }

  /**
   * Authenticate a channel subscription request.
   *
   * This generates the authentication signature required for private and presence channels.
   * The returned auth object should be sent back to the client for channel subscription.
   *
   * @param socketId - WebSocket connection socket ID from the client
   * @param channelName - Channel name to authenticate
   * @param channelData - Optional channel data for presence channels (JSON string with user info)
   * @returns Channel authentication response with auth signature
   *
   * @example Private channel
   * ```ts
   * const auth = client.authenticateChannel('12345.67890', 'private-chat');
   * // Send auth back to client
   * res.json(auth);
   * ```
   *
   * @example Presence channel
   * ```ts
   * const channelData = JSON.stringify({
   *   user_id: 'user1',
   *   user_info: { name: 'Alice' }
   * });
   * const auth = client.authenticateChannel('12345.67890', 'presence-room', channelData);
   * res.json(auth);
   * ```
   */
  authenticateChannel(
    socketId: string,
    channelName: string,
    channelData?: string
  ): ChannelAuthResponse {
    return authChannel(this.secret, this.key, socketId, channelName, channelData);
  }

  /**
   * Get a list of channels, optionally filtered by prefix.
   *
   * @param prefix - Optional prefix to filter channels (e.g., "private-", "presence-")
   * @returns Array of channel information
   * @throws {AuthenticationError} If authentication fails (401)
   * @throws {ApiError} For other API errors
   *
   * @example Get all channels
   * ```ts
   * const channels = await client.getChannels();
   * channels.forEach(ch => console.log(ch.name, ch.subscription_count));
   * ```
   *
   * @example Get presence channels only
   * ```ts
   * const presenceChannels = await client.getChannels('presence-');
   * ```
   */
  async getChannels(prefix?: string): Promise<ChannelInfo[]> {
    let path = `/apps/${this.appId}/channels`;

    if (prefix) {
      const encodedPrefix = encodeURIComponent(prefix);
      path += `?filter_by_prefix=${encodedPrefix}`;
    }

    const response = await this.request("GET", path, "");
    return response.channels as ChannelInfo[];
  }

  /**
   * Get information about a specific channel.
   *
   * @param channelName - Channel name
   * @returns Channel information
   * @throws {AuthenticationError} If authentication fails (401)
   * @throws {ApiError} For other API errors (including 404 if channel not found)
   *
   * @example
   * ```ts
   * try {
   *   const channel = await client.getChannel('chat');
   *   console.log(`Channel has ${channel.subscription_count} subscribers`);
   * } catch (err) {
   *   if (err instanceof ApiError && err.status === 404) {
   *     console.log('Channel not found');
   *   }
   * }
   * ```
   */
  async getChannel(channelName: string): Promise<ChannelInfo> {
    const encodedChannel = encodeURIComponent(channelName);
    const path = `/apps/${this.appId}/channels/${encodedChannel}`;

    const response = await this.request("GET", path, "");
    return response as ChannelInfo;
  }

  /**
   * Verify the authenticity of a webhook request.
   *
   * This function verifies that the webhook was sent by the Realtime service
   * by validating the HMAC signature in the request headers.
   *
   * @param headers - HTTP headers from the webhook request
   * @param body - Raw request body as string
   * @param maxAge - Optional maximum age in seconds for the webhook timestamp
   * @returns true if the webhook is valid, false otherwise
   *
   * @example Express.js webhook handler
   * ```ts
   * app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
   *   const body = req.body.toString('utf8');
   *
   *   if (!client.verifyWebhook(req.headers, body, 300)) {
   *     return res.status(401).send('Invalid signature');
   *   }
   *
   *   const event = JSON.parse(body);
   *   // Process webhook...
   * });
   * ```
   */
  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: string,
    maxAge?: number
  ): boolean {
    return verifyWebhookSignature(this.secret, headers, body, maxAge);
  }

  /**
   * Make an authenticated API request.
   */
  private async request(
    method: string,
    path: string,
    body: string
  ): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000);
    // Sign only the path portion (before query string) — server uses r.URL.Path
    const [signPath] = path.split("?");
    const signature = signRequest(this.secret, method, signPath, body, timestamp);

    const url = `${this.host}${path}`;
    const headers: Record<string, string> = {
      "X-Realtime-Key": this.key,
      "X-Realtime-Timestamp": timestamp.toString(),
      "X-Realtime-Signature": signature,
    };

    if (body !== "") {
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body !== "" ? body : undefined,
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = responseText;
        let problem: ProblemDetails | null = null;
        try {
          problem = JSON.parse(responseText) as ProblemDetails;
          if (typeof problem.detail === "string" && problem.detail.length > 0) {
            errorMessage = problem.detail;
          } else if (typeof problem.title === "string" && problem.title.length > 0) {
            errorMessage = problem.title;
          }
        } catch {
          problem = null;
        }

        if (response.status === 401 || response.status === 403) {
          throw new AuthenticationError(
            errorMessage || "Authentication failed"
          );
        }

        if (response.status === 400 || response.status === 422) {
          throw new ValidationError(errorMessage || "Validation failed");
        }

        throw new ApiError(
          errorMessage || `Request failed with status ${response.status}`,
          response.status,
          responseText
        );
      }

      // Parse successful response
      if (responseText === "") {
        return {};
      }

      try {
        return JSON.parse(responseText);
      } catch {
        throw new RealtimeError(`Failed to parse response: ${responseText}`);
      }
    } catch (error) {
      // Re-throw our custom errors
      if (
        error instanceof ApiError ||
        error instanceof AuthenticationError ||
        error instanceof ValidationError ||
        error instanceof RealtimeError
      ) {
        throw error;
      }

      // Wrap network errors
      throw new RealtimeError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
