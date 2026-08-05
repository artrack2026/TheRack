import { createSupabaseAdminClient } from '@/lib/supabase'
import { sendEmail, isEmailConfigured } from '@/lib/email'

const LOW_BALANCE_THRESHOLD = 100
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000

/** Emails every admin once the Textbelt balance drops under 100 credits.
 *  Call this anywhere a Textbelt response reports a quota number — after a
 *  send (login OTP, phone-verify OTP) or after an explicit quota check.
 *
 *  Cooldown-gated via showroom_settings.textbelt_low_balance_alert_at so a
 *  string of logins while under the threshold sends one alert, not one per
 *  text. Never throws — a broken alert must not break the SMS send or quota
 *  check it's piggybacking on. */
export async function maybeAlertLowTextbeltBalance(quotaRemaining: number | null | undefined): Promise<void> {
  if (typeof quotaRemaining !== 'number' || quotaRemaining >= LOW_BALANCE_THRESHOLD) return
  if (!isEmailConfigured) return

  try {
    const admin = createSupabaseAdminClient()

    const { data: settingsRow } = await admin
      .from('showroom_settings')
      .select('textbelt_low_balance_alert_at')
      .eq('id', 1)
      .single()

    const lastAlert = settingsRow?.textbelt_low_balance_alert_at
    if (lastAlert && Date.now() - new Date(lastAlert).getTime() < ALERT_COOLDOWN_MS) return

    const { data: admins } = await admin.from('profiles').select('email').eq('role', 'admin')
    const recipients = (admins ?? []).map(a => a.email).filter((e): e is string => !!e)
    if (recipients.length === 0) return

    await Promise.all(recipients.map(to => sendEmail({
      to,
      subject: `Textbelt balance low — ${quotaRemaining} credit${quotaRemaining === 1 ? '' : 's'} left`,
      html: `
        <p>Your Textbelt SMS balance has dropped to <strong>${quotaRemaining}</strong> credit${quotaRemaining === 1 ? '' : 's'}.</p>
        <p>SMS-based login codes and phone-number verification automatically fall back to email once credits run out, so nobody gets locked out — but the SMS experience degrades until it's reloaded.</p>
        <p>Add more credits at <a href="https://textbelt.com/purchase/">textbelt.com/purchase</a> using your existing API key.</p>
        <p>Current balance is always visible in Admin → Showroom Settings → Messaging.</p>
      `,
    })))

    await admin
      .from('showroom_settings')
      .update({ textbelt_low_balance_alert_at: new Date().toISOString() })
      .eq('id', 1)
  } catch (err) {
    console.error('Low Textbelt balance alert failed:', err)
  }
}
