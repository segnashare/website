import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {ObjectInputProps} from 'sanity'
import {set, useClient, useFormValue} from 'sanity'
import {randomKey} from '@sanity/util/content'

type Slot = {
  _key?: string
  top?: string
  right?: string
  bottom?: string
  left?: string
  width?: string
  height?: string
  objectFit?: string
  zIndex?: number
}

type StagedImageRow = {
  image?: {
    asset?: {
      metadata?: {dimensions?: {width?: number; height?: number; aspectRatio?: number}}
    }
  }
}

const MIN_BOX = 18

type EditorSpec = {
  workW: number
  workH: number
  vpX: number
  vpY: number
  vpW: number
  vpH: number
}

/**
 * Modèle de canvas « mobile » pour l’éditeur de cadres (aligné sur le front).
 *
 * - `home_strip` : accueil multi-états — visuels sous le texte, hauteur ~34dvh, largeur 100 % → bandeau plutôt paysage (W/H ≈ 1,35 sur téléphone type).
 * - `marketing_50vh` : pages marketing plein écran — `.visualBand` hauteur 50vh → sur téléphone le cadre utile est plus « portrait » (W/H ≈ 0,92).
 */
export type HeroMobileCanvasModel = 'home_strip' | 'marketing_50vh'

/**
 * Modèle de canvas « bureau » pour l’éditeur de cadres (aligné sur le front).
 *
 * - `home_fullviewport` : accueil — hero plein écran (~100vw × 100dvh), ratio proche 16:9 sur laptop type.
 * - `marketing_50vh` : pages marketing — `.visualBand` hauteur 50vh, pleine largeur → bandeau plus « panoramique » (W/H ≈ 2).
 */
export type HeroDesktopCanvasModel = 'home_fullviewport' | 'marketing_50vh'

export type HeroCanvasModels = {
  mobile: HeroMobileCanvasModel
  desktop: HeroDesktopCanvasModel
}

/** Zone en pointillés ≈ ratio carte tryptique du site (portrait 3:4). */
function editorSpecTriptychCard(): EditorSpec {
  const workW = 300
  const workH = 400
  const vpW = 200
  const vpH = Math.round((vpW * 4) / 3)
  const vpX = Math.round((workW - vpW) / 2)
  const vpY = Math.round((workH - vpH) / 2)
  return {workW, workH, vpX, vpY, vpW, vpH}
}

function editorSpecMobileHomeStrip(): EditorSpec {
  /* 100vw × 34dvh → W/H = 100/34 ≈ 2.94 en unités vh/vw comparables ; en pixels type 430×932 : 430/(0,34×932) ≈ 1,35. */
  const vpW = 320
  const vpH = Math.round(vpW / 1.35)
  const workW = 400
  const workH = 260
  const vpX = Math.round((workW - vpW) / 2)
  const vpY = Math.round((workH - vpH) / 2)
  return {workW, workH, vpX, vpY, vpW, vpH}
}

function editorSpecMobileMarketing50vh(): EditorSpec {
  /* 100vw × 50vh → sur 430×932 : 430/466 ≈ 0,92 (viewport plus haut que large). */
  const vpH = 320
  const vpW = Math.round(vpH * (430 / 466))
  const workW = 360
  const workH = 420
  const vpX = Math.round((workW - vpW) / 2)
  const vpY = Math.round((workH - vpH) / 2)
  return {workW, workH, vpX, vpY, vpW, vpH}
}

/** Accueil bureau : zone utile ≈ viewport 16:9 (images sur tout le hero). */
function editorSpecDesktopHomeFullViewport(): EditorSpec {
  const vpW = 320
  const vpH = Math.round((vpW * 9) / 16)
  const workW = 440
  const workH = 280
  const vpX = Math.round((workW - vpW) / 2)
  const vpY = Math.round((workH - vpH) / 2)
  return {workW, workH, vpX, vpY, vpW, vpH}
}

/** Marketing bureau : `.visualBand` = 100% × 50vh → W/H = 2. */
function editorSpecDesktopMarketing50vh(): EditorSpec {
  const vpW = 400
  const vpH = Math.round(vpW / 2)
  const workW = 480
  const workH = 270
  const vpX = Math.round((workW - vpW) / 2)
  const vpY = Math.round((workH - vpH) / 2)
  return {workW, workH, vpX, vpY, vpW, vpH}
}

