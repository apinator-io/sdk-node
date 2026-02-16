/**
 * @apinator/server - Node.js server SDK for Apinator
 *
 * This package provides a server-side SDK for interacting with the Apinator API.
 * It supports triggering events, authenticating channel subscriptions, managing channels,
 * and verifying webhook signatures.
 *
 * @example Basic usage
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
 * ```
 *
 * @packageDocumentation
 */

export { Apinator } from "./client";
export { authenticateChannel } from "./auth";
export { verifyWebhook } from "./webhook";
export {
  signRequest,
  signChannel,
  signWebhookPayload,
  md5Hex,
} from "./crypto";

export type {
  RealtimeOptions,
  TriggerParams,
  ChannelAuthResponse,
  ChannelInfo,
  WebhookEvent,
} from "./types";

export {
  RealtimeError,
  AuthenticationError,
  ValidationError,
  ApiError,
} from "./errors";
