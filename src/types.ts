/**
 * Configuration options for the Realtime client.
 */
export interface RealtimeOptions {
  /** Application ID */
  appId: string;
  /** API key */
  key: string;
  /** API secret */
  secret: string;
  /** Cluster region identifier (e.g. "eu", "us") */
  cluster: string;
}

/**
 * Parameters for triggering an event.
 */
export interface TriggerParams {
  /** Event name */
  name: string;
  /** Single channel name (mutually exclusive with channels) */
  channel?: string;
  /** Multiple channel names (mutually exclusive with channel) */
  channels?: string[];
  /** Event data as JSON string */
  data: string;
  /** Optional socket ID to exclude from receiving the event */
  socketId?: string;
}

/**
 * Response from channel authentication.
 */
export interface ChannelAuthResponse {
  /** Authentication signature in format "key:signature" */
  auth: string;
  /** Optional channel data for presence channels */
  channel_data?: string;
}

/**
 * Information about a channel.
 */
export interface ChannelInfo {
  /** Channel name */
  name: string;
  /** Number of active subscriptions */
  subscription_count: number;
}

/**
 * Webhook event data.
 */
export interface WebhookEvent {
  /** HTTP headers from the webhook request */
  headers: Record<string, string | string[] | undefined>;
  /** Raw request body */
  body: string;
}
