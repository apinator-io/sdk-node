# @apinator/server

[![npm version](https://img.shields.io/npm/v/@apinator/server.svg)](https://www.npmjs.com/package/@apinator/server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/apinator-io/sdk-node/test.yml?label=CI)](https://github.com/apinator-io/sdk-node/actions/workflows/test.yml)

Node.js server SDK for [Apinator](https://apinator.io).

Use this package to:
- trigger events to channels
- generate private/presence channel auth payloads
- verify webhook signatures

## Installation

```bash
npm install @apinator/server
```

## Quick Start

```ts
import { Apinator } from "@apinator/server";

const client = new Apinator({
  appId: process.env.APINATOR_APP_ID!,
  key: process.env.APINATOR_KEY!,
  secret: process.env.APINATOR_SECRET!,
  cluster: "eu", // or "us"
  // host: "http://localhost:8081", // optional: a local or self-hosted data plane
});

await client.trigger({
  name: "order-created",
  channel: "orders",
  data: JSON.stringify({ orderId: "ord_123" }),
});
```

## Cache Channels

Publish to a channel named `cache-`, `private-cache-` or `presence-cache-` and Apinator keeps
the last event for 30 minutes, so a client that subscribes after the publish still receives it.
Nothing else changes: trigger as usual, and authorize private and presence cache channels like
any other private or presence channel.

```ts
await client.trigger({
  name: "job-finished",
  channel: `private-cache-job-${jobId}`,
  data: JSON.stringify({ status: "done" }),
});
```

## Channel Auth (Private/Presence)

```ts
import { Apinator } from "@apinator/server";

const client = new Apinator({
  appId: process.env.APINATOR_APP_ID!,
  key: process.env.APINATOR_KEY!,
  secret: process.env.APINATOR_SECRET!,
  cluster: "eu", // or "us"
});

const channelData = JSON.stringify({
  user_id: "user-1",
  user_info: { name: "Alice" },
});

const auth = client.authenticateChannel(
  "12345.67890",
  "presence-chat",
  channelData
);
```

## API

- `trigger({ name, channel?, channels?, data, socketId? }): Promise<void>`
- `authenticateChannel(socketId, channelName, channelData?): { auth, channel_data? }`
- `getChannels(prefix?): Promise<ChannelInfo[]>`
- `getChannel(channelName): Promise<ChannelInfo>`
- `verifyWebhook(headers, body, maxAge?): boolean`

See:
- [API Reference](docs/api-reference.md)
- [Quickstart](docs/quickstart.md)

## License

MIT - see [LICENSE](LICENSE).
