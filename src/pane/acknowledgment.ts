import type { Bindings } from '../auth.server'
import { operatorMail } from '../mail.server.mjs'

export type Acknowledgment = { subject: string; text: string; responseTime: string }
type DeliveryStatus = 'accepted' | 'suppressed' | 'failed' | 'uncertain'
type DeliveryResult = { status: DeliveryStatus | 'skipped' }

/** Omission disables acknowledgment; a present setting must be complete. */
export function normalizeAcknowledgment(value: unknown): Acknowledgment | undefined {
 if (value === undefined) return undefined
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid acknowledgment settings.')
 const input = value as Record<string, unknown>
 const field = (name: keyof Acknowledgment, limit: number, multiline = false): string => {
  const raw = input[name]
  if (typeof raw !== 'string' || raw.length > limit) throw new Error(`Invalid acknowledgment ${name}.`)
  const normalized = raw.normalize('NFC').replace(/\r\n?/g, '\n').trim()
  const controls = multiline ? /[\x00-\x08\x0b-\x1f\x7f]/ : /[\x00-\x1f\x7f\u2028\u2029]/
  if (!normalized || normalized.length > limit || controls.test(normalized)) throw new Error(`Invalid acknowledgment ${name}.`)
  return normalized
 }
 return { subject: field('subject', 200), text: field('text', 5000, true), responseTime: field('responseTime', 200) }
}

/** One durable claim, one provider attempt. A stranded sending claim is never replayed. */
export async function deliverAcknowledgment(env: Bindings, id: string): Promise<DeliveryResult> {
 const row = await env.DB.prepare(`UPDATE pane_messages SET acknowledgment_status='sending'
  WHERE id=? AND acknowledgment_status='pending' RETURNING name,email,acknowledgment`)
  .bind(id).first<{ name: string; email: string; acknowledgment: string | null }>()
 if (!row) return { status: 'skipped' }

 const finish = async (status: DeliveryStatus, provider: string | null = null, providerId: string | null = null): Promise<DeliveryResult> => {
  // Erasure during the provider request must never recreate the message or its receipt.
  await env.DB.prepare(`UPDATE pane_messages SET acknowledgment_status=?,acknowledgment_provider=?,acknowledgment_provider_id=?
   WHERE id=? AND acknowledgment_status='sending'`).bind(status, provider, providerId, id).run()
  return { status }
 }

 let acknowledgment: Acknowledgment | undefined
 try { acknowledgment = normalizeAcknowledgment(JSON.parse(row.acknowledgment ?? 'null')) } catch { return finish('failed') }
 if (!acknowledgment || !env.MAIL_FROM?.trim()) return finish('failed')

 let sender: ReturnType<typeof operatorMail>
 try { sender = operatorMail(env) } catch { return finish('failed') }
 if (!sender) return finish('failed')

 let result: Awaited<ReturnType<NonNullable<typeof sender>['send']>>
 // Only owner-authored content: submitted names/messages cannot become email text.
 const text = `${acknowledgment.text}\n\nExpected response time: ${acknowledgment.responseTime}`
 const html = `<p>${text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!)).replace(/\n/g, '<br>')}</p>`
 try {
  result = await sender.send({
   deliveryId: `pane-acknowledgment:${id}`,
   from: env.MAIL_FROM,
   to: [row.email],
   subject: acknowledgment.subject,
   text, html, headers: {},
  })
 } catch (error) {
  // The shared sender redacts validation errors; never expose exception text or provider payloads.
  const resultErrors = ['invalid_send_result', 'invalid_provider_message_id', 'invalid_result_code', 'invalid_recipient_results', 'invalid_recipient_status']
  const invalidInput = error instanceof Error && error.name === 'MailValidationError'
   && 'code' in error && typeof error.code === 'string' && !resultErrors.includes(error.code)
  return finish(invalidInput ? 'failed' : 'uncertain')
 }
 const status: DeliveryStatus = result.status === 'accepted' ? 'accepted'
  : result.status === 'development' ? 'suppressed'
  : result.status === 'uncertain' ? 'uncertain' : 'failed'
 return finish(status, result.provider, result.providerMessageId)
}
