'use client'

import {FormEvent, useEffect, useRef, useState} from 'react'
import {useItemChat} from '@/components/item-chat/ItemChatProvider'
import {resolveStaffAvatarUrl} from '@/lib/item-chat/staff-avatars'
import {ITEM_CHAT_STAFF_JOINED_BODY} from '@/lib/item-chat/types'
import styles from './itemChatBubble.module.css'

function StaffAvatar({
  name,
  url,
}: {
  name: string
  url?: string | null
}) {
  const resolved = resolveStaffAvatarUrl(name, url)
  if (resolved) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt=""
        width={28}
        height={28}
        className={styles.staffAvatarSm}
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <span aria-hidden className={styles.staffAvatarFallbackSm}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const h = Math.floor(diff / 3_600_000)
    if (h < 1) return 'à l’instant'
    if (h < 24) return `il y a ${h} h`
    const days = Math.floor(h / 24)
    return `il y a ${days} j`
  } catch {
    return ''
  }
}

export function ItemChatBubble() {
  const {
    panelOpen,
    setPanelOpen,
    view,
    goToList,
    startNewChat,
    conversations,
    unreadCount,
    messages,
    conversation,
    pendingItem,
    sending,
    error,
    clearError,
    openConversation,
    sendMessage,
    submitUsefulnessRating,
  } = useItemChat()

  const [draft, setDraft] = useState('')
  const [listDraft, setListDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [browseEmptyList, setBrowseEmptyList] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listInputRef = useRef<HTMLInputElement>(null)

  const awaitingUsefulness =
    Boolean(conversation?.usefulnessPromptedAt) && !conversation?.usefulnessRating
  const showEmptyWelcome = view === 'list' && conversations.length === 0 && !browseEmptyList

  useEffect(() => {
    if (!panelOpen || view !== 'thread') return
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [panelOpen, view, messages.length])

  useEffect(() => {
    if (!panelOpen || !expanded) return
    const mq = window.matchMedia('(max-width: 767px)')
    if (!mq.matches) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [panelOpen, expanded])

  const title =
    conversation?.operatorDisplayName?.trim() ||
    (messages.find((m) => m.role === 'staff' && m.staffDisplayName?.trim())?.staffDisplayName?.trim() ??
      null) ||
    'Chatbot'

  const welcomeCopy = conversation?.itemId || pendingItem?.itemId
    ? "Qu'est-ce que tu aimerais savoir sur cette pièce ?"
    : "Qu'est-ce que tu aimerais savoir ?"

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    void sendMessage(text).then(() => setDraft(''))
  }

  const onListNewChat = (e: FormEvent) => {
    e.preventDefault()
    const text = listDraft.trim()
    if (!text || sending) return
    void startNewChat({initialMessage: text}).then(() => setListDraft(''))
  }

  return (
    <div className={`${styles.root} ${expanded ? styles.rootExpanded : ''}`}>
      {panelOpen ? (
        <div
          className={`${styles.panel} ${expanded ? styles.panelExpanded : ''}`}
          role="dialog"
          aria-label="Chat Segna"
        >
          {view === 'list' ? (
            showEmptyWelcome ? (
              <>
                <div className={styles.header}>
                  <div className={styles.headerLeft}>
                    <button
                      type="button"
                      className={styles.back}
                      aria-label="Toutes les discussions"
                      onClick={() => setBrowseEmptyList(true)}
                    >
                      ‹
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/segna-logo.svg" alt="Segna" className={styles.logo} width={72} height={28} />
                  </div>
                  <div className={styles.headerActions}>
                    <button
                      type="button"
                      className={styles.expand}
                      aria-label={expanded ? 'Réduire le chat' : 'Agrandir le chat'}
                      aria-pressed={expanded}
                      onClick={() => setExpanded((v) => !v)}
                    >
                      {expanded ? (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      className={styles.close}
                      aria-label="Fermer le chat"
                      onClick={() => {
                        setExpanded(false)
                        setPanelOpen(false)
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className={styles.thread}>
                  <div className={styles.bubbleStaff}>
                    <p className={styles.staffMeta}>
                      <strong>Segna</strong>
                    </p>
                    Une question sur une pièce&nbsp;? Un bug&nbsp;? Un problème&nbsp;?
                    Écris-nous ci-dessous pour démarrer.
                  </div>
                </div>
                <form className={styles.form} onSubmit={onListNewChat}>
                  <div className={styles.pillRow}>
                    <input
                      ref={listInputRef}
                      value={listDraft}
                      onChange={(e) => {
                        clearError()
                        setListDraft(e.target.value)
                      }}
                      placeholder="Demande-nous n’importe quoi…"
                      maxLength={4000}
                      className={styles.pillInput}
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !listDraft.trim()}
                      className={styles.pillSend}
                      aria-label="Envoyer"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                        <path d="M3.4 20.6 21 12 3.4 3.4 3 10.5l11 1.5L3 13.5z" />
                      </svg>
                    </button>
                  </div>
                  {error ? <p className={styles.error}>{error}</p> : null}
                </form>
              </>
            ) : (
            <>
              <div className={styles.header}>
                <p className={styles.headerListTitle}>Chat</p>
                <div className={styles.headerActions}>
                  <button
                    type="button"
                    className={styles.expand}
                    aria-label={expanded ? 'Réduire le chat' : 'Agrandir le chat'}
                    aria-pressed={expanded}
                    onClick={() => setExpanded((v) => !v)}
                  >
                    {expanded ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M8 21v-3a2 2 0 0 0-2-2H3M16 21v-3a2 2 0 0 1 2-2h3" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    className={styles.close}
                    aria-label="Fermer"
                    onClick={() => {
                      setExpanded(false)
                      setPanelOpen(false)
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className={styles.listView}>
                <div className={styles.listScroll}>
                  {conversations.length === 0 ? (
                    <p className={styles.emptyList}>Aucune discussion pour l’instant.</p>
                  ) : (
                    conversations.map((c) => {
                      const operatorName = c.operatorDisplayName?.trim() || null
                      const avatarSrc =
                        resolveStaffAvatarUrl(operatorName, c.operatorAvatarUrl) || '/brand/segna-logo.svg'
                      const listTitle = operatorName || 'Chatbot'
                      const preview =
                        c.lastMessagePreview?.trim() ||
                        (c.usefulnessRating ? 'Merci pour ton retour' : 'Ouvrir la discussion')
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={styles.listRow}
                          onClick={() => void openConversation(c.id)}
                        >
                          <span className={styles.listAvatarWrap}>
                            {c.unreadStaffCount > 0 ? (
                              <span className={styles.listUnreadDot} aria-label="Nouvelle réponse" />
                            ) : null}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={avatarSrc}
                              alt=""
                              className={styles.listAvatar}
                              width={36}
                              height={36}
                              referrerPolicy="no-referrer"
                            />
                          </span>
                          <span className={styles.listBody}>
                            <span className={styles.listTop}>
                              <span className={styles.listName}>{listTitle}</span>
                              <span className={styles.listWhen}>{formatWhen(c.lastMessageAt)}</span>
                            </span>
                            <span className={styles.listPreview}>{preview}</span>
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
                <form className={styles.listComposer} onSubmit={onListNewChat}>
                  <div className={styles.pillRow}>
                    <input
                      ref={listInputRef}
                      value={listDraft}
                      onChange={(e) => {
                        clearError()
                        setListDraft(e.target.value)
                      }}
                      placeholder="Nouveau chat…"
                      maxLength={4000}
                      className={styles.pillInput}
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !listDraft.trim()}
                      className={styles.pillSend}
                      aria-label="Envoyer"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                        <path d="M3.4 20.6 21 12 3.4 3.4 3 10.5l11 1.5L3 13.5z" />
                      </svg>
                    </button>
                  </div>
                  {error ? <p className={styles.error}>{error}</p> : null}
                </form>
              </div>
            </>
            )
          ) : (
            <>
              <div className={styles.header}>
                <div className={styles.headerLeft}>
                  <button
                    type="button"
                    className={styles.back}
                    aria-label="Toutes les discussions"
                    onClick={goToList}
                  >
                    ‹
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      resolveStaffAvatarUrl(
                        conversation?.operatorDisplayName,
                        conversation?.operatorAvatarUrl,
                      ) ||
                      resolveStaffAvatarUrl(
                        messages.find((m) => m.role === 'staff' && m.staffDisplayName)?.staffDisplayName,
                        messages.find((m) => m.role === 'staff' && m.staffAvatarUrl)?.staffAvatarUrl,
                      ) ||
                      '/brand/segna-logo.svg'
                    }
                    alt=""
                    className={styles.headerAvatar}
                    width={32}
                    height={32}
                    referrerPolicy="no-referrer"
                  />
                  <p className={styles.headerThreadTitle}>{title}</p>
                </div>
                <div className={styles.headerActions}>
                  <button
                    type="button"
                    className={styles.expand}
                    aria-label={expanded ? 'Réduire le chat' : 'Agrandir le chat'}
                    aria-pressed={expanded}
                    onClick={() => setExpanded((v) => !v)}
                  >
                    {expanded ? (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    className={styles.close}
                    aria-label="Fermer le chat"
                    onClick={() => {
                      setExpanded(false)
                      setPanelOpen(false)
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div ref={listRef} className={styles.thread}>
                <div className={styles.bubbleStaff}>
                  <p className={styles.staffMeta}>
                    <strong>Segna</strong>
                  </p>
                  {welcomeCopy}
                </div>

                {messages.map((m) => {
                  if (m.role === 'visitor') {
                    return (
                      <div key={m.id} className={styles.bubbleVisitor}>
                        {m.body}
                      </div>
                    )
                  }
                  if (m.role === 'system') {
                    const joinName = m.staffDisplayName?.trim()
                    if (joinName && m.body === ITEM_CHAT_STAFF_JOINED_BODY) {
                      return (
                        <p key={m.id} className={styles.staffJoined}>
                          <strong>{joinName}</strong> a rejoint la conversation
                        </p>
                      )
                    }
                    return (
                      <div key={m.id} className={styles.bubbleSystem}>
                        {m.body}
                      </div>
                    )
                  }
                  const name = m.staffDisplayName?.trim()
                  if (name) {
                    return (
                      <div key={m.id} className={styles.staffRow}>
                        <StaffAvatar name={name} url={m.staffAvatarUrl} />
                        <div className={`${styles.bubbleStaff} ${styles.staffBubble}`}>
                          <p className={styles.staffMeta}>
                            <strong>{name}</strong>
                          </p>
                          {m.body}
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={m.id} className={styles.bubbleStaffSolo}>
                      {m.body}
                    </div>
                  )
                })}
                {awaitingUsefulness ? (
                  <div className={styles.usefulnessRow}>
                    <button
                      type="button"
                      className={styles.usefulnessBtn}
                      disabled={sending}
                      onClick={() => void submitUsefulnessRating('yes')}
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      className={styles.usefulnessBtn}
                      disabled={sending}
                      onClick={() => void submitUsefulnessRating('no')}
                    >
                      Non
                    </button>
                  </div>
                ) : !conversation?.usefulnessRating &&
                  messages.some((m) => m.role === 'visitor') &&
                  !messages.some(
                    (m) =>
                      m.role === 'system' &&
                      m.body === ITEM_CHAT_STAFF_JOINED_BODY &&
                      m.staffDisplayName,
                  ) ? (
                  <p className={styles.awaiting}>En attente de réponse</p>
                ) : null}
              </div>

              <form className={styles.form} onSubmit={onSubmit}>
                <div className={styles.pillRow}>
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => {
                      clearError()
                      setDraft(e.target.value)
                    }}
                    placeholder="Demande-nous n’importe quoi…"
                    maxLength={4000}
                    className={styles.pillInput}
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className={styles.pillSend}
                    aria-label="Envoyer"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                      <path d="M3.4 20.6 21 12 3.4 3.4 3 10.5l11 1.5L3 13.5z" />
                    </svg>
                  </button>
                </div>
                {error ? <p className={styles.error}>{error}</p> : null}
              </form>
            </>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className={styles.fab}
        aria-label={panelOpen ? 'Fermer le chat pièce' : 'Ouvrir le chat pièce'}
        onClick={() => {
          if (panelOpen) {
            setExpanded(false)
            setPanelOpen(false)
          } else {
            clearError()
            setBrowseEmptyList(false)
            goToList()
            setPanelOpen(true)
          }
        }}
      >
        {panelOpen ? (
          <span className={styles.fabClose}>×</span>
        ) : (
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" strokeLinejoin="round" />
          </svg>
        )}
        {unreadCount > 0 && !panelOpen ? (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        ) : null}
      </button>
    </div>
  )
}
