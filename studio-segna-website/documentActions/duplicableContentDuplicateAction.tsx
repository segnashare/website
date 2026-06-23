'use client'

import {CopyIcon} from '@sanity/icons'
import {
  getVersionFromId,
  InsufficientPermissionsMessage,
  useCurrentUser,
  useDocumentOperation,
  useDocumentPairPermissions,
  useDocumentStore,
} from 'sanity'
import {useRouter} from 'sanity/router'
import {useCallback, useState} from 'react'
import {firstValueFrom} from 'rxjs'
import {filter} from 'rxjs/operators'
import type {SanityDocumentLike} from '@sanity/types'
import type {DocumentActionComponent} from 'sanity'

import {normalizePublishedId, shouldOfferCustomDuplicate} from './duplicatePolicy'

function randomSlugSuffix(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 10)
  }
  return String(Math.random()).replace(/^0\./, '').slice(0, 10)
}

function mapDuplicatedFields(schemaType: string, doc: SanityDocumentLike): SanityDocumentLike {
  const d = doc as Record<string, unknown>
  const copy = ' (copie)'

  const next: Record<string, unknown> = {...d}

  if (typeof d.title === 'string') {
    const title = d.title.trim() ? d.title.trim() : 'Sans titre'
    next.title = `${title}${copy}`
  }

  if (schemaType === 'newsroomPage' && typeof d.heroTitle === 'string' && d.heroTitle.trim()) {
    next.heroTitle = `${d.heroTitle.trim()}${copy}`
  }

  if (d.slug && typeof d.slug === 'object') {
    next.slug = {_type: 'slug', current: `copie-${randomSlugSuffix()}`}
  }

  return next as SanityDocumentLike
}

export const duplicableContentDuplicateAction: DocumentActionComponent = (props) => {
  const {id, type, release, version, onComplete} = props
  const publishedId = normalizePublishedId(props.id)

  if (!shouldOfferCustomDuplicate(type, publishedId)) {
    return null
  }

  const documentStore = useDocumentStore()
  const router = useRouter()
  const currentUser = useCurrentUser()
  const [isDuplicating, setDuplicating] = useState(false)

  const bundleId = version?._id ? getVersionFromId(version._id) : undefined
  const {duplicate} = useDocumentOperation(id, type, bundleId)

  const [permissions, isPermissionsLoading] = useDocumentPairPermissions({
    id,
    type,
    version: release,
    permission: 'duplicate',
  })

  const mapDocument = useCallback((doc: SanityDocumentLike) => mapDuplicatedFields(type, doc), [type])

  const handle = useCallback(async () => {
    const dupeId = crypto.randomUUID()
    setDuplicating(true)
    try {
      const duplicateSuccess = firstValueFrom(
        documentStore.pair.operationEvents(id, type).pipe(
          filter((ev) => ev.op === 'duplicate' && ev.type === 'success'),
        ),
      )
      duplicate.execute(dupeId, {mapDocument})
      await duplicateSuccess
      router.navigateIntent('edit', {id: dupeId, type})
    } finally {
      setDuplicating(false)
      onComplete()
    }
  }, [documentStore.pair, duplicate, id, mapDocument, onComplete, router, type])

  if (!isPermissionsLoading && !permissions?.granted) {
    return {
      icon: CopyIcon,
      disabled: true,
      label: 'Dupliquer',
      title: currentUser ? (
        <InsufficientPermissionsMessage context="duplicate-document" currentUser={currentUser} />
      ) : (
        'Non autorisé'
      ),
    }
  }

  const disabled = isDuplicating || Boolean(duplicate.disabled) || isPermissionsLoading

  return {
    icon: CopyIcon,
    disabled,
    label: isDuplicating ? 'Duplication…' : 'Dupliquer',
    title:
      duplicate.disabled === 'NOTHING_TO_DUPLICATE'
        ? 'Aucun contenu à dupliquer (enregistrez ou publiez le document).'
        : typeof duplicate.disabled === 'string'
          ? duplicate.disabled
          : '',
    onHandle: handle,
  }
}
