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

#### `verifyWebhook(headers, body, maxAge?): boolean`

Verify webhook signature.

Accepted header shape:

```ts
Record<string, string | string[] | undefined>
```

## Errors

- `RealtimeError`
- `AuthenticationError`
- `ValidationError`
- `ApiError` (includes `status` and `body`)
