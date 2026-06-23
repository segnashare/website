/**
 * Sanity CLI + Vite/Rollup cassent souvent sur Node 23 (ERR_REQUIRE_ASYNC_MODULE, parseAst, …).
 * Plages alignées sur package.json > engines.
 */
const raw = process.version
const m = raw.match(/^v(\d+)\.(\d+)/)
if (!m) {
  console.error(`Version Node illisible : ${raw}`)
  process.exit(1)
}
const major = Number(m[1])
const minor = Number(m[2])

const ok =
  (major === 20 && minor >= 19) ||
  (major === 22 && minor >= 13) ||
  major >= 24

if (ok) {
  process.exit(0)
}

if (major === 23) {
  console.error(
    [
      `Node ${raw} : la v23 pose souvent ERR_REQUIRE_ASYNC_MODULE avec le CLI Sanity.`,
      '',
      'Passe en Node 22 LTS, par exemple :',
      '  brew install node@22',
      '  echo \'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"\' >> ~/.zshrc   # Apple Silicon',
      '  # ou : /usr/local/opt/node@22/bin sur Mac Intel',
      '  source ~/.zshrc && node -v',
      '',
      'Puis : rm -rf node_modules package-lock.json && npm install && npm run deploy',
    ].join('\n'),
  )
  process.exit(1)
}

console.error(
  `Node ${raw} n'est pas dans la plage supportée (20.19+, 22.13+, ou 24+). Voir package.json > engines.`,
)
process.exit(1)
