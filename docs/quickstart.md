# Quickstart

## 1. Install

```bash
npm install @apinator/server
```

## 2. Initialize

```ts
import { Apinator } from "@apinator/server";

const client = new Apinator({
  appId: process.env.APINATOR_APP_ID!,
  key: process.env.APINATOR_KEY!,
  secret: process.env.APINATOR_SECRET!,
  cluster: "eu",
});
```

## 3. Trigger events

```ts
await client.trigger({
  name: "message-created",
  channel: "chat-room-1",
  data: JSON.stringify({ text: "Hello" }),
});
```

## 4. Authenticate private/presence subscriptions

```ts
const auth = client.authenticateChannel(
  socketId,
  "presence-chat",
  JSON.stringify({ user_id: "u1", user_info: { name: "Alice" } })
);
```

## 5. Verify webhooks

```ts
const isValid = client.verifyWebhook(
  req.headers as Record<string, string | string[] | undefined>,
  rawBody,
  300
);
```
