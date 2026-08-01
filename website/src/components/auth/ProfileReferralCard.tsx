'use client'

import {createSignedUrlForStoragePath} from '@/lib/catalog/storage-signed-url'
import {SEGNA_APP_BASE_URL} from '@/lib/catalog/catalog-app-links'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser-client'
import {useCallback, useEffect, useMemo, useState} from 'react'
import styles from './profilePage.module.css'

const STEPS = [
  'Partage ton lien d’invitation.',
  'Ton amie crée son compte sur Segna.',
  'Tu gagnes un échange inclus (livraison offerte).',
]

const TRUSTPILOT_REVIEW_URL = 'https://fr.trustpilot.com/review/segnashare.com'
const GOOGLE_REVIEW_URL = 'https://g.page/r/CWChbx3Nhlj2EBI/review'

function buildInviteUrl(code: string | null): string {
  const u = new URL('/auth/sign-up/email', `${SEGNA_APP_BASE_URL}/`)
  const trimmed = typeof code === 'string' ? code.trim() : ''
  if (trimmed) u.searchParams.set('ref', trimmed)
  return u.toString()
}

function extractCmsBannerStoragePath(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const bg = (payload as {background?: unknown}).background
  if (!bg || typeof bg !== 'object') return null
  const kind = (bg as {kind?: unknown}).kind
  if (kind !== 'image') return null
  const image = (bg as {image?: unknown}).image
  if (!image || typeof image !== 'object') return null
  const signed =
    typeof (image as {signed_url?: unknown}).signed_url === 'string'
      ? (image as {signed_url: string}).signed_url.trim()
      : ''
  if (signed) return signed
  const path =
    typeof (image as {storage_path?: unknown}).storage_path === 'string'
      ? (image as {storage_path: string}).storage_path.trim()
      : ''
  return path || null
}

function GoogleGLogo() {
  return (
    <svg className={styles.reviewIcon} viewBox="0 0 48 48" width={20} height={20} aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.344 4.337-17.694 10.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C39.09 35.883 44 30.564 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}

type Props = {
  referralCode: string | null
}

export function ProfileReferralCard({referralCode}: Props) {
  const [copied, setCopied] = useState(false)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const inviteUrl = useMemo(() => buildInviteUrl(referralCode), [referralCode])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const {data, error} = await supabase.rpc('get_cms_section_frames', {
          p_section_key: 'profile_referral_banner',
        })
        if (error || cancelled) return
        const rows = Array.isArray(data) ? data : []
        const shopCard = rows.find(
          (row) =>
            row &&
            typeof row === 'object' &&
            (row as {frame_type?: unknown}).frame_type === 'shop_link_card',
        )
        if (!shopCard || typeof shopCard !== 'object') return
        const raw = extractCmsBannerStoragePath((shopCard as {payload?: unknown}).payload)
        if (!raw || cancelled) return
        if (/^https?:\/\//i.test(raw)) {
          setBannerUrl(raw)
          return
        }
        const signed = await createSignedUrlForStoragePath(supabase, raw, 60 * 60 * 12, {
          explicitBucket: 'bucket_cms_app',
        })
        if (!cancelled && signed) setBannerUrl(signed)
      } catch {
        // fallback gradient
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleCopy = useCallback(async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }, [inviteUrl])

  const handleShare = useCallback(async () => {
    if (!inviteUrl) return
    const payload = {
      title: 'Rejoins-moi sur Segna ✨',
      text: `Échange de vêtements entre filles, dressing partagé.\n\nRejoins-moi sur Segna avec mon lien.`,
      url: inviteUrl,
    }
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(payload)
        return
      }
    } catch {
      // fallback copy
    }
    await handleCopy()
  }, [handleCopy, inviteUrl])

  useEffect(() => {
    setCopied(false)
  }, [referralCode])

  return (
    <div className={styles.referralBlock}>
      <section className={styles.referralOuter} aria-label="Parrainage">
        <div className={styles.referralInner}>
          <div className={styles.referralBannerWrap}>
            {bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bannerUrl}
                alt=""
                className={styles.referralBannerImg}
                width={640}
                height={272}
                decoding="async"
              />
            ) : (
              <div className={styles.referralBanner} aria-hidden />
            )}
          </div>

          <div className={styles.referralBody}>
            <header className={styles.referralHeader}>
              <h2 className={styles.referralTitle}>Invite une amie</h2>
              <p className={styles.referralLead}>
                Invite une amie à rejoindre le dressing partagé Segna.
              </p>
            </header>

            <ul className={styles.referralSteps}>
              {STEPS.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>

            <div className={styles.referralLinkBlock}>
              <p className={styles.referralLinkLabel}>Ton lien d’invitation</p>
              <div className={styles.referralLinkRow}>
                <button
                  type="button"
                  className={styles.referralIconBtn}
                  onClick={() => void handleCopy()}
                  disabled={!inviteUrl}
                  aria-label="Copier le lien d’invitation"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect
                      x="9"
                      y="9"
                      width="11"
                      height="11"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <p className={styles.referralLinkText}>{copied ? 'Copié !' : inviteUrl || '—'}</p>
                <button
                  type="button"
                  className={styles.referralShareBtn}
                  onClick={() => void handleShare()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                    <path
                      d="M8.3 10.8 15.6 6.7M8.3 13.2l7.3 4.1"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.reviewRow} aria-label="Laisser un avis">
        <a
          href={TRUSTPILOT_REVIEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.reviewCard}
          aria-label="Laisser un avis sur Trustpilot"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/trustpilot.svg"
            alt=""
            width={20}
            height={20}
            className={styles.reviewIcon}
            decoding="async"
          />
          <span className={styles.reviewLabel}>Laisser un avis</span>
        </a>
        <a
          href={GOOGLE_REVIEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.reviewCard}
          aria-label="Donner un avis sur Google"
        >
          <GoogleGLogo />
          <span className={styles.reviewLabel}>Donner un avis</span>
        </a>
      </div>
    </div>
  )
}
