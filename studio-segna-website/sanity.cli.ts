import {defineCliConfig} from 'sanity/cli'
import type {InlineConfig} from 'vite'

/**
 * Pré-bundle explicite des deps souvent en CJS : avec `optimizeDeps.exclude: ['sanity']`, elles ne sont plus
 * tirées par le graphe du pré-pack de `sanity`. Liste large (sanity + @sanity/schema + chaînes connues) pour
 * limiter les erreurs « no default export » une par une.
 *
 * React 18+ expose les entrées `react-dom` (client, server, etc.) en CJS. Sans pré-bundle, le navigateur
 * reçoit du CJS brut → erreurs « does not provide an export named 'createRoot' / 'renderToStaticMarkup' ».
 */
const REACT_PREBUNDLE = [
  'react',
  'react-dom',
  'react-dom/client',
  'react-dom/server',
  'react-dom/server.browser',
  'react/jsx-runtime',
] as const

const CJS_PREBUNDLE = [
  '@isaacs/ttlcache',
  '@portabletext/editor',
  '@portabletext/html',
  '@portabletext/react',
  '@portabletext/toolkit',
  '@rexxars/react-json-inspector',
  '@sanity/bifur-client',
  '@sanity/client',
  '@sanity/descriptors',
  '@sanity/diff',
  '@sanity/id-utils',
  '@sanity/mutate',
  '@sanity/mutator',
  '@sanity/schema',
  '@sanity/util',
  '@xstate/react',
  'arrify',
  'classnames',
  'dataloader',
  'debounce',
  'debug',
  'exif-component',
  'fast-deep-equal',
  'groq-js',
  'hoist-non-react-statics',
  'html-parse-stringify',
  'humanize-list',
  'json-reduce',
  'json-stable-stringify',
  'leven',
  'lodash',
  'lodash/deburr',
  'lodash/get',
  'lodash/groupBy',
  'lodash/isObject',
  'lodash/keyBy',
  'lodash/merge',
  'lodash/partition',
  'lodash/sortedIndex',
  'mendoza',
  'ms',
  'nano-pubsub',
  'object-inspect',
  'polished',
  'prop-types',
  'quick-lru',
  'raf',
  'react-compiler-runtime',
  'react-fast-compare',
  'react-focus-lock',
  'react/compiler-runtime',
  'react-is',
  'semver',
  'shallow-equals',
  'speakingurl',
  'use-sync-external-store',
  'use-sync-external-store/shim',
  'use-sync-external-store/shim/index.js',
  'use-sync-external-store/shim/with-selector',
  'use-sync-external-store/with-selector',
  'void-elements',
  'xstate',
] as const

export default defineCliConfig({
  api: {
    projectId: '1qxhnoe8',
    dataset: 'production',
  },
  /** Studio hébergé : https://segna-website.sanity.studio/ — évite de redemander l’app id au `sanity deploy`. */
  deployment: {
    appId: 'ynku2okrvb1grrnv27oa32tf',
  },
  vite: (config: InlineConfig) => {
    const od = config.optimizeDeps ?? {}
    const ex = Array.isArray(od.exclude) ? od.exclude : []
    const inc = Array.isArray(od.include) ? od.include : []
    const res = config.resolve ?? {}
    const prevDedupe = Array.isArray(res.dedupe) ? res.dedupe : []
    return {
      ...config,
      optimizeDeps: {
        ...od,
        exclude: [...new Set([...ex, 'sanity'])],
        include: [...new Set([...inc, ...REACT_PREBUNDLE, ...CJS_PREBUNDLE, 'styled-components'])],
      },
      resolve: {
        ...res,
        dedupe: [...new Set([...prevDedupe, 'styled-components', 'react', 'react-dom'])],
      },
    }
  },
})
