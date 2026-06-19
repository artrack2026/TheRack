import { Resend } from 'resend'

export const isEmailConfigured = !!process.env.RESEND_API_KEY

let client: Resend | null = null

function getClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required to send email.')
  }
  if (!client) client = new Resend(process.env.RESEND_API_KEY)
  return client
}

export async function sendEmail({
  to, subject, html, replyTo,
}: { to: string; subject: string; html: string; replyTo?: string }) {
  const from = process.env.RESEND_FROM_EMAIL || 'Art-R-Ack <orders@resend.dev>'
  const resend = getClient()
  const { data, error } = await resend.emails.send({
    from, to, subject, html,
    ...(replyTo ? { replyTo } : {}),
  })
  if (error) throw new Error(error.message)
  return data
}
