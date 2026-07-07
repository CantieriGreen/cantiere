import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

const BUCKET = 'allegati'

export type AllegatoCantiere = {
  id: string
  cantiere_id: string
  storage_path: string
  nome_file: string
  mime_type: string | null
  size_bytes: number | null
  origine: string
  offerta_id: string | null
  created_at: string
}

export function useAllegati(cantiereId: string | undefined) {
  return useQuery({
    queryKey: ['allegati', cantiereId],
    enabled: !!cantiereId,
    queryFn: async (): Promise<AllegatoCantiere[]> => {
      const { data, error } = await supabase
        .from('allegati_cantiere')
        .select('*')
        .eq('cantiere_id', cantiereId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as AllegatoCantiere[]
    },
  })
}

export function useUploadAllegato(cantiereId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (file: File): Promise<void> => {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${cantiereId}/${Date.now()}_${safeName}`
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false })
      if (upErr) throw upErr

      const { error: dbErr } = await supabase.from('allegati_cantiere').insert({
        cantiere_id: cantiereId,
        storage_path: path,
        nome_file: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        origine: 'upload',
        uploaded_by: user?.id ?? null,
      })
      if (dbErr) {
        // rollback file se la riga DB fallisce
        await supabase.storage.from(BUCKET).remove([path])
        throw dbErr
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['allegati', cantiereId] }),
  })
}

export function useDeleteAllegato(cantiereId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (allegato: AllegatoCantiere): Promise<void> => {
      await supabase.storage.from(BUCKET).remove([allegato.storage_path])
      const { error } = await supabase
        .from('allegati_cantiere')
        .delete()
        .eq('id', allegato.id)
      if (error) throw error
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['allegati', cantiereId] }),
  })
}

export async function downloadAllegato(allegato: AllegatoCantiere) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(allegato.storage_path, 60)
  if (error) throw error
  window.open(data.signedUrl, '_blank')
}
