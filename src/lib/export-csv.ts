/**
 * RFC 4180 compliant CSV export utility.
 * Handles quoting, escaping double quotes, and initiates client-side file download.
 */

export interface CsvColumn<T> {
  header: string;
  accessor: (item: T) => string | number | null | undefined;
}

export function exportToCsv<T>(
  filename: string,
  data: T[],
  columns: CsvColumn<T>[]
): void {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const headerRow = columns.map(c => escapeCell(c.header)).join(',');
  const rows = data.map(item =>
    columns.map(col => escapeCell(col.accessor(item))).join(',')
  );

  const csvContent = [headerRow, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
