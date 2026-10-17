# API Reference

## Apinator

### Constructor

```ts
new Apinator(options: RealtimeOptions)
```

`RealtimeOptions`:

- `appId: string` (required)
- `key: string` (required)
- `secret: string` (required)
- `cluster: string` (required) — region identifier, e.g. `"eu"`, `"us"`

### Methods

#### `trigger(params: TriggerParams): Promise<void>`

Trigger an event to one or many channels.

`TriggerParams`:
- `name: string`
- `data: string` (JSON string)
- `channel?: string` (mutually exclusive with `channels`)
- `channels?: string[]` (mutually exclusive with `channel`)
- `socketId?: string`

#### `authenticateChannel(socketId, channelName, channelData?): ChannelAuthResponse`

Build auth payload for private/presence subscriptions.

Returns:
- `auth: string`
- `channel_data?: string`

#### `getChannels(prefix?: string): Promise<ChannelInfo[]>`

List channels, optionally filtered by prefix.

#### `getChannel(channelName: string): Promise<ChannelInfo>`

Get channel details.

#### `verifyWebhook(webhookSecret, headers, body, maxAge?): boolean`

Verify a webhook delivery's signature.

- `webhookSecret: string` — the webhook endpoint's signing secret (`whsec_...`,
  shown in the console per endpoint). Not the app's API secret. Throws
  `ValidationError` if empty.
- `headers` — request headers (case-insensitive; array values use the first entry):

  ```ts
  Record<string, string | string[] | undefined>
  ```

- `body: string` — raw request body, exactly as received.
- `maxAge?: number` — recommended `300`. When set, timestamps older than `maxAge`
  seconds or more than 300 seconds in the future are rejected.

The signature is `X-Realtime-Signature: sha256=hex(hmac_sha256(webhookSecret, "{timestamp}.{raw_body}"))`
with the timestamp from `X-Realtime-Timestamp`. Deliveries also carry
`X-Realtime-Event` and `X-Realtime-Delivery-ID`.

Payload:

```json
{"id":"<event uuid>","event":"member_added","app_id":"...","channel":"presence-room","user_id":"42","time_ms":1760000000000}
```

`event` is one of `channel_occupied`, `channel_vacated`, `member_added`,
`member_removed` (`user_id` only on the member events); the console's test sends
`webhook.test`. Deliveries are at-least-once, so dedupe on `id`.

## Standalone functions

#### `verifyWebhook(secret, headers, body, maxAge?): boolean`

Same check as the client method, without a client. `secret` is the webhook
signing secret.

## Errors

- `RealtimeError`
- `AuthenticationError`
- `ValidationError`
- `ApiError` (includes `status` and `body`)
