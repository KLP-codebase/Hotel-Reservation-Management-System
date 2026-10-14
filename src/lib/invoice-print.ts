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
  line_items?: Array<{
    description: string;
    details?: string;
    category?: string;
    amount: number;
  }>;
}

export function printTaxInvoice(inv: PrintableInvoiceData): void {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank', 'width=850,height=950');
  if (!printWindow) return;

  const isSettled = inv.status === 'SETTLED' || inv.balance_due <= 0.01;
  const formattedCheckIn = inv.check_in_date ? new Date(inv.check_in_date).toLocaleDateString('en-GB') : 'N/A';
  const formattedCheckOut = inv.check_out_date ? new Date(inv.check_out_date).toLocaleDateString('en-GB') : 'N/A';
  const todayDate = new Date().toLocaleDateString('en-GB');

  const lineItemsHtml = inv.line_items && inv.line_items.length > 0
    ? inv.line_items.map(item => `
      <tr>
        <td><strong>${item.description}</strong>${item.details ? `<br/><span style="font-size: 11px; color: #64748b;">${item.details}</span>` : ''}</td>
        <td class="text-right">${item.category || 'Tariff'}</td>
        <td class="text-right">${Number(item.amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('')
    : `
      <tr>
        <td><strong>Room Accommodation & Incidental Services</strong><br/><span style="font-size: 11px; color: #64748b;">Net room charges for ${inv.nights} night(s)</span></td>
        <td class="text-right">Base Tariff</td>
        <td class="text-right">${Number(inv.base_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sky Nest Tax Invoice - ${inv.invoice_id}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; font-size: 13px; line-height: 1.45; background: #fff; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #D9722C; padding-bottom: 14px; margin-bottom: 20px; }
    .brand { font-size: 24px; font-weight: 700; color: #0B2540; letter-spacing: 1.5px; }
    .brand-sub { font-size: 10px; text-transform: uppercase; color: #D9722C; font-weight: 600; letter-spacing: 2px; }
    .inv-title { text-align: right; }
    .inv-title h2 { margin: 0; font-size: 18px; color: #0B2540; text-transform: uppercase; letter-spacing: 1px; }
    .inv-meta { font-size: 11px; color: #64748b; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 20px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; }
    .card h3 { margin: 0 0 6px 0; font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; font-weight: 700; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .table th { background: #0B2540; color: #ffffff; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .table tr:last-child td { border-bottom: 2px solid #0B2540; }
    .text-right { text-align: right; }
    .totals { width: 300px; margin-left: auto; margin-bottom: 20px; }
    .totals-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
    .totals-row.grand { border-top: 2px solid #0B2540; border-bottom: 2px solid #0B2540; font-weight: 700; font-size: 15px; color: #0B2540; padding: 8px 0; }
    .stamp { display: inline-block; padding: 4px 12px; border: 2px solid ${isSettled ? '#15803d' : '#d97706'}; color: ${isSettled ? '#15803d' : '#d97706'}; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 4px; transform: rotate(-3deg); margin-top: 6px; }
    .footer { margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">SKY NEST</div>
      <div class="brand-sub">Hotel & Luxury Residences</div>
      <div style="margin-top: 4px; font-size: 11px; color: #64748b;">
        ${inv.branch_name || 'Sky Nest Hotel'} • Sri Lanka<br/>
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
        <span class="stamp">${isSettled ? 'PAID IN FULL' : 'PAYMENT OPEN'}</span>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Billed To (Guest)</h3>
      <strong style="font-size: 13px; color: #0B2540;">${inv.guest_name}</strong><br/>
      Email: ${inv.guest_email}<br/>
      ${inv.guest_phone ? `Phone: ${inv.guest_phone}<br/>` : ''}
      Room: <strong>Room ${inv.room_number}</strong> (${inv.room_type_name})
    </div>
    <div class="card">
      <h3>Stay Details</h3>
      <strong>Check-in:</strong> ${formattedCheckIn}<br/>
      <strong>Check-out:</strong> ${formattedCheckOut}<br/>
      <strong>Total Stay:</strong> ${inv.nights} Night(s)
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-right">Rate / Basis</th>
        <th class="text-right">Amount (LKR)</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHtml}
      <tr>
        <td><strong>Statutory Service Charge (SC)</strong><br/><span style="font-size: 10px; color: #64748b;">Hospitality employee service charge</span></td>
        <td class="text-right">10.00%</td>
        <td class="text-right">${Number(inv.sc_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td><strong>Tourism Development Levy (TDL)</strong><br/><span style="font-size: 10px; color: #64748b;">Sri Lanka Tourism Act turnover levy</span></td>
        <td class="text-right">1.00%</td>
        <td class="text-right">${Number(inv.tdl_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td><strong>Social Security Contribution Levy (SSCL)</strong><br/><span style="font-size: 10px; color: #64748b;">Act No. 25 of 2022</span></td>
        <td class="text-right">2.50%</td>
        <td class="text-right">${Number(inv.sscl_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td><strong>Value Added Tax (VAT)</strong><br/><span style="font-size: 10px; color: #64748b;">Inland Revenue Department</span></td>
        <td class="text-right">18.00%</td>
        <td class="text-right">${Number(inv.vat_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row grand">
      <span>Total Invoiced</span>
      <span>LKR ${Number(inv.total_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
    </div>
    <div class="totals-row">
      <span>Total Paid</span>
      <span>LKR ${Number(inv.total_paid).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
    </div>
    <div class="totals-row" style="color: ${inv.balance_due > 0.01 ? '#b91c1c' : '#15803d'}; font-weight: 600;">
      <span>Balance Due</span>
      <span>LKR ${Number(inv.balance_due).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
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
