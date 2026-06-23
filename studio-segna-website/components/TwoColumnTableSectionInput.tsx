import {useCallback, useState} from 'react'
import type {ObjectInputProps} from 'sanity'
import {set} from 'sanity'
import {randomKey} from '@sanity/util/content'

type RowDraft = {
  _type: 'twoColumnTableRow'
  _key: string
  firstCell: string
  secondCell: string
}

/** Ligne type Markdown GitHub : `| A | B |` (avec ou sans `|` aux extrémités). */
function splitMarkdownPipeRow(line: string): string[] | null {
  const t = line.trim()
  if (!t.includes('|')) return null
  let inner = t
  if (inner.startsWith('|')) inner = inner.slice(1)
  if (inner.endsWith('|')) inner = inner.slice(0, -1)
  const cells = inner.split('|').map((c) => c.trim())
  if (cells.length < 2) return null
  return cells
}

/** Ligne `| --- | --- |` (alignement Markdown) — à ignorer. */
function isMarkdownSeparatorLine(line: string): boolean {
  const cells = splitMarkdownPipeRow(line)
  if (!cells || cells.length < 2) return false
  return cells.every((cell) => /^\s*:?-{2,}:?\s*$/.test(cell))
}

function splitDataLine(line: string): string[] {
  const pipeCells = splitMarkdownPipeRow(line)
  if (pipeCells) return pipeCells

  const hasTab = line.includes('\t')
  if (hasTab) return line.split(/\t/).map((c) => c.trim())
  const semiCount = (line.match(/;/g) ?? []).length
  if (semiCount > 0) return line.split(';').map((c) => c.trim())
  return [line.trim(), '']
}

function linesFromPaste(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\u00a0/g, ' ').trimEnd())
    .filter((l) => l.length > 0)
    .filter((l) => !isMarkdownSeparatorLine(l))
}

function buildRows(dataLines: string[]): RowDraft[] {
  return dataLines
    .map((line) => {
      const cells = splitDataLine(line)
      return {
        _type: 'twoColumnTableRow' as const,
        _key: randomKey(12),
        firstCell: cells[0] ?? '',
        secondCell: cells[1] ?? '',
      }
    })
    .filter((r) => r.firstCell.trim() !== '' || r.secondCell.trim() !== '')
}

export function TwoColumnTableSectionInput(props: ObjectInputProps) {
  const {renderDefault, onChange, value} = props
  const [draft, setDraft] = useState('')
  const [firstLineIsHeader, setFirstLineIsHeader] = useState(true)

  const applyImport = useCallback(() => {
    const lines = linesFromPaste(draft)
    if (!lines.length) return

    let header1: string | undefined
    let header2: string | undefined
    let bodyLines = lines

    if (firstLineIsHeader) {
      const headCells = splitDataLine(lines[0])
      header1 = headCells[0] ?? ''
      header2 = headCells[1] ?? ''
      bodyLines = lines.slice(1)
    }

    const newRows = buildRows(bodyLines)
    if (!newRows.length) return

    const cur = (value ?? {}) as Record<string, unknown>
    const next: Record<string, unknown> = {
      ...cur,
      rows: newRows,
    }
    if (header1 !== undefined) next.firstColumnHeader = header1
    if (header2 !== undefined) next.secondColumnHeader = header2

    onChange(set(next))
    setDraft('')
  }, [draft, firstLineIsHeader, onChange, value])

  const pasteFromClipboard = useCallback(async () => {
    try {
      const t = await navigator.clipboard.readText()
      if (typeof t === 'string' && t.trim()) setDraft(t)
    } catch {
      /* permissions / navigateur */
    }
  }, [])

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
      <div
        style={{
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          padding: 14,
          background: '#f8fafc',
        }}
      >
        <div style={{fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 6}}>
          Coller un tableau
        </div>
        <p style={{margin: '0 0 10px', fontSize: 12, lineHeight: 1.45, color: '#475569'}}>
          Formats acceptés : <strong>Markdown</strong> (<code>|&nbsp;colonne&nbsp;1&nbsp;|&nbsp;colonne&nbsp;2&nbsp;|</code>,
          la ligne <code>| --- | --- |</code> est ignorée), <strong>Excel&nbsp;/&nbsp;Sheets</strong> (tabulations)
          ou <strong>point-virgule</strong>. Seules les <strong>deux premières colonnes</strong> sont importées.
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          placeholder="Collez ici (Cmd+V / Ctrl+V)…"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            fontSize: 12,
            fontFamily: 'ui-monospace, monospace',
            padding: 8,
            borderRadius: 6,
            border: '1px solid #94a3b8',
            marginBottom: 10,
            resize: 'vertical',
          }}
        />
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            fontSize: 12,
            color: '#334155',
            cursor: 'pointer',
            marginBottom: 12,
          }}
        >
          <input
            type="checkbox"
            checked={firstLineIsHeader}
            onChange={() => setFirstLineIsHeader((v) => !v)}
            style={{marginTop: 2}}
          />
          <span>La première ligne contient les en-têtes des colonnes (remplace les champs « En-tête — colonne 1 / 2 »).</span>
        </label>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
          <button
            type="button"
            onClick={pasteFromClipboard}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #94a3b8',
              background: '#fff',
              color: '#0f172a',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Lire le presse-papiers
          </button>
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={applyImport}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #0f172a',
              background: draft.trim() ? '#0f172a' : '#e2e8f0',
              color: draft.trim() ? '#fff' : '#94a3b8',
              fontSize: 12,
              fontWeight: 600,
              cursor: draft.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Importer dans les lignes
          </button>
        </div>
      </div>
      {renderDefault(props)}
    </div>
  )
}