function editorSpecForVariant(
  variant: 'desktop' | 'mobile' | 'triptych',
  models: HeroCanvasModels,
): EditorSpec {
  if (variant === 'triptych') {
    return editorSpecTriptychCard()
  }
  if (variant === 'mobile') {
    return models.mobile === 'marketing_50vh' ? editorSpecMobileMarketing50vh() : editorSpecMobileHomeStrip()
  }
  return models.desktop === 'marketing_50vh'
    ? editorSpecDesktopMarketing50vh()
    : editorSpecDesktopHomeFullViewport()
}

function parseLen(raw: string | undefined, ref: number, axis: 'x' | 'y'): number {
  if (raw == null) return 0
  const s = String(raw).trim()
  if (!s || s === 'auto') return 0
  const n = parseFloat(s)
  if (Number.isNaN(n)) return 0
  if (s.endsWith('%')) return (n / 100) * ref
  if (s.endsWith('px')) {
    const px = Math.abs(n)
    return Math.sign(n) * Math.min(px, ref * 2)
  }
  if (s.endsWith('vh')) return axis === 'y' ? (n / 100) * ref * 0.95 : (n / 100) * ref * 0.35
  if (s.endsWith('vw')) return axis === 'x' ? (n / 100) * ref * 0.95 : (n / 100) * ref * 0.35
  if (s.endsWith('rem')) return n * 10
  return 0
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

type Rect = {x: number; y: number; w: number; h: number}

function assetIdFromRow(row: StagedImageRow | undefined): string | undefined {
  const a = row?.image?.asset
  if (!a) return undefined
  if (typeof (a as {_ref?: string})._ref === 'string' && (a as {_ref: string})._ref) {
    return (a as {_ref: string})._ref
  }
  if (typeof (a as {_id?: string})._id === 'string' && (a as {_id: string})._id) {
    return (a as {_id: string})._id
  }
  return undefined
}

/** Ratio largeur/hauteur depuis le formulaire (souvent vide tant que l’asset n’est pas étendu). */
function aspectRatioFromRow(row: StagedImageRow | undefined): number | null {
  const d = row?.image?.asset?.metadata?.dimensions
  if (d?.aspectRatio && d.aspectRatio > 0) return d.aspectRatio
  if (d?.width && d?.height && d.height > 0) return d.width / d.height
  return null
}

function getEffectiveAspect(row: StagedImageRow | undefined, cache: Record<string, number>): number {
  const direct = aspectRatioFromRow(row)
  if (direct != null) return direct
  const id = assetIdFromRow(row)
  if (id && cache[id] != null && cache[id] > 0) return cache[id]
  return 16 / 9
}

/** Largeur du cadre depuis le slot ; la hauteur suit toujours le ratio de l’image (on ignore toute hauteur CMS). */
function slotToWorkspaceRectWithAspect(slot: unknown, spec: EditorSpec, ar: number): Rect {
  const {vpX, vpY, vpW, vpH} = spec
  const o = (slot && typeof slot === 'object' ? slot : {}) as Slot
  const safeAr = Math.max(0.02, ar)

  let w = parseLen(o.width, vpW, 'x') || vpW * 0.24
  w = Math.max(MIN_BOX, w)
  const h = w / safeAr

  let x = vpX + (o.left && o.left !== 'auto' ? parseLen(o.left, vpW, 'x') : 0)
  let y = vpY + (o.top && o.top !== 'auto' ? parseLen(o.top, vpH, 'y') : 0)

  if (!o.left || o.left === 'auto') {
    const r = parseLen(o.right, vpW, 'x')
    if (r) x = vpX + vpW - w - r
  }
  if (!o.top || o.top === 'auto') {
    const b = parseLen(o.bottom, vpH, 'y')
    if (b) y = vpY + vpH - h - b
  }

  return {x, y, w, h}
}

function workspaceRectToSlotProportional(r: Rect, spec: EditorSpec) {
  const {vpX, vpY, vpW, vpH} = spec
  const pct = (n: number, den: number) => `${Math.round((n / den) * 1000) / 10}%`
  return {
    left: pct(r.x - vpX, vpW),
    top: pct(r.y - vpY, vpH),
    right: 'auto' as const,
    bottom: 'auto' as const,
    width: pct(r.w, vpW),
    height: 'auto' as const,
    objectFit: '' as const,
  }
}

function clampPosKeepSize(r: Rect, spec: EditorSpec): Rect {
  const {vpX, vpY, vpW, vpH} = spec
  const padX = vpW * 1.15
  const padY = vpH * 1.15
  return {
    ...r,
    x: clamp(r.x, vpX - padX, vpX + vpW + padX - r.w),
    y: clamp(r.y, vpY - padY, vpY + vpH + padY - r.h),
  }
}

/** Borne position + taille en conservant largeur/hauteur = ratio image (largeur/hauteur). */
function clampWorkspaceRectKeepAspect(r: Rect, spec: EditorSpec, ar: number): Rect {
  const {vpX, vpY, vpW, vpH} = spec
  const padX = vpW * 1.15
  const padY = vpH * 1.15
  const maxW = vpW * 3.5
  const maxH = vpH * 3.5
  const safeAr = Math.max(0.02, ar)

  let w = clamp(r.w, MIN_BOX, maxW)
  let h = w / safeAr
  if (h > maxH) {
    h = maxH
    w = h * safeAr
  }
  w = Math.max(MIN_BOX, w)
  h = w / safeAr

  let x = clamp(r.x, vpX - padX, vpX + vpW + padX - w)
  let y = clamp(r.y, vpY - padY, vpY + vpH + padY - h)
  return {x, y, w, h}
}

function defaultSlotForIndex(i: number): Slot {
  return {
    _key: randomKey(10),
    top: `${6 + (i % 3) * 12}%`,
    left: `${4 + (i % 2) * 18}%`,
    width: `${22 - (i % 2) * 2}%`,
    height: 'auto',
    right: 'auto',
    bottom: 'auto',
    objectFit: '',
  }
}

function padSlots(
  slots: Array<Slot | Record<string, unknown>> | undefined,
  len: number,
): Slot[] {
  const out: Slot[] = []
  const base = slots ?? []
  for (let i = 0; i < len; i++) {
    const cur = base[i] as Slot | undefined
    if (cur && typeof cur === 'object') {
      out.push({
        ...cur,
        _key: typeof cur._key === 'string' ? cur._key : randomKey(10),
        height: 'auto',
        objectFit: '',
      })
    } else {
      out.push(defaultSlotForIndex(i))
    }
  }
  return out
}

export function HeroStateFrameBoardInput(props: ObjectInputProps) {
  const {path, value, onChange} = props
  const client = useClient({apiVersion: '2025-01-01'})
  const statePath = path.slice(0, -1)
  const imagesPath = useMemo(() => [...statePath, 'images'], [statePath])
  const images = useFormValue(imagesPath) as StagedImageRow[] | undefined
  const documentType = useFormValue(['_type']) as string | undefined

  const singleTriptychViewport = Boolean(
    (props.schemaType as {options?: {singleTriptychViewport?: boolean}} | undefined)?.options
      ?.singleTriptychViewport,
  )

  const imageCount = Math.min(5, Math.max(0, images?.length ?? 0))

  const [fetchedAspectByAssetId, setFetchedAspectByAssetId] = useState<Record<string, number>>({})
  const fetchedAspectRef = useRef(fetchedAspectByAssetId)
  fetchedAspectRef.current = fetchedAspectByAssetId

  const [variant, setVariant] = useState<'desktop' | 'mobile'>('desktop')
  /** Préréglage partagé : choisir quel front se rapproche le plus (accueil vs page marketing). */
  const [presetMobileCanvas, setPresetMobileCanvas] = useState<HeroMobileCanvasModel>('marketing_50vh')
  const [presetDesktopCanvas, setPresetDesktopCanvas] = useState<HeroDesktopCanvasModel>('marketing_50vh')

  const mobileCanvasModel: HeroMobileCanvasModel = useMemo(() => {
    if (documentType === 'marketingPage') return 'marketing_50vh'
    if (documentType === 'homePage') return 'home_strip'
    if (documentType === 'homeHeroStatePreset') return presetMobileCanvas
    return 'home_strip'
  }, [documentType, presetMobileCanvas])

  const desktopCanvasModel: HeroDesktopCanvasModel = useMemo(() => {
    if (documentType === 'marketingPage') return 'marketing_50vh'
    if (documentType === 'homePage') return 'home_fullviewport'
    if (documentType === 'homeHeroStatePreset') return presetDesktopCanvas
    return 'home_fullviewport'
  }, [documentType, presetDesktopCanvas])

  const canvasModels: HeroCanvasModels = useMemo(
    () => ({mobile: mobileCanvasModel, desktop: desktopCanvasModel}),
    [mobileCanvasModel, desktopCanvasModel],
  )

  const layoutVariant: 'desktop' | 'mobile' | 'triptych' = singleTriptychViewport ? 'triptych' : variant
  const spec = useMemo(
    () => editorSpecForVariant(layoutVariant, canvasModels),
    [layoutVariant, canvasModels],
  )
  const {workW, workH, vpX, vpY, vpW, vpH} = spec

  const frameSourceKey: 'framesDesktop' | 'framesMobile' = singleTriptychViewport
    ? 'framesDesktop'
    : variant === 'mobile'
      ? 'framesMobile'
      : 'framesDesktop'
  const frameLayoutVal = (value ?? {}) as {framesDesktop?: Slot[]; framesMobile?: Slot[]}
  const framesDesktop = frameLayoutVal.framesDesktop
  const framesMobile = frameLayoutVal.framesMobile

  const valueKey = `${frameSourceKey}:${JSON.stringify(frameLayoutVal[frameSourceKey] ?? [])}${singleTriptychViewport ? ':triptych' : ''}`

  useEffect(() => {
    const rows = (images ?? []).slice(0, imageCount)
    const ids = [...new Set(rows.map(assetIdFromRow).filter((x): x is string => Boolean(x)))]
    const cache = fetchedAspectRef.current
    const need = ids.filter((id) => {
      if (cache[id]) return false
      const hasFormMeta = rows.some((r) => assetIdFromRow(r) === id && aspectRatioFromRow(r) != null)
      return !hasFormMeta
    })
    if (!need.length) return

    let cancelled = false
    ;(async () => {
      try {
        const q = `*[_type == "sanity.imageAsset" && _id in $ids]{_id, metadata{dimensions{aspectRatio,width,height}}}`
        const res = await client.fetch<
          Array<{
            _id: string
            metadata?: {dimensions?: {aspectRatio?: number; width?: number; height?: number}}
          }>
        >(q, {ids: need})
        if (cancelled) return
        setFetchedAspectByAssetId((cur) => {
          const next = {...cur}
          for (const doc of res) {
            const d = doc.metadata?.dimensions
            let ar = d?.aspectRatio
            if ((ar == null || ar <= 0) && d?.width && d?.height && d.height > 0) {
              ar = d.width / d.height
            }
            if (ar != null && ar > 0) next[doc._id] = ar
          }
          return next
        })
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [images, imageCount, client])

  const aspects = useMemo(
    () =>
      (images ?? [])
        .slice(0, imageCount)
        .map((row) => getEffectiveAspect(row, fetchedAspectByAssetId)),
    [images, imageCount, fetchedAspectByAssetId],
  )

  const aspectsRef = useRef(aspects)
  aspectsRef.current = aspects

  const slots = useMemo(
    () => padSlots(frameSourceKey === 'framesMobile' ? framesMobile : framesDesktop, imageCount),
    [framesDesktop, framesMobile, frameSourceKey, imageCount],
  )

  const [rects, setRects] = useState<Rect[]>(() =>
    slots.map((s, i) => slotToWorkspaceRectWithAspect(s, spec, aspects[i] ?? 16 / 9)),
  )

  const interactionRef = useRef<{
    kind: 'drag' | 'resize'
    frameIndex: number
    px: number
    py: number
    rects: Rect[]
  } | null>(null)
  const gestureRectsRef = useRef<Rect[]>([])
  const [interaction, setInteraction] = useState<'drag' | 'resize' | null>(null)
  const [activeFrame, setActiveFrame] = useState(0)

  useEffect(() => {
    if (interaction) return
    const src = frameSourceKey === 'framesMobile' ? framesMobile : framesDesktop
    const next = padSlots(src, imageCount).map((s, i) =>
      slotToWorkspaceRectWithAspect(s, spec, aspects[i] ?? 16 / 9),
    )
    setRects(next)
  }, [valueKey, framesDesktop, framesMobile, frameSourceKey, imageCount, interaction, spec, aspects])

  const surfaceRef = useRef<HTMLDivElement>(null)
  const valueRef = useRef(value)
  valueRef.current = value

  const commitSlotsFromRects = useCallback(
    (nextRects: Rect[], v: 'desktop' | 'mobile' | 'triptych') => {
      if (imageCount <= 0) return
      const sp = editorSpecForVariant(v, canvasModels)
      const isTriptych = v === 'triptych'
      const storageKey: 'framesDesktop' | 'framesMobile' =
        isTriptych ? 'framesDesktop' : v === 'mobile' ? 'framesMobile' : 'framesDesktop'
      const prev = (valueRef.current ?? {}) as {framesDesktop?: Slot[]; framesMobile?: Slot[]}
      const padded = padSlots(prev[storageKey], imageCount)
      const arList = aspectsRef.current
      const merged: Slot[] = padded.map((slot, i) => {
        const ar = arList[i] ?? 16 / 9
        const r = clampWorkspaceRectKeepAspect(nextRects[i] ?? nextRects[0], sp, ar)
        const geo = workspaceRectToSlotProportional(r, sp)
        return {
          ...slot,
          ...geo,
        }
      })
      const mergedSlice = merged.slice(0, imageCount)
      if (isTriptych) {
        onChange(
          set({
            ...(valueRef.current as object),
            framesDesktop: mergedSlice,
            framesMobile: mergedSlice,
          }),
        )
      } else {
        onChange(
          set({
            ...(valueRef.current as object),
            [storageKey]: mergedSlice,
          }),
        )
      }
    },
    [onChange, imageCount, canvasModels],
  )

  const onPointerDownFrame = useCallback(
    (e: React.PointerEvent, frameIndex: number, kind: 'drag' | 'resize') => {
      if (e.button !== 0) return
      e.stopPropagation()
      setActiveFrame(frameIndex)
      const snapshot = rects.map((r) => ({...r}))
      gestureRectsRef.current = snapshot
      interactionRef.current = {
        kind,
        frameIndex,
        px: e.clientX,
        py: e.clientY,
        rects: snapshot,
      }
      setInteraction(kind)
    },
    [rects],
  )

  useEffect(() => {
    if (!interaction || !surfaceRef.current) return
    const surface = surfaceRef.current
    const meta = interactionRef.current
    if (!meta) return

    const onMove = (e: PointerEvent) => {
      const bounds = surface.getBoundingClientRect()
      const scaleX = workW / Math.max(1, bounds.width)
      const scaleY = workH / Math.max(1, bounds.height)
      const dx = (e.clientX - meta.px) * scaleX
      const dy = (e.clientY - meta.py) * scaleY
      const i = meta.frameIndex
      const ar = aspects[i] ?? 16 / 9
      const s = meta.rects[i]
      if (!s) return

      const next = meta.rects.map((r) => ({...r}))

      if (meta.kind === 'drag') {
        next[i] = clampPosKeepSize({x: s.x + dx, y: s.y + dy, w: s.w, h: s.h}, spec)
      } else {
        const nw = Math.max(MIN_BOX, s.w + dx)
        const nh = nw / ar
        next[i] = clampWorkspaceRectKeepAspect({x: s.x, y: s.y, w: nw, h: nh}, spec, ar)
      }
      gestureRectsRef.current = next
      setRects(next)
    }

    const onUp = () => {
      setInteraction(null)
      interactionRef.current = null
      commitSlotsFromRects(gestureRectsRef.current, layoutVariant)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [interaction, workW, workH, aspects, commitSlotsFromRects, layoutVariant, spec])

  const frameColors = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea']

  const onWheelSurface = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const i = activeFrame
      const ar = aspects[i] ?? 16 / 9
      const factor = e.deltaY > 0 ? 0.94 : 1.06
      setRects((prev) => {
        const r = prev[i]
        if (!r) return prev
        const cx = r.x + r.w / 2
        const cy = r.y + r.h / 2
        const nw = clamp(r.w * factor, MIN_BOX, vpW * 3.5)
        const nh = nw / ar
        const nx = cx - nw / 2
        const ny = cy - nh / 2
        const nr = clampWorkspaceRectKeepAspect({x: nx, y: ny, w: nw, h: nh}, spec, ar)
        const next = [...prev]
        next[i] = nr
        commitSlotsFromRects(next, layoutVariant)
        return next
      })
    },
    [activeFrame, aspects, vpW, spec, commitSlotsFromRects, layoutVariant],
  )

  if (imageCount === 0) {
    return (
      <div style={{fontSize: 12, color: '#64748b', padding: 12}}>
        Ajoute au moins une image dans la liste ci-dessus pour positionner les cadres.
      </div>
    )
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
      {!singleTriptychViewport ? (
        <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
          <span style={{fontSize: 12, fontWeight: 600, color: '#334155'}}>Vue</span>
          <button
            type="button"
            onClick={() => setVariant('desktop')}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: variant === 'desktop' ? '#1e293b' : '#fff',
              color: variant === 'desktop' ? '#fff' : '#334155',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Bureau
          </button>
          <button
            type="button"
            onClick={() => setVariant('mobile')}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: variant === 'mobile' ? '#1e293b' : '#fff',
              color: variant === 'mobile' ? '#fff' : '#334155',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Mobile (téléphone)
          </button>
        </div>
      ) : null}
      {!singleTriptychViewport && documentType === 'homeHeroStatePreset' && variant === 'mobile' ? (
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center'}}>
          <span style={{fontSize: 11, fontWeight: 600, color: '#475569'}}>Préréglage — cible mobile</span>
          <button
            type="button"
            onClick={() => setPresetMobileCanvas('home_strip')}
            style={{
              padding: '5px 10px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: presetMobileCanvas === 'home_strip' ? '#334155' : '#fff',
              color: presetMobileCanvas === 'home_strip' ? '#fff' : '#334155',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Accueil (bandeau court)
          </button>
          <button
            type="button"
            onClick={() => setPresetMobileCanvas('marketing_50vh')}
            style={{
              padding: '5px 10px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: presetMobileCanvas === 'marketing_50vh' ? '#334155' : '#fff',
              color: presetMobileCanvas === 'marketing_50vh' ? '#fff' : '#334155',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Page marketing (50 % vh)
          </button>
        </div>
      ) : null}
      {!singleTriptychViewport && documentType === 'homeHeroStatePreset' && variant === 'desktop' ? (
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center'}}>
          <span style={{fontSize: 11, fontWeight: 600, color: '#475569'}}>Préréglage — cible bureau</span>
          <button
            type="button"
            onClick={() => setPresetDesktopCanvas('home_fullviewport')}
            style={{
              padding: '5px 10px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: presetDesktopCanvas === 'home_fullviewport' ? '#334155' : '#fff',
              color: presetDesktopCanvas === 'home_fullviewport' ? '#fff' : '#334155',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Accueil (plein écran)
          </button>
          <button
            type="button"
            onClick={() => setPresetDesktopCanvas('marketing_50vh')}
            style={{
              padding: '5px 10px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: presetDesktopCanvas === 'marketing_50vh' ? '#334155' : '#fff',
              color: presetDesktopCanvas === 'marketing_50vh' ? '#fff' : '#334155',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Page marketing (50 % vh)
          </button>
        </div>
      ) : null}
      <p style={{fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.45}}>
        {singleTriptychViewport ? (
          <>
            Vue unique au <strong>ratio carte tryptique (3:4)</strong>, identique au rendu sur le
            site. Les cadres sont dupliqués automatiquement pour le pipeline (pas de variante
            bureau/mobile). Chaque cadre reprend le <strong>ratio du fichier image</strong>. Clic
            pour sélectionner, poignée et molette (Ctrl/Cmd) pour redimensionner. Zone en pointillés
            = surface utile de la carte.
          </>
        ) : (
          <>
            Tous les cadres sont visibles ensemble. Chaque cadre reprend le <strong>ratio largeur /
            hauteur du fichier image</strong> (métadonnées Sanity, ou chargement automatique). Clic
            pour sélectionner, poignée et molette pour redimensionner en conservant ce ratio. Zone
            en pointillés = zone utile du hero : <strong>bureau</strong> — <strong>accueil</strong>{' '}
            plein viewport (~16:9 type laptop) ; <strong>page marketing</strong> bandeau 50 % vh
            (plus panoramique). <strong>Mobile</strong> — <strong>accueil</strong> bandeau court sous
            le texte (~34 % vh) ; <strong>marketing</strong> bandeau 50 % vh, plus « portrait » sur
            téléphone. Sur chaque image : « Couvrir » + cadrage Sanity = rognage possible dans le
            cadre ; « Contenir » = image entière.
          </>
        )}
      </p>
      <div style={{padding: 8, overflow: 'visible'}}>
        <div
          ref={surfaceRef}
          role="presentation"
          onWheel={onWheelSurface}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: `${workW} / ${workH}`,
            borderRadius: 10,
            background: 'linear-gradient(165deg, #dce3ee 0%, #c5cedd 100%)',
            border: '1px solid rgb(148 163 184 / 0.9)',
            overflow: 'visible',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: (vpX / workW) * 100 + '%',
              top: (vpY / workH) * 100 + '%',
              width: (vpW / workW) * 100 + '%',
              height: (vpH / workH) * 100 + '%',
              boxSizing: 'border-box',
              border: '2px dashed rgb(71 85 105 / 0.85)',
              borderRadius: 8,
              background: 'rgb(248 250 252 / 0.3)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          {rects.slice(0, imageCount).map((r, i) => {
            const col = frameColors[i % frameColors.length]
            const selected = activeFrame === i
            return (
              <div
                key={slots[i]?._key ?? `f-${i}`}
                role="group"
                aria-label={`Cadre image ${i + 1}`}
                tabIndex={0}
                onPointerDown={(e) => {
                  if (e.target instanceof HTMLElement && e.target.getAttribute('data-resize') === '1')
                    return
                  onPointerDownFrame(e, i, 'drag')
                }}
                style={{
                  position: 'absolute',
                  left: (r.x / workW) * 100 + '%',
                  top: (r.y / workH) * 100 + '%',
                  width: (r.w / workW) * 100 + '%',
                  height: (r.h / workH) * 100 + '%',
                  boxSizing: 'border-box',
                  border: `2px solid ${col}`,
                  borderRadius: 6,
                  background: `${col}22`,
                  zIndex: 2 + i,
                  cursor: interaction && activeFrame === i ? 'grabbing' : 'grab',
                  touchAction: 'none',
                  boxShadow: selected ? `0 0 0 2px #fff, 0 0 0 4px ${col}` : undefined,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: col,
                    textShadow: '0 0 4px #fff',
                    pointerEvents: 'none',
                    padding: 4,
                  }}
                >
                  {i + 1}
                </span>
                {selected ? (
                  <button
                    type="button"
                    data-resize="1"
                    aria-label={`Redimensionner le cadre ${i + 1}`}
                    onPointerDown={(e) => onPointerDownFrame(e, i, 'resize')}
                    style={{
                      position: 'absolute',
                      right: -2,
                      bottom: -2,
                      width: 16,
                      height: 16,
                      padding: 0,
                      border: `2px solid ${col}`,
                      borderRadius: 3,
                      background: '#fff',
                      cursor: 'nwse-resize',
                    }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
      <details style={{fontSize: 12, color: '#475569'}}>
        <summary style={{cursor: 'pointer', fontWeight: 600}}>Données brutes (tableaux)</summary>
        <p style={{margin: '8px 0'}}>
          En cas de besoin, les tableaux « Cadres — bureau / mobile » restent éditables via le schéma
          classique ci-dessous.
        </p>
        {props.renderDefault(props)}
      </details>
    </div>
  )
}
