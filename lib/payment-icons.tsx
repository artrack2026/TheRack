import { IconType } from 'react-icons'
import { SiVenmo, SiApplepay, SiCashapp, SiPaypal, SiZelle, SiGooglepay } from 'react-icons/si'
// Amazon Pay isn't in Simple Icons (react-icons/si) — Font Awesome's brand set has it instead.
import { FaAmazonPay } from 'react-icons/fa'
import { CreditCard } from 'lucide-react'

/** Shared icon registry for payment methods — used by both the admin picker
 *  (components/PaymentIconPicker.tsx) and the checkout display (app/checkout/page.tsx)
 *  so the icon an admin picks is guaranteed to be the icon a customer sees.
 *  method.icon stores one of these `key` strings. */
export interface PaymentIconOption {
  key: string
  label: string
  Icon: IconType | typeof CreditCard
  color: string
}

export const PAYMENT_ICON_OPTIONS: PaymentIconOption[] = [
  { key: 'venmo',     label: 'Venmo',      Icon: SiVenmo,     color: '#3D95CE' },
  { key: 'applepay',  label: 'Apple Pay',  Icon: SiApplepay,  color: '#000000' },
  { key: 'cashapp',   label: 'Cash App',   Icon: SiCashapp,   color: '#00D632' },
  { key: 'paypal',    label: 'PayPal',     Icon: SiPaypal,    color: '#003087' },
  { key: 'zelle',     label: 'Zelle',      Icon: SiZelle,     color: '#6D1ED4' },
  { key: 'googlepay', label: 'Google Pay', Icon: SiGooglepay, color: '#4285F4' },
  { key: 'amazonpay', label: 'Amazon Pay', Icon: FaAmazonPay, color: '#FF9900' },
  { key: 'card',      label: 'Card / Other', Icon: CreditCard, color: 'var(--color-text-muted)' },
]

const FALLBACK = PAYMENT_ICON_OPTIONS[PAYMENT_ICON_OPTIONS.length - 1]

/** Looks up an icon by key, falling back to the generic card icon — this is
 *  also what happens for payment methods saved before this registry existed
 *  (their `icon` field holds an old emoji character that won't match any key). */
export function getPaymentIcon(key: string): PaymentIconOption {
  return PAYMENT_ICON_OPTIONS.find(o => o.key === key) ?? FALLBACK
}
