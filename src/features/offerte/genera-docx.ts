import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from 'docx'
import type { Azienda } from '@/features/azienda/api'
import type {
  OffertaCompleta,
} from './api'

const NAVY = '2E5E8C'
const INK = '1F2937'
const GREY = '6B7280'

function euro(n: number) {
  return (
    '€ ' +
    n.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}
function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

function heading(text: string) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({ text, bold: true, size: 26, color: NAVY }),
    ],
  })
}

function para(text: string, opts: { size?: number; color?: string; bold?: boolean } = {}) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({
        text,
        size: opts.size ?? 20,
        color: opts.color ?? INK,
        bold: opts.bold,
      }),
    ],
  })
}

type Align = (typeof AlignmentType)[keyof typeof AlignmentType]

function cell(text: string, opts: { bold?: boolean; align?: Align; color?: string; fill?: string } = {}) {
  return new TableCell({
    shading: opts.fill ? { fill: opts.fill, color: 'auto', type: 'clear' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: opts.align,
        children: [
          new TextRun({
            text,
            bold: opts.bold,
            size: 18,
            color: opts.color ?? INK,
          }),
        ],
      }),
    ],
  })
}

export async function generaOffertaDocx(
  offerta: OffertaCompleta,
  azienda: Azienda | null
): Promise<Blob> {
  const cliente =
    offerta.cliente?.ragione_sociale ?? offerta.cliente_nome ?? 'Cliente'

  const totMatBase = offerta.materiali.reduce((s, m) => s + m.importo, 0)
  const totMatFinale = offerta.materiali.reduce(
    (s, m) => s + m.importo * (1 + m.ricarico_pct / 100),
    0
  )

  // Intestazione azienda
  const headerChildren: Paragraph[] = []
  if (azienda) {
    headerChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: azienda.ragione_sociale, bold: true, size: 28, color: NAVY }),
        ],
      })
    )
    const info = [
      azienda.sede_legale,
      azienda.partita_iva ? `P.IVA ${azienda.partita_iva}` : null,
      azienda.telefono,
      azienda.email,
    ]
      .filter(Boolean)
      .join(' · ')
    if (info) headerChildren.push(para(info, { size: 16, color: GREY }))
  }

  // Tabella sintesi proposta
  const sintesiRows: TableRow[] = []
  const addSintesi = (k: string, v: string | null | undefined) => {
    if (!v) return
    sintesiRows.push(
      new TableRow({
        children: [cell(k, { bold: true, fill: 'F1F5FA' }), cell(v)],
      })
    )
  }
  addSintesi('Tipo di intervento', offerta.tipo)
  addSintesi('Categoria', offerta.categoria)
  addSintesi('Superficie', offerta.superficie_mq ? `${offerta.superficie_mq} mq` : null)
  addSintesi('Piani / livelli', offerta.piani ? String(offerta.piani) : null)
  addSintesi('Struttura', offerta.struttura)
  addSintesi('Finiture', offerta.finiture)
  addSintesi('Garanzia', offerta.garanzia)
  addSintesi('Durata lavori', offerta.durata_mesi ? `${offerta.durata_mesi} mesi` : null)

  const children: (Paragraph | Table)[] = [
    ...headerChildren,
    new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB', space: 8 } }, children: [] }),

    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 80 },
      children: [new TextRun({ text: 'OFFERTA ECONOMICA', bold: true, size: 32, color: INK })],
    }),
    para(`Offerta n. ${offerta.numero} del ${formatDate(offerta.data)}`, { color: GREY }),
    new Paragraph({ spacing: { after: 120 }, children: [] }),

    para('Spett.le', { bold: true }),
    para(cliente, { bold: true, size: 22 }),
    ...(offerta.localita ? [para(offerta.localita, { color: GREY })] : []),

    heading('Oggetto'),
    para(offerta.titolo, { size: 22, bold: true }),
  ]

  if (sintesiRows.length) {
    children.push(heading('Sintesi della proposta'))
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: sintesiRows,
      })
    )
  }

  // Materiali
  if (offerta.materiali.length) {
    children.push(heading('Configurazione materiali'))
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              cell('Tipologia', { bold: true, color: 'FFFFFF', fill: NAVY }),
              cell('Descrizione', { bold: true, color: 'FFFFFF', fill: NAVY }),
              cell('Importo', { bold: true, color: 'FFFFFF', fill: NAVY, align: AlignmentType.RIGHT }),
              cell('Ricarico', { bold: true, color: 'FFFFFF', fill: NAVY, align: AlignmentType.RIGHT }),
              cell('Prezzo finale', { bold: true, color: 'FFFFFF', fill: NAVY, align: AlignmentType.RIGHT }),
            ],
          }),
          ...offerta.materiali.map((m) =>
            new TableRow({
              children: [
                cell(m.tipo ?? '—'),
                cell(m.descrizione ?? '—'),
                cell(euro(m.importo), { align: AlignmentType.RIGHT }),
                cell(`${m.ricarico_pct}%`, { align: AlignmentType.RIGHT }),
                cell(euro(m.importo * (1 + m.ricarico_pct / 100)), { align: AlignmentType.RIGHT }),
              ],
            })
          ),
          new TableRow({
            children: [
              cell('Totale', { bold: true, fill: 'F1F5FA' }),
              cell('', { fill: 'F1F5FA' }),
              cell(euro(totMatBase), { bold: true, fill: 'F1F5FA', align: AlignmentType.RIGHT }),
              cell('', { fill: 'F1F5FA' }),
              cell(euro(totMatFinale), { bold: true, fill: 'F1F5FA', align: AlignmentType.RIGHT }),
            ],
          }),
        ],
      })
    )
  }

  // Offerta economica
  children.push(heading('Importo dell’offerta'))
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell('Importo lavori (IVA esclusa)', { bold: true, fill: 'F1F5FA' }),
            cell(euro(offerta.importo), { bold: true, align: AlignmentType.RIGHT }),
          ],
        }),
        ...(offerta.oneri_sicurezza
          ? [
              new TableRow({
                children: [
                  cell('di cui oneri della sicurezza'),
                  cell(euro(offerta.oneri_sicurezza), { align: AlignmentType.RIGHT }),
                ],
              }),
            ]
          : []),
      ],
    })
  )

  // Pagamenti
  if (offerta.pagamenti.length) {
    children.push(heading('Modalità di pagamento'))
    offerta.pagamenti.forEach((p) => {
      children.push(para(`• ${p.percentuale}% — ${p.descrizione}`))
    })
  }

  if (offerta.tempistiche) {
    children.push(heading('Tempistiche di realizzazione'))
    children.push(para(offerta.tempistiche))
  }
  if (offerta.esclusioni) {
    children.push(heading('Esclusioni'))
    children.push(para(offerta.esclusioni))
  }

  // Firma
  children.push(new Paragraph({ spacing: { before: 400 }, children: [] }))
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Per accettazione: ______________________________',
          size: 20,
          color: INK,
        }),
      ],
    })
  )

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}

export function offertaFileName(numero: string, cliente: string) {
  const safe = (s: string) => s.replace(/[^\w\-]+/g, '_')
  return `Offerta_${safe(numero)}_${safe(cliente)}.docx`
}
