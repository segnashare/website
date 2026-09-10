import {useEffect, useMemo, useState} from 'react'
import {Box, Button, Card, Flex, Stack, Text, TextInput} from '@sanity/ui'
import {set, unset, type ArrayOfPrimitivesInputProps} from 'sanity'

export type CatalogFacetKind = 'categories' | 'brands' | 'colors' | 'materials' | 'tags'

type FacetOption = {slug: string; label: string}

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

function facetKindFromPath(path: ArrayOfPrimitivesInputProps['path']): CatalogFacetKind {
  const last = path[path.length - 1]
  if (last === 'brandSlugs') return 'brands'
  if (last === 'colorSlugs') return 'colors'
  if (last === 'materialSlugs') return 'materials'
  if (last === 'tagSlugs') return 'tags'
  return 'categories'
}

function asSlugList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((s) => s.length > 0)
}

function normalizeForSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

function slugifyFr(raw: string): string {
  const collapsed = normalizeForSearch(raw)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return collapsed
}

function isJsonResponse(res: Response): boolean {
  return (res.headers.get('content-type') || '').includes('application/json')
}

function mapNavList(raw: unknown): FacetOption[] {
  if (!Array.isArray(raw)) return []
  const out: FacetOption[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const slug = typeof (row as {slug?: string}).slug === 'string' ? (row as {slug: string}).slug.trim() : ''
    const label =
      typeof (row as {label?: string}).label === 'string' ? (row as {label: string}).label.trim() : slug
    if (!slug) continue
    out.push({slug, label: label || slug})
  }
  return out
}

async function readJson(res: Response): Promise<unknown> {
  if (!isJsonResponse(res)) {
    throw new Error(
      res.status === 404
        ? 'Liste catalogue pas encore déployée sur le site.'
        : `Réponse invalide (${res.status})`,
    )
  }
  return res.json()
}

async function loadFacetOptions(
  baseUrl: string,
  signal: AbortSignal,
): Promise<Record<CatalogFacetKind, FacetOption[]>> {
  const empty: Record<CatalogFacetKind, FacetOption[]> = {
    categories: [],
    brands: [],
    colors: [],
    materials: [],
    tags: [],
  }

  try {
    const res = await fetch(`${baseUrl}/api/marketing/catalog/facet-options`, {signal})
    if (res.ok && isJsonResponse(res)) {
      const data = (await res.json()) as Record<string, unknown>
      return {
        categories: mapNavList(data.categories),
        brands: mapNavList(data.brands),
        colors: mapNavList(data.colors),
        materials: mapNavList(data.materials),
        tags: mapNavList(data.tags),
      }
    }
    if (res.status !== 404) {
      await readJson(res)
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
  }

  const res = await fetch(`${baseUrl}/api/marketing/catalog/browse`, {signal})
  const data = (await readJson(res)) as {facets?: Record<string, unknown>; error?: string}
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Chargement impossible')
  const facets = data.facets ?? {}
  return {
    ...empty,
    categories: mapNavList(facets.categories),
    brands: mapNavList(facets.brands),
    colors: mapNavList(facets.colors),
  }
}

/**
 * Multi-sélection de slugs catalogue (catégories, marques, couleurs, matériaux, tags)
 * via l’API marketing du site, avec saisie manuelle si la liste ne charge pas.
 */
export function CatalogFacetSlugsInput(props: ArrayOfPrimitivesInputProps) {
  const {value, onChange, readOnly, path} = props
  const facet = facetKindFromPath(path)
  const selected = asSlugList(value)
  const selectedSet = useMemo(() => new Set(selected), [selected])

  const [options, setOptions] = useState<FacetOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const baseUrl = useMemo(() => catalogSearchBaseUrl(), [])

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const all = await loadFacetOptions(baseUrl, controller.signal)
        setOptions((all[facet] ?? []).filter((o) => o?.slug && o?.label))
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        setOptions([])
        setError((e as Error).message || 'Chargement impossible')
      } finally {
        setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [baseUrl, facet])

  const filtered = useMemo(() => {
    const needle = normalizeForSearch(search)
    if (!needle) return options
    return options.filter(
      (o) => normalizeForSearch(o.label).includes(needle) || normalizeForSearch(o.slug).includes(needle),
    )
  }, [options, search])

  const toggle = (slug: string) => {
    if (readOnly) return
    const next = selectedSet.has(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]
    onChange(next.length > 0 ? set(next) : unset())
  }

  const addDraft = () => {
    if (readOnly) return
    const slug = slugifyFr(draft)
    if (!slug) return
    if (!selectedSet.has(slug)) onChange(set([...selected, slug]))
    setDraft('')
  }

  return (
    <Stack space={3}>
      {baseUrl.includes('localhost') ? (
        <Text size={1} muted>
          Options via {baseUrl}
        </Text>
      ) : null}
      {options.length > 8 ? (
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder="Filtrer…"
          disabled={readOnly}
        />
      ) : null}
      {loading ? (
        <Text size={1} muted>
          Chargement…
        </Text>
      ) : null}
      {error ? (
        <Text size={1} style={{color: 'var(--card-badge-critical-fg-color)'}}>
          {error} Tu peux coller un slug à la main ci-dessous.
        </Text>
      ) : null}
      {selected.length > 0 ? (
        <Text size={1} muted>
          {selected.length} sélectionné{selected.length > 1 ? 's' : ''}
        </Text>
      ) : (
        <Text size={1} muted>
          Aucun filtre — ce ciblage n’applique pas ce critère.
        </Text>
      )}
      <Stack space={2} style={{maxHeight: 280, overflowY: 'auto'}}>
        {selected
          .filter((slug) => !options.some((o) => o.slug === slug))
          .map((slug) => (
            <Card
              key={`sel-${slug}`}
              padding={2}
              radius={2}
              shadow={1}
              tone="primary"
              style={{cursor: readOnly ? 'default' : 'pointer'}}
              onClick={() => toggle(slug)}
            >
              <Text size={1} weight="semibold">
                {slug}
              </Text>
            </Card>
          ))}
        {filtered.map((opt) => {
          const on = selectedSet.has(opt.slug)
          return (
            <Card
              key={opt.slug}
              padding={2}
              radius={2}
              shadow={1}
              tone={on ? 'primary' : 'transparent'}
              style={{cursor: readOnly ? 'default' : 'pointer'}}
              onClick={() => toggle(opt.slug)}
            >
              <Flex align="center" gap={3}>
                <Box
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    border: '1px solid var(--card-border-color)',
                    background: on ? 'var(--card-focus-ring-color)' : 'transparent',
                    flexShrink: 0,
                  }}
                />
                <Stack space={1} style={{minWidth: 0}}>
                  <Text size={1} weight={on ? 'semibold' : 'regular'}>
                    {opt.label}
                  </Text>
                  <Text size={0} muted>
                    {opt.slug}
                  </Text>
                </Stack>
              </Flex>
            </Card>
          )
        })}
        {!loading && filtered.length === 0 && !error ? (
          <Text size={1} muted>
            Aucune option.
          </Text>
        ) : null}
      </Stack>
      <Flex gap={2} align="center">
        <Box flex={1}>
          <TextInput
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            placeholder="Slug (ex. robes, ganni)"
            disabled={readOnly}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addDraft()
              }
            }}
          />
        </Box>
        <Button text="Ajouter" mode="ghost" disabled={readOnly || !slugifyFr(draft)} onClick={addDraft} />
      </Flex>
    </Stack>
  )
}
