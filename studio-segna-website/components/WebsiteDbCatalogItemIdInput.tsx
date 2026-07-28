import {useCallback, useEffect, useMemo, useState} from 'react'
import {Box, Button, Card, Flex, Stack, Text, TextInput} from '@sanity/ui'
import type {StringInputProps} from 'sanity'
import {set, unset} from 'sanity'

type SearchHit = {
  id: string
  title: string
  brand_label: string | null
  coverUrl: string | null
  status?: string | null
  marketingEligible?: boolean
}

type UuidDiagnostic = 'not_in_db' | 'not_marketing_eligible' | null

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function catalogSearchBaseUrl(): string {
  const fromEnv = (import.meta as ImportMeta & {env?: Record<string, string>}).env
    ?.SANITY_STUDIO_WEBSITE_URL
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/$/, '')
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3002'
  }
  return 'https://www.segnashare.com'
}

/**
 * Remplace le champ UUID brut : recherche les pièces catalogue Segna (même base que le back-office)
 * via l’API marketing du site, puis enregistre l’`itemId`.
 */
export function WebsiteDbCatalogItemIdInput(props: StringInputProps) {
  const {value, onChange, readOnly} = props
  const currentId = typeof value === 'string' ? value.trim() : ''

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uuidDiagnostic, setUuidDiagnostic] = useState<UuidDiagnostic>(null)
  const [selectedMeta, setSelectedMeta] = useState<SearchHit | null>(null)

  const baseUrl = useMemo(() => catalogSearchBaseUrl(), [])

  useEffect(() => {
    if (!currentId || !UUID_RE.test(currentId)) {
      setSelectedMeta(null)
      return
    }
    const controller = new AbortController()
    void (async () => {
      try {
        const res = await fetch(
          `${baseUrl}/api/marketing/catalog/search?q=${encodeURIComponent(currentId)}&limit=1`,
          {signal: controller.signal},
        )
        const data = (await res.json()) as {
          items?: SearchHit[]
          uuidDiagnostic?: UuidDiagnostic
          error?: string
        }
        if (!res.ok) throw new Error(data.error ?? 'Chargement impossible')
        const hit = data.items?.[0]
        if (hit) setSelectedMeta(hit)
        else setSelectedMeta({id: currentId, title: currentId, brand_label: null, coverUrl: null})
      } catch {
        setSelectedMeta({id: currentId, title: currentId, brand_label: null, coverUrl: null})
      }
    })()
    return () => controller.abort()
  }, [baseUrl, currentId])

  useEffect(() => {
    if (selectedMeta || readOnly) return
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setLoading(false)
      setError(null)
      setUuidDiagnostic(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setUuidDiagnostic(null)
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `${baseUrl}/api/marketing/catalog/search?q=${encodeURIComponent(q)}&limit=12`,
            {signal: controller.signal},
          )
          const data = (await res.json()) as {
            items?: SearchHit[]
            uuidDiagnostic?: UuidDiagnostic
            error?: string
          }
          if (!res.ok) throw new Error(data.error ?? 'Recherche impossible')
          setHits(Array.isArray(data.items) ? data.items : [])
          setUuidDiagnostic(data.uuidDiagnostic ?? null)
        } catch (e) {
          if ((e as Error).name === 'AbortError') return
          setHits([])
          setError((e as Error).message || 'Recherche impossible')
        } finally {
          setLoading(false)
        }
      })()
    }, 280)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [baseUrl, query, readOnly, selectedMeta])

  const pick = useCallback(
    (hit: SearchHit) => {
      onChange(set(hit.id))
      setSelectedMeta(hit)
      setQuery('')
      setHits([])
      setUuidDiagnostic(null)
    },
    [onChange],
  )

  const keepRawUuid = useCallback(() => {
    const id = query.trim()
    if (!UUID_RE.test(id)) return
    onChange(set(id))
    setSelectedMeta({id, title: id, brand_label: null, coverUrl: null})
    setQuery('')
    setHits([])
    setUuidDiagnostic(null)
  }, [onChange, query])

  const clear = useCallback(() => {
    onChange(unset())
    setSelectedMeta(null)
    setQuery('')
    setHits([])
  }, [onChange])

  if (selectedMeta || (currentId && UUID_RE.test(currentId))) {
    const meta = selectedMeta ?? {
      id: currentId,
      title: currentId,
      brand_label: null,
      coverUrl: null,
    }
    const warnNotEligible = meta.marketingEligible === false
    return (
      <Card padding={3} radius={2} shadow={1} tone={warnNotEligible ? 'caution' : 'transparent'} border>
        <Flex align="center" gap={3}>
          {meta.coverUrl ? (
            <img
              src={meta.coverUrl}
              alt=""
              style={{width: 56, height: 56, objectFit: 'cover', borderRadius: 6, flexShrink: 0}}
            />
          ) : (
            <Box
              style={{
                width: 56,
                height: 56,
                borderRadius: 6,
                background: 'var(--card-muted-bg-color)',
                flexShrink: 0,
              }}
            />
          )}
          <Stack space={2} style={{flex: 1, minWidth: 0}}>
            <Text size={1} weight="semibold">
              {meta.title}
            </Text>
            {meta.brand_label ? (
              <Text size={1} muted>
                {meta.brand_label}
              </Text>
            ) : null}
            {warnNotEligible ? (
              <Text size={0} muted>
                Présente en base mais hors filtres catalogue site (statut : {meta.status ?? '—'}).
                Elle n’apparaîtra pas sur le site tant qu’elle n’est pas éligible marketing.
              </Text>
            ) : null}
            <Text size={0} muted style={{fontFamily: 'monospace'}}>
              {meta.id}
            </Text>
          </Stack>
          {!readOnly ? (
            <Button text="Changer" mode="ghost" onClick={clear} fontSize={1} />
          ) : null}
        </Flex>
      </Card>
    )
  }

  return (
    <Stack space={3}>
      <TextInput
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        placeholder="Rechercher une pièce (titre ou UUID)…"
        disabled={readOnly}
      />
      {loading ? (
        <Text size={1} muted>
          Recherche…
        </Text>
      ) : null}
      {error ? (
        <Text size={1} style={{color: 'var(--card-badge-critical-fg-color)'}}>
          {error}
        </Text>
      ) : null}
      {hits.length > 0 ? (
        <Stack space={2}>
          {hits.map((hit) => (
            <Card
              key={hit.id}
              padding={2}
              radius={2}
              shadow={1}
              tone={hit.marketingEligible === false ? 'caution' : 'transparent'}
              style={{cursor: readOnly ? 'default' : 'pointer'}}
              onClick={() => {
                if (!readOnly) pick(hit)
              }}
            >
              <Flex align="center" gap={3}>
                {hit.coverUrl ? (
                  <img
                    src={hit.coverUrl}
                    alt=""
                    style={{
                      width: 44,
                      height: 44,
                      objectFit: 'cover',
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <Box
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 4,
                      background: 'var(--card-muted-bg-color)',
                      flexShrink: 0,
                    }}
                  />
                )}
                <Stack space={1} style={{minWidth: 0}}>
                  <Text size={1} weight="semibold">
                    {hit.title}
                  </Text>
                  <Text size={0} muted>
                    {[hit.brand_label, hit.status, hit.marketingEligible === false ? 'hors site' : null]
                      .filter(Boolean)
                      .join(' · ') || hit.id.slice(0, 8) + '…'}
                  </Text>
                </Stack>
              </Flex>
            </Card>
          ))}
        </Stack>
      ) : null}
      {!loading && query.trim().length >= 2 && hits.length === 0 && !error ? (
        <Stack space={2}>
          <Text size={1} muted>
            {uuidDiagnostic === 'not_in_db'
              ? 'Cette pièce n’existe pas dans la base branchée au site local (staging). Souvent un UUID de production : cherche par titre ici, ou utilise une pièce du même environnement que le site.'
              : 'Aucune pièce trouvée.'}
          </Text>
          {UUID_RE.test(query.trim()) && !readOnly ? (
            <Button
              text="Garder cet UUID quand même"
              mode="ghost"
              fontSize={1}
              onClick={keepRawUuid}
            />
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  )
}
