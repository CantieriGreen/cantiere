export type ExportColumn = {
  header: string
  /** chiave nel record oppure funzione di estrazione */
  key: string
  /** allineamento nel PDF */
  align?: 'left' | 'right' | 'center'
  /** formattatore per il valore (es. valuta) */
  format?: (value: unknown, row: Record<string, unknown>) => string | number
}

function valueOf(
  row: Record<string, unknown>,
  col: ExportColumn
): string | number {
  const raw = row[col.key]
  if (col.format) return col.format(raw, row)
  if (raw === null || raw === undefined) return ''
  return raw as string | number
}

/** Esporta un set di righe in un file .xlsx */
export async function exportToExcel(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  fileName: string,
  sheetName = 'Report'
) {
  const XLSX = await import('xlsx')
  const data = rows.map((r) => {
    const obj: Record<string, string | number> = {}
    columns.forEach((c) => {
      obj[c.header] = valueOf(r, c)
    })
    return obj
  })
  const ws = XLSX.utils.json_to_sheet(data, {
    header: columns.map((c) => c.header),
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  XLSX.writeFile(wb, ensureExt(fileName, 'xlsx'))
}

type PdfOptions = {
  title: string
  subtitle?: string
  azienda?: string
  totals?: Record<string, string | number>
}

/** Esporta un set di righe in un PDF tabellare */
export async function exportToPdf(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  fileName: string,
  opts: PdfOptions
) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const navy: [number, number, number] = [46, 94, 140]

  // Intestazione
  doc.setFontSize(16)
  doc.setTextColor(31, 41, 55)
  doc.text(opts.title, 40, 44)

  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128)
  let y = 60
  if (opts.azienda) {
    doc.text(opts.azienda, 40, y)
    y += 14
  }
  if (opts.subtitle) {
    doc.text(opts.subtitle, 40, y)
    y += 14
  }
  doc.text(
    `Generato il ${new Date().toLocaleDateString('it-IT')}`,
    40,
    y
  )

  const head = [columns.map((c) => c.header)]
  const body = rows.map((r) => columns.map((c) => String(valueOf(r, c))))

  if (opts.totals) {
    body.push(columns.map((c) => String(opts.totals?.[c.header] ?? '')))
  }

  autoTable(doc, {
    head,
    body,
    startY: y + 12,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5, textColor: [31, 41, 55] },
    headStyles: { fillColor: navy, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 248, 250] },
    columnStyles: columns.reduce((acc, c, i) => {
      acc[i] = { halign: c.align ?? 'left' }
      return acc
    }, {} as Record<number, { halign: 'left' | 'right' | 'center' }>),
    didParseCell: (data) => {
      // riga totali in grassetto
      if (opts.totals && data.row.index === body.length - 1 && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [220, 230, 241]
      }
    },
  })

  doc.save(ensureExt(fileName, 'pdf'))
}

function ensureExt(name: string, ext: string) {
  return name.toLowerCase().endsWith('.' + ext) ? name : `${name}.${ext}`
}

/** Formato valuta euro per export (numero puro, separatori italiani come stringa) */
export function euExport(n: number): string {
  return (
    '€ ' +
    n.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}
