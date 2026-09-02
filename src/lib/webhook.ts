import { db } from './db'

export interface WebhookPayload {
  event: string
  slug: string
  path?: string
  method?: string
  timestamp: string
  data?: unknown
}

export async function fireWebhooks(boxId: string, payload: WebhookPayload): Promise<void> {
  try {
    const webhooks = await db.webhook.findMany({
      where: { boxId, active: true },
    })

    for (const wh of webhooks) {
      try {
        const events: string[] = JSON.parse(wh.events)
        if (!events.includes(payload.event) && !events.includes('*')) continue

        // Fire and forget — don't block the main request
        fetch(wh.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookId: wh.id,
            ...payload,
          }),
          signal: AbortSignal.timeout(5000),
        }).catch(() => { /* ignore webhook failures */ })
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore webhook errors — never block main flow */
  }
}
