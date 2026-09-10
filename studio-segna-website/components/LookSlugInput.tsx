import {useEffect} from 'react'
import {Box, Button, Flex, Stack, Text, TextInput} from '@sanity/ui'
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

/** Identifiant `?look=` — Generate lit le titre du ciblage, pas celui de la page. */
export function LookSlugInput(props: ObjectInputProps<SlugValue>) {
  const {path, value, onChange, readOnly} = props
  const parent = useFormValue(path.slice(0, -1)) as {title?: unknown} | undefined
  const title = typeof parent?.title === 'string' ? parent.title : ''
  const next = slugifyLookTitle(title)
  const current = typeof value?.current === 'string' ? value.current.trim() : ''

  useEffect(() => {
    if (readOnly || !next || current) return
    onChange(set({_type: 'slug', current: next}))
  }, [current, next, onChange, readOnly])

  const apply = (slug: string) => {
    if (readOnly) return
    const trimmed = slugifyLookTitle(slug) || slug.trim().toLowerCase()
    onChange(trimmed ? set({_type: 'slug', current: trimmed}) : unset())
  }

  return (
    <Stack space={3}>
      <Text size={1} muted>
        Généré depuis le titre de cet onglet (ex. Tout Voir → tout-voir).
      </Text>
      <Flex gap={2} align="center">
        <Box flex={1}>
          <TextInput
            value={current}
            readOnly={readOnly}
            placeholder={next || 'tout-voir'}
            onChange={(event) => apply(event.currentTarget.value)}
          />
        </Box>
        <Button
          text="Generate"
          mode="ghost"
          disabled={readOnly || !next}
          onClick={() => apply(next)}
        />
      </Flex>
    </Stack>
  )
}
