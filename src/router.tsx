import { lazy, type ComponentType } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/layout/AppShell'
import { RequireAuth } from '@/layout/RequireAuth'
import { Login } from '@/screens/Login'
import { AddonGuard } from '@/layout/AddonGuard'

/** Carica un export con nome come componente lazy (code-splitting per rotta). */
function lazyNamed<T extends Record<string, ComponentType<unknown>>>(
  loader: () => Promise<T>,
  name: keyof T
) {
  return lazy(() =>
    loader().then((m) => ({ default: m[name] as ComponentType<unknown> }))
  )
}

const Dashboard = lazyNamed(() => import('@/screens/Dashboard'), 'Dashboard')
const ClientiList = lazyNamed(() => import('@/features/clienti/ClientiList'), 'ClientiList')
const ClienteDetail = lazyNamed(() => import('@/features/clienti/ClienteDetail'), 'ClienteDetail')
const FornitoriList = lazyNamed(() => import('@/features/fornitori/FornitoriList'), 'FornitoriList')
const FornitoreDetail = lazyNamed(() => import('@/features/fornitori/FornitoreDetail'), 'FornitoreDetail')
const DipendentiList = lazyNamed(() => import('@/features/dipendenti/DipendentiList'), 'DipendentiList')
const DipendenteDetail = lazyNamed(() => import('@/features/dipendenti/DipendenteDetail'), 'DipendenteDetail')
const CantieriList = lazyNamed(() => import('@/features/cantieri/CantieriList'), 'CantieriList')
const CantiereDetail = lazyNamed(() => import('@/features/cantieri/CantiereDetail'), 'CantiereDetail')
const CantieriManutenzioneList = lazyNamed(() => import('@/features/cantieri/CantieriManutenzioneList'), 'CantieriManutenzioneList')
const RapportiniList = lazyNamed(() => import('@/features/rapportini/RapportiniList'), 'RapportiniList')
const RapportinoForm = lazyNamed(() => import('@/features/rapportini/RapportinoForm'), 'RapportinoForm')
const MaterialiList = lazyNamed(() => import('@/features/materiali/MaterialiList'), 'MaterialiList')
const RicaviList = lazyNamed(() => import('@/features/ricavi/RicaviList'), 'RicaviList')
const IndirettiScreen = lazyNamed(() => import('@/features/indiretti/IndirettiScreen'), 'IndirettiScreen')
const ReportScreen = lazyNamed(() => import('@/features/report/ReportScreen'), 'ReportScreen')
const ImpostazioniScreen = lazyNamed(() => import('@/features/impostazioni/ImpostazioniScreen'), 'ImpostazioniScreen')
const OfferteList = lazyNamed(() => import('@/features/offerte/OfferteList'), 'OfferteList')
const OffertaDetail = lazyNamed(() => import('@/features/offerte/OffertaDetail'), 'OffertaDetail')

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        path: '',
        element: <AppShell />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'cantieri', element: <CantieriList /> },
          { path: 'cantieri/:id', element: <CantiereDetail /> },
          {
            path: 'manutenzione',
            element: (
              <AddonGuard
                addon="manutenzione"
                nome="Cantieri manutenzione"
                descrizione="Gestione dedicata dei cantieri in manutenzione con vista e KPI separati."
              >
                <CantieriManutenzioneList />
              </AddonGuard>
            ),
          },
          {
            path: 'offerte',
            element: (
              <AddonGuard
                addon="offerte"
                nome="Offerte"
                descrizione="Preventivi commerciali con generazione documento Word, revisioni e conversione in cantiere."
              >
                <OfferteList />
              </AddonGuard>
            ),
          },
          {
            path: 'offerte/:id',
            element: (
              <AddonGuard
                addon="offerte"
                nome="Offerte"
                descrizione="Preventivi commerciali con generazione documento Word, revisioni e conversione in cantiere."
              >
                <OffertaDetail />
              </AddonGuard>
            ),
          },
          { path: 'rapportini', element: <RapportiniList /> },
          { path: 'rapportini/new', element: <RapportinoForm /> },
          { path: 'rapportini/:id/edit', element: <RapportinoForm /> },
          { path: 'materiali', element: <MaterialiList /> },
          { path: 'ricavi', element: <RicaviList /> },
          { path: 'indiretti', element: <IndirettiScreen /> },
          { path: 'anagrafiche/clienti', element: <ClientiList /> },
          { path: 'anagrafiche/clienti/:id', element: <ClienteDetail /> },
          { path: 'anagrafiche/fornitori', element: <FornitoriList /> },
          { path: 'anagrafiche/fornitori/:id', element: <FornitoreDetail /> },
          { path: 'anagrafiche/dipendenti', element: <DipendentiList /> },
          { path: 'anagrafiche/dipendenti/:id', element: <DipendenteDetail /> },
          { path: 'report', element: <ReportScreen /> },
          { path: 'impostazioni', element: <ImpostazioniScreen /> },
        ],
      },
    ],
  },
])
