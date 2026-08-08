/** Pre-fills the *amount* into a Venmo / Cash App / PayPal.me redirect link,
 *  using each service's own documented URL pattern. Deliberately does not
 *  attempt to pre-fill a note/memo with the order number — Cash App and
 *  PayPal.me have no URL parameter for that at all, and Venmo's is an
 *  undocumented, unofficial pattern that's unreliable outside its own
 *  mobile app. Showing the order number on-screen for the customer to type
 *  in themselves (see app/checkout/page.tsx and the confirm-payment page)
 *  is the reliable path for that part.
 *
 *  Any host this doesn't recognize is returned unchanged — there's no safe
 *  generic way to guess a third-party link's query format. */
export function buildPaymentRedirectUrl(baseUrl: string, amount: number): string {
  if (!baseUrl || !Number.isFinite(amount) || amount <= 0) return baseUrl

  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    return baseUrl
  }

  const amt = amount.toFixed(2)
  const host = url.hostname.replace(/^www\./, '')

  // cash.app/$handle/25.00 and paypal.me/handle/25.00 both take the
  // amount as an additional path segment.
  if (host === 'cash.app' || host === 'paypal.me') {
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/${amt}`
    return url.toString()
  }

  // venmo.com/u/handle?txn=pay&amount=25.00 — web fallback for the
  // (otherwise app-only) pay flow; degrades gracefully to just opening
  // the profile if a browser/OS ignores the query params.
  if (host === 'venmo.com') {
    url.searchParams.set('txn', 'pay')
    url.searchParams.set('amount', amt)
    return url.toString()
  }

  return baseUrl
}
