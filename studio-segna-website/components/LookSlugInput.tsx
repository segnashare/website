import {useEffect} from 'react'
import {Stack, Text} from '@sanity/ui'
import {set, unset, useFormValue, type ObjectInputProps} from 'sanity'

type SlugValue = {_type?: 'slug'; current?: string}

export function slugifyLookTitle(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

/** Identifiant `?look=` déduit du titre du ciblage (pas du document Collection). */
export function LookSlugInput(props: ObjectInputProps<SlugValue>) {
  const {path, value, onChange, readOnly} = props
  const titleRaw = useFormValue([...path.slice(0, -1), 'title'])
  const title = typeof titleRaw === 'string' ? titleRaw : ''
  const next = slugifyLookTitle(title)
  const current = typeof value?.current === 'string' ? value.current.trim() : ''

  useEffect(() => {
    if (readOnly) return
    if (!next) {
      if (current) onChange(unset())
      return
    }
    if (current !== next) {
      onChange(set({_type: 'slug', current: next}))
    }
  }, [current, next, onChange, readOnly])

  return (
    <Stack space={2}>
      <Text size={1} muted>
        {next ? `URL : ?look=${next}` : 'Renseigne le titre — l’identifiant se remplit tout seul.'}
      </Text>
    </Stack>
  )
}
