import jsPDF from 'jspdf'
import { Order, OrderItem, OrderRefund, Profile } from './types'

export const STATUS_LABELS: Record<string, string> = {
  new:           'New',
  in_process:    'In Process',
  ready_to_ship: 'Ready to Ship',
  shipped:       'Shipped',
  delivered:     'Delivered',
  cancelled:     'Cancelled',
  refunded:      'Refunded',
}

export function shortOrderId(id: string) {
  return id.split('-')[0].toUpperCase()
}

export function money(n: number) {
  return `$${n.toFixed(2)}`
}

interface InvoiceData {
  order: Order & { items?: OrderItem[] }
  profile?: Profile | null
  businessName?: string
  /** Partial refunds render as "Post-Sale Discount" lines for bookkeeping —
   *  full refunds/voids are already reflected via order.status. */
  refunds?: OrderRefund[]
}

/** Pure HTML string generator — usable in the browser (print/PDF) and on the server (email). */
export function buildInvoiceHtml({ order, profile, businessName = 'Art-R-Ack', refunds = [] }: InvoiceData): string {
  const items      = order.items ?? []
  const subtotal   = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const balance    = Math.max(0, order.total - order.amount_paid)
  const short      = shortOrderId(order.id)
  const date       = new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const discounts  = refunds.filter(r => !r.is_full_refund)

  const discountRows = discounts.map(r => `
    <tr>
      <td style="padding:3px 4px;color:#7a1f2b;">Post-Sale Discount — ${new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
      <td style="padding:3px 4px;text-align:right;color:#7a1f2b;">−${money(r.amount)}</td>
    </tr>
  `).join('')

  const addressLines = [order.address_line1, order.address_line2, [order.city, order.state, order.zip].filter(Boolean).join(', ')]
    .filter(Boolean).join('<br/>')

  const itemRows = items.map(i => `
    <tr>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e5e5;">${escapeHtml(i.product_title)}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e5e5;text-align:center;">${i.quantity}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e5e5;text-align:right;">${money(i.price)}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e5e5;text-align:right;">${money(i.price * i.quantity)}</td>
    </tr>
  `).join('')

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#222;max-width:680px;margin:0 auto;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #222;padding-bottom:16px;margin-bottom:24px;">
      <div>
        <h1 style="margin:0;font-size:22px;">${escapeHtml(businessName)}</h1>
        <p style="margin:4px 0 0;color:#666;font-size:13px;">Invoice #${short}</p>
      </div>
      <div style="text-align:right;font-size:13px;color:#666;">
        <p style="margin:0;">${date}</p>
        <p style="margin:4px 0 0;font-weight:bold;color:#222;">${STATUS_LABELS[order.status] ?? order.status}</p>
      </div>
    </div>

    <div style="display:flex;gap:32px;margin-bottom:24px;">
      <div style="flex:1;">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#999;">Bill To</p>
        <p style="margin:0;font-weight:bold;">${escapeHtml(order.customer_name)}</p>
        <p style="margin:2px 0;font-size:13px;">${escapeHtml(order.customer_email)}</p>
        ${order.customer_phone ? `<p style="margin:2px 0;font-size:13px;">${escapeHtml(order.customer_phone)}</p>` : ''}
        ${profile?.birthday ? `<p style="margin:2px 0;font-size:13px;color:#888;">Birthday: ${new Date(profile.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>` : ''}
        ${profile ? `<p style="margin:2px 0;font-size:13px;color:#888;">Member since ${new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>` : ''}
      </div>
      <div style="flex:1;">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#999;">Ship To</p>
        <p style="margin:0;font-size:13px;line-height:1.5;">${addressLines || '—'}</p>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
      <thead>
        <tr style="text-align:left;border-bottom:2px solid #222;">
          <th style="padding:6px 4px;">Item</th>
          <th style="padding:6px 4px;text-align:center;">Qty</th>
          <th style="padding:6px 4px;text-align:right;">Price</th>
          <th style="padding:6px 4px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
      <table style="font-size:13px;width:260px;">
        <tr><td style="padding:3px 4px;color:#666;">Subtotal</td><td style="padding:3px 4px;text-align:right;">${money(subtotal)}</td></tr>
        <tr><td style="padding:3px 4px;color:#666;">Shipping</td><td style="padding:3px 4px;text-align:right;">${order.shipping_total === 0 ? 'Free' : money(order.shipping_total)}</td></tr>
        <tr><td style="padding:3px 4px;color:#666;">Tax</td><td style="padding:3px 4px;text-align:right;">${money(order.tax_total)}</td></tr>
        <tr style="border-top:2px solid #222;"><td style="padding:6px 4px;font-weight:bold;">Total</td><td style="padding:6px 4px;text-align:right;font-weight:bold;">${money(order.total)}</td></tr>
        ${discountRows}
        <tr><td style="padding:3px 4px;color:#3a9a5a;">Amount Paid</td><td style="padding:3px 4px;text-align:right;color:#3a9a5a;">${money(order.amount_paid)}</td></tr>
        ${balance > 0 ? `<tr><td style="padding:3px 4px;color:#7a1f2b;font-weight:bold;">Balance Due</td><td style="padding:3px 4px;text-align:right;color:#7a1f2b;font-weight:bold;">${money(balance)}</td></tr>` : ''}
      </table>
    </div>

    <div style="border-top:1px solid #e5e5e5;padding-top:16px;">
      <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#999;">Payment</p>
      <p style="margin:0;font-size:13px;">${escapeHtml(order.payment_method || 'Not specified')}${order.payment_detail ? ` — ${escapeHtml(order.payment_detail)}` : ''}</p>
      ${order.payment_instructions ? `<p style="margin:6px 0 0;font-size:12px;color:#666;white-space:pre-line;">${escapeHtml(order.payment_instructions)}</p>` : ''}
    </div>

    ${order.notes ? `
    <div style="border-top:1px solid #e5e5e5;padding-top:16px;margin-top:16px;">
      <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#999;">Order Notes</p>
      <p style="margin:0;font-size:13px;">${escapeHtml(order.notes)}</p>
    </div>` : ''}
  </div>
  `
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Client-only — triggers a browser download of a basic PDF invoice. */
export function downloadInvoicePdf({ order, businessName = 'Art-R-Ack', refunds = [] }: InvoiceData) {
  const items      = order.items ?? []
  const subtotal   = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const balance    = Math.max(0, order.total - order.amount_paid)
  const short      = shortOrderId(order.id)
  const discounts  = refunds.filter(r => !r.is_full_refund)

  const doc = new jsPDF()
  let y = 20

  doc.setFontSize(18); doc.text(businessName, 14, y)
  y += 7
  doc.setFontSize(10); doc.setTextColor(120)
  doc.text(`Invoice #${short}`, 14, y)
  doc.text(new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 196, y, { align: 'right' })
  doc.setTextColor(0)
  y += 12

  doc.setFontSize(9); doc.setTextColor(150)
  doc.text('BILL TO', 14, y)
  doc.text('SHIP TO', 110, y)
  doc.setTextColor(0); doc.setFontSize(11)
  y += 6
  doc.text(order.customer_name, 14, y)
  doc.text(order.address_line1 || '—', 110, y)
  y += 5
  doc.setFontSize(10)
  doc.text(order.customer_email, 14, y)
  if (order.address_line2) doc.text(order.address_line2, 110, y)
  y += 5
  if (order.customer_phone) doc.text(order.customer_phone, 14, y)
  doc.text([order.city, order.state, order.zip].filter(Boolean).join(', '), 110, y)
  y += 12

  doc.setFontSize(10); doc.setFont('helvetica', 'bold')
  doc.text('Item', 14, y); doc.text('Qty', 130, y); doc.text('Price', 152, y); doc.text('Total', 180, y)
  doc.setFont('helvetica', 'normal')
  doc.line(14, y + 2, 196, y + 2)
  y += 8

  items.forEach(item => {
    doc.text(item.product_title.slice(0, 55), 14, y)
    doc.text(String(item.quantity), 130, y)
    doc.text(`$${item.price.toFixed(2)}`, 152, y)
    doc.text(`$${(item.price * item.quantity).toFixed(2)}`, 180, y)
    y += 7
  })

  y += 4
  doc.line(130, y - 2, 196, y - 2)
  const row = (label: string, value: string, bold = false, color?: [number, number, number]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    if (color) doc.setTextColor(...color)
    doc.text(label, 130, y)
    doc.text(value, 196, y, { align: 'right' })
    doc.setTextColor(0)
    y += 6
  }
  row('Subtotal', `$${subtotal.toFixed(2)}`)
  row('Shipping', order.shipping_total === 0 ? 'Free' : `$${order.shipping_total.toFixed(2)}`)
  row('Tax', `$${order.tax_total.toFixed(2)}`)
  row('Total', `$${order.total.toFixed(2)}`, true)
  discounts.forEach(r => {
    const label = `Post-Sale Discount — ${new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    row(label, `−$${r.amount.toFixed(2)}`, false, [122, 31, 43])
  })
  row('Amount Paid', `$${order.amount_paid.toFixed(2)}`, false, [58, 154, 90])
  if (balance > 0) row('Balance Due', `$${balance.toFixed(2)}`, true, [122, 31, 43])

  y += 8
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(150)
  doc.text('PAYMENT', 14, y)
  doc.setTextColor(0); doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  y += 6
  doc.text(`${order.payment_method ?? 'Not specified'}${order.payment_detail ? ` — ${order.payment_detail}` : ''}`, 14, y)

  doc.save(`Invoice-${short}.pdf`)
}
