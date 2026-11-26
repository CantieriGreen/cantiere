import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/PageHeader'
import { KPI } from '@/components/ui/KPI'
import { Card } from '@/components/ui/Card'
import { Table, type Column } from '@/components/ui/Table'
import { Icon } from '@/components/ui/Icon'
import { Money } from '@/components/ui/Money'
import { EmptyState } from '@/components/ui/EmptyState'
import { supabase } from '@/lib/supabase'
import { eu, pct as fmtPct } from '@/lib/utils'

/**
 * Costi indiretti visti dal capo cantiere: solo le quote ripartite sui
 * cantieri assegnati, in sola lettura. I costi generali dell'azienda e la
 * ripartizione restano all'amministratore (IndirettiScreen).
 * Il filtro per cantiere lo fanno le RLS di ripartizione_indiretto_righe.
 */

const DRIVER_LABEL: Record<string, string> = {
  percentuale_manuale: '% manuale',
  ore_lavorate: 'Ore lavorate',
  costi_diretti: 'Costi diretti',
  ricavi: 'Ricavi',
}

type Quota = {
  id: string
  percentuale: number
  importo: number
  cantiere_id: string
  cantiere: { codice: string; nome: string } | null
  ripartizione: { periodo_inizio: string; periodo_fine: string; driver: string } | null
}

type Riga = Quota & Record<string, unknown>

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

function useQuoteMieiCantieri() {
  return useQuery({
    queryKey: ['indiretti-capo'],
    queryFn: async (): Promise<Quota[]> => {
      const { data, error } = await supabase
        .from('ripartizione_indiretto_righe')
        .select(
          'id, percentuale, importo, cantiere_id, cantiere:cantieri(codice, nome), ripartizione:ripartizioni_indiretto(periodo_inizio, periodo_fine, driver)'
        )
      if (error) throw error
      return (data ?? []) as unknown as Quota[]
    },
  })
}

export function IndirettiCapoScreen() {
  const navigate = useNavigate()
  const { data: quote = [], isLoading } = useQuoteMieiCantieri()

  const righe: Riga[] = useMemo(
    () =>
      [...quote]
        .sort((a, b) =>
          (b.ripartizione?.periodo_inizio ?? '').localeCompare(a.ripartizione?.periodo_inizio ?? '')
        ) as Riga[],
    [quote]
  )
  const totale = righe.reduce((s, r) => s + r.importo, 0)
  const nCantieri = new Set(righe.map((r) => r.cantiere_id)).size

  const cols: Column<Riga>[] = [
    {
      key: 'periodo',
      label: 'Periodo',
      render: (r) =>
        r.ripartizione
          ? `${formatDate(r.ripartizione.periodo_inizio)} – ${formatDate(r.ripartizione.periodo_fine)}`
          : '—',
    },
    {
      key: 'cantiere',
      label: 'Cantiere',
      render: (r) => (
        <div>
          <div className="text-sm text-ink">{r.cantiere?.nome ?? '—'}</div>
          <div className="text-xs text-ink-soft font-mono">{r.cantiere?.codice}</div>
        </div>
      ),
    },
    {
      key: 'driver',
      label: 'Criterio',
      render: (r) => (r.ripartizione ? DRIVER_LABEL[r.ripartizione.driver] ?? r.ripartizione.driver : '—'),
    },
    {
      key: 'percentuale',
      label: 'Quota %',
      align: 'right',
      render: (r) => fmtPct(r.percentuale, 2),
    },
    {
      key: 'importo',
      label: 'Importo',
      align: 'right',
      width: 140,
      render: (r) => <Money value={r.importo} decimals={2} bold />,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Costi indiretti"
        banner="Quote dei costi di struttura (affitti, utenze, amministrazione…) ripartite dall'amministrazione sui tuoi cantieri."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <KPI label="Totale indiretti sui tuoi cantieri" value={eu(totale)} icon="building-2" />
        <KPI label="Cantieri con quote" value={String(nCantieri)} icon="hard-hat" />
      </div>

      <Card noPad className="overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center">
            <Icon name="loader-circle" size={22} className="animate-spin text-navy-600 mx-auto" />
          </div>
        ) : righe.length === 0 ? (
          <EmptyState
            icon="building-2"
            title="Nessuna quota sui tuoi cantieri"
            description="Le quote compaiono quando l'amministrazione applica la ripartizione dei costi indiretti di un periodo."
          />
        ) : (
          <Table
            columns={cols}
            rows={righe}
            onRowClick={(r) => navigate(`/cantieri/${r.cantiere_id}`)}
            footer={{ importo: <Money value={totale} decimals={2} bold /> }}
          />
        )}
      </Card>
    </div>
  )
}
