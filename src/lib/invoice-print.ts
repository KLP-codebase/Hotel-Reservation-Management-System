/**
 * Shared Tax Invoice Printer Utility
 * Generates an authentic, 1-page computer-generated fiscal tax invoice matching
 * the Front Desk Billing page format, without multi-page repetition bugs.
 */

export interface PrintableInvoiceData {
  invoice_id: string;
  booking_id: string;
  booking_room_id?: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string | null;
  room_number: string;
  room_type_name: string;
  branch_name: string;
  check_in_date: string | null;
  check_out_date: string | null;
  nights: number;
  base_amount: number;
  sc_amount: number;
  tdl_amount: number;
  sscl_amount: number;
  vat_amount: number;
  total_amount: number;
  total_paid: number;
  balance_due: number;
  status: 'SETTLED' | 'PARTIALLY_PAID' | 'OPEN';
  /** Currency symbol, defaults to 'Rs' */
  currency?: string;
  line_items?: Array<{
    description: string;
    details?: string;
    category?: string;
    amount: number;
    /** Quantity of the line item (e.g. nights, sessions) */
    quantity?: number;
    /** Unit rate / price (e.g. rate per night, price per session) */
    unitRate?: number;
  }>;
}

export function printTaxInvoice(inv: PrintableInvoiceData): void {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank', 'width=900,height=1050');
  if (!printWindow) return;

  const isSettled = inv.status === 'SETTLED' || inv.balance_due <= 0.01;
  const isPartiallyPaid = !isSettled && inv.total_paid > 0;
  const formattedCheckIn = inv.check_in_date ? new Date(inv.check_in_date).toLocaleDateString('en-GB') : 'N/A';
  const formattedCheckOut = inv.check_out_date ? new Date(inv.check_out_date).toLocaleDateString('en-GB') : 'N/A';
  const todayDate = new Date().toLocaleDateString('en-GB');

  const fmt = (n: number) => Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2 });
  const curr = inv.currency || 'Rs';

  // Build line items HTML (services, rooms, meals all show Qty + Unit Rate + Amount)
  const lineItemsHtml = inv.line_items && inv.line_items.length > 0
    ? inv.line_items.map(item => {
        const qtyCell = item.quantity !== undefined ? item.quantity : 1;
        const rateCell = item.unitRate !== undefined ? `${curr} ${fmt(item.unitRate)}` : (item.category || 'Tariff');
        const detailsHtml = item.details ? `<br/><span style="font-size: 10.5px; color: #64748b; font-style: italic;">${item.details}</span>` : '';
        return `
      <tr>
        <td><strong>${item.description}</strong>${detailsHtml}</td>
        <td class="text-center cat-cell">${item.category || ''}</td>
        <td class="text-right">${rateCell}</td>
        <td class="text-center">${qtyCell}</td>
        <td class="text-right"><strong>${fmt(item.amount)}</strong></td>
      </tr>`;
      }).join('')
    : `
      <tr>
        <td><strong>Room Accommodation &amp; Incidental Services</strong><br/><span style="font-size: 10.5px; color: #64748b; font-style: italic;">Net room charges for ${inv.nights} night(s)</span></td>
        <td class="text-center cat-cell">Accommodation</td>
        <td class="text-right">—</td>
        <td class="text-center">${inv.nights}</td>
        <td class="text-right"><strong>${fmt(inv.base_amount)}</strong></td>
      </tr>`;

  // Stamp color and label
  let stampColor = '#d97706';
  let stampLabel = 'PAYMENT OPEN';
  if (isSettled) { stampColor = '#15803d'; stampLabel = 'PAID IN FULL'; }
  else if (isPartiallyPaid) { stampColor = '#0369a1'; stampLabel = 'DEPOSIT PAID'; }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sky Nest Tax Invoice - ${inv.invoice_id}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 0; padding: 12px 16px; font-size: 11.5px; line-height: 1.35; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #D9722C; padding-bottom: 12px; margin-bottom: 14px; }
    .brand { font-size: 22px; font-weight: 700; color: #0B2540; letter-spacing: 1.5px; }
    .brand-sub { font-size: 9px; text-transform: uppercase; color: #D9722C; font-weight: 600; letter-spacing: 2px; }
    .inv-title { text-align: right; }
    .inv-title h2 { margin: 0; font-size: 16px; color: #0B2540; text-transform: uppercase; letter-spacing: 1px; }
    .inv-meta { font-size: 10.5px; color: #64748b; margin-top: 4px; line-height: 1.55; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 12px; font-size: 11.5px; line-height: 1.55; }
    .card h3 { margin: 0 0 5px 0; font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; font-weight: 700; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    .table th { background: #0B2540; color: #ffffff; text-align: left; padding: 7px 9px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .table th.text-right { text-align: right; }
    .table th.text-center { text-align: center; }
    .table td { padding: 7px 9px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; vertical-align: top; }
    .table tbody tr:last-child td { border-bottom: 2px solid #0B2540; }
    .table .tax-row td { background: #f8fafc; font-size: 11px; color: #475569; padding: 5px 9px; }
    .table .tax-row td:first-child { padding-left: 9px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .cat-cell { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #64748b; }
    .totals { width: 290px; margin-left: auto; margin-bottom: 14px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-size: 11.5px; }
    .totals-row.grand { border-top: 2px solid #0B2540; border-bottom: 2px solid #0B2540; font-weight: 700; font-size: 14px; color: #0B2540; padding: 7px 0; }
    .totals-row.paid { color: #0369a1; font-weight: 600; }
    .totals-row.balance-green { color: #15803d; font-weight: 600; }
    .totals-row.balance-red { color: #b91c1c; font-weight: 600; }
    .stamp { display: inline-block; padding: 3px 10px; border: 2px solid ${stampColor}; color: ${stampColor}; font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 3px; transform: rotate(-3deg); margin-top: 5px; }
    .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9.5px; color: #94a3b8; text-align: center; line-height: 1.5; }
    .section-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 3px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">SKY NEST</div>
      <div class="brand-sub">Hotel &amp; Luxury Residences</div>
      <div style="margin-top: 4px; font-size: 10.5px; color: #64748b;">
        ${inv.branch_name || 'Sky Nest Hotel'} &bull; Sri Lanka<br/>
        VAT Registration No: 104-982-3490-VAT
      </div>
    </div>
    <div class="inv-title">
      <h2>TAX INVOICE</h2>
      <div class="inv-meta">
        <strong>Invoice #:</strong> ${inv.invoice_id}<br/>
        <strong>Booking ID:</strong> ${inv.booking_id.substring(0, 8)}...<br/>
        <strong>Issue Date:</strong> ${todayDate}
      </div>
      <div>
        <span class="stamp">${stampLabel}</span>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Billed To (Guest)</h3>
      <strong style="font-size: 12px; color: #0B2540;">${inv.guest_name}</strong><br/>
      Email: ${inv.guest_email}<br/>
      ${inv.guest_phone ? `Phone: ${inv.guest_phone}<br/>` : ''}
      Room(s): <strong>${inv.room_number}</strong> (${inv.room_type_name})
    </div>
    <div class="card">
      <h3>Stay Details</h3>
      <strong>Check-in:</strong> ${formattedCheckIn}<br/>
      <strong>Check-out:</strong> ${formattedCheckOut}<br/>
      <strong>Total Stay:</strong> ${inv.nights} Night(s)
    </div>
  </div>

  <!-- Itemized Charges Table -->
  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-center" style="width:90px;">Category</th>
        <th class="text-right" style="width:90px;">Unit Rate</th>
        <th class="text-center" style="width:40px;">Qty</th>
        <th class="text-right" style="width:110px;">Amount (${curr})</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHtml}
      <!-- Statutory Tax Rows -->
      <tr class="tax-row">
        <td><strong>Statutory Service Charge (SC)</strong> &mdash; Hospitality employee service charge</td>
        <td class="text-center cat-cell">Tax</td>
        <td class="text-right">10.00%</td>
        <td class="text-center">—</td>
        <td class="text-right">${fmt(inv.sc_amount)}</td>
      </tr>
      <tr class="tax-row">
        <td><strong>Tourism Development Levy (TDL)</strong> &mdash; Sri Lanka Tourism Act turnover levy</td>
        <td class="text-center cat-cell">Tax</td>
        <td class="text-right">1.00%</td>
        <td class="text-center">—</td>
        <td class="text-right">${fmt(inv.tdl_amount)}</td>
      </tr>
      <tr class="tax-row">
        <td><strong>Social Security Contribution Levy (SSCL)</strong> &mdash; Act No. 25 of 2022</td>
        <td class="text-center cat-cell">Tax</td>
        <td class="text-right">2.50%</td>
        <td class="text-center">—</td>
        <td class="text-right">${fmt(inv.sscl_amount)}</td>
      </tr>
      <tr class="tax-row">
        <td><strong>Value Added Tax (VAT)</strong> &mdash; Inland Revenue Department</td>
        <td class="text-center cat-cell">Tax</td>
        <td class="text-right">18.00%</td>
        <td class="text-center">—</td>
        <td class="text-right">${fmt(inv.vat_amount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row grand">
      <span>Total Invoiced</span>
      <span>${curr} ${fmt(inv.total_amount)}</span>
    </div>
    ${inv.total_paid > 0 ? `
    <div class="totals-row paid">
      <span>Amount Paid${isPartiallyPaid ? ' (20% Deposit)' : ''}</span>
      <span>&#8722; ${curr} ${fmt(inv.total_paid)}</span>
    </div>` : ''}
    <div class="totals-row ${inv.balance_due > 0.01 ? 'balance-red' : 'balance-green'}">
      <span>Balance Due</span>
      <span>${curr} ${fmt(inv.balance_due)}</span>
    </div>
  </div>

  <div class="footer">
    Thank you for choosing Sky Nest Hotel. We look forward to welcoming you again.<br/>
    This is an authentic computer-generated fiscal tax invoice issued under Inland Revenue Department guidelines.
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
