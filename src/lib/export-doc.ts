/**
 * Word document (.doc) export utility using standard HTML Document encapsulation.
 * Opens natively in Microsoft Word, Google Docs, Apple Pages, and LibreOffice
 * with structured tables, headers, and professional typography.
 */

export function exportToWord(
  filename: string,
  title: string,
  subtitle: string,
  tableHtml: string,
  kpiHtml?: string
): void {
  if (typeof window === 'undefined') return;

  const fullHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <style>
        body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; color: #0B2540; margin: 30px; }
        h1 { font-family: 'Georgia', serif; font-size: 20pt; color: #0B2540; margin-bottom: 2pt; text-transform: uppercase; }
        .subtitle { font-size: 11pt; color: #D9722C; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12pt; }
        .meta { font-size: 9pt; color: #555555; margin-bottom: 16pt; border-bottom: 2px solid #0B2540; padding-bottom: 6pt; }
        .kpi-table { width: 100%; border-collapse: collapse; margin-bottom: 16pt; }
        .kpi-table td { padding: 8pt; background-color: #f7f6f3; border: 1px solid #e0ddd7; font-size: 9pt; }
        .kpi-val { font-size: 14pt; font-weight: bold; color: #0B2540; }
        .kpi-label { font-size: 8pt; text-transform: uppercase; color: #777; }
        table.data-table { width: 100%; border-collapse: collapse; margin-top: 10pt; }
        table.data-table th { background-color: #0B2540; color: #ffffff; padding: 7pt 6pt; font-size: 9pt; text-align: left; text-transform: uppercase; }
        table.data-table td { padding: 6pt; border-bottom: 1px solid #e0ddd7; font-size: 9pt; }
        table.data-table tr:nth-child(even) { background-color: #faf9f6; }
        .footer { margin-top: 24pt; font-size: 8pt; color: #888888; border-top: 1px solid #cccccc; padding-top: 6pt; text-align: right; }
      </style>
    </head>
    <body>
      <h1>Sky Nest Hotels & Resorts</h1>
      <div class="subtitle">${title}</div>
      <div class="meta">
        <strong>${subtitle}</strong> | Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} | Confidential Archival Report
      </div>
      ${kpiHtml || ''}
      ${tableHtml}
      <div class="footer">Sky Nest Luxury Hospitality Management System · Official Executive Document</div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.doc') ? filename : `${filename}.doc`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
