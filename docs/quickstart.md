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

Use the webhook endpoint's signing secret (`whsec_...`, from the console), not the
app's API secret, and the raw request body:

```ts
const isValid = client.verifyWebhook(
  process.env.APINATOR_WEBHOOK_SECRET!,
  req.headers as Record<string, string | string[] | undefined>,
  rawBody,
  300
);
if (!isValid) {
  return res.status(401).send("Invalid signature");
}

const event = JSON.parse(rawBody);
// {"id":"...","event":"member_added","app_id":"...","channel":"presence-room","user_id":"42","time_ms":1760000000000}
// Deliveries are at-least-once: ignore an event.id you have already processed.
```
