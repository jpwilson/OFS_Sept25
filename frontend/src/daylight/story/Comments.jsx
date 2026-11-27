// Comments with real faces and replies three levels deep (owner: STORY).
// Used for the story (useStoryExtras) and for one photo in the lightbox (/media/{id}/comments).
//   <Comments comments me authorId canWrite onSignIn actions={{comment, deleteComment, react, unreact}} />
// The API returns a flat list with parent_id and depth; a reply is allowed below depth 2
// (the server's limit, EventDetail.jsx:717).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../ui/Avatar.jsx'
import { Button } from '../ui/Button.jsx'
import { Dialog } from '../ui/Dialog.jsx'
import { cx } from '../ui/cx.js'
import { ReactionButton } from './Reactions.jsx'
import { ago, commentTree } from './words.js'
import s from './Comments.module.css'

const MAX_DEPTH = 2
const nameOf = (c) => c.author_display_name || c.author_full_name || c.author_username || 'Someone'

export default function Comments({ comments, me, authorId, canWrite, onSignIn, actions, placeholder = 'Write a comment', empty = 'No comments yet.', compact }) {
  const tree = useMemo(() => commentTree(comments), [comments])
  const [replyTo, setReplyTo] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const remove = async () => {
    setBusy(true)
    try {
      await actions.deleteComment(confirm.id)
      setConfirm(null)
    } catch (e) {
      setErr(e.message || 'The comment was not deleted.')
    }
    setBusy(false)
  }
  const one = (c, depth) => (
    <li key={c.id} className={s.item} data-depth={depth}>
      <Comment
        c={c}
        depth={depth}
        me={me}
        authorId={authorId}
        canWrite={canWrite}
        onSignIn={onSignIn}
        actions={actions}
        replying={replyTo === c.id}
        onReply={() => (canWrite ? setReplyTo(replyTo === c.id ? null : c.id) : onSignIn?.())}
        onDelete={() => setConfirm(c)}
        onReplied={() => setReplyTo(null)}
      />
      {c.replies.length ? <ol className={s.replies}>{c.replies.map((r) => one(r, depth + 1))}</ol> : null}
    </li>
  )
  return (
    <div className={cx(s.wrap, compact && s.compact)} data-ui="comments">
      {canWrite ? <Composer me={me} placeholder={placeholder} onPost={(t) => actions.comment(t, null)} /> : null}
      {tree.length ? <ol className={s.list}>{tree.map((c) => one(c, 0))}</ol> : <p className={s.empty}>{empty}</p>}
      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete this comment?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Keep it</Button>
            <Button variant="danger" busy={busy} onClick={remove}>Delete</Button>
          </>
        }
      >
        <p className={s.confirmText}>{confirm?.replies?.length ? 'Its replies go with it. ' : ''}This cannot be undone.</p>
        {err ? <p className={s.err} role="alert">{err}</p> : null}
      </Dialog>
    </div>
  )
}

function Comment({ c, depth, me, authorId, canWrite, onSignIn, actions, replying, onReply, onDelete, onReplied }) {
  const name = nameOf(c)
  const canDelete = canWrite && me && (me.id === c.author_id || me.id === authorId)
  return (
    <article className={s.comment} data-ui="comment">
      <Link to={`/profile/${c.author_username}`} className={s.face} tabIndex={-1} aria-hidden="true">
        <Avatar name={name} src={c.author_avatar_url} size={depth ? 32 : 40} />
      </Link>
      <div className={s.main}>
        <header className={s.head}>
          <Link to={`/profile/${c.author_username}`} className={s.name}>{name}</Link>
          {c.author_id === authorId ? <span className={s.badge}>Author</span> : null}
          <time className={cx(s.when, 'a-mono')} dateTime={c.created_at}>{ago(c.created_at)}</time>
        </header>
        <p className={s.text}>{c.content}</p>
        <div className={s.actions}>
          {actions.react ? (
            <ReactionButton
              variant="plain"
              counts={c.reaction_counts}
              total={c.reaction_count}
              mine={c.user_reaction}
              label={`React to ${name}'s comment`}
              disabled={!canWrite}
              onDisabled={onSignIn}
              onPick={(t) => (t ? actions.react(c.id, t) : actions.unreact(c.id))}
            />
          ) : null}
          {depth < MAX_DEPTH ? (
            <button type="button" className={s.act} onClick={onReply} aria-expanded={replying}>
              Reply
            </button>
          ) : null}
          {canDelete ? (
            <button type="button" className={cx(s.act, s.quiet)} onClick={onDelete}>
              Delete
            </button>
          ) : null}
        </div>
        {replying ? <Composer me={me} reply placeholder={`Reply to ${name.split(' ')[0]}`} autoFocus onCancel={onReplied} onPost={async (t) => { await actions.comment(t, c.id); onReplied() }} /> : null}
      </div>
    </article>
  )
}

export function Composer({ me, placeholder, onPost, reply, autoFocus, onCancel }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const ref = useRef(null)
  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true })
  }, [autoFocus])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }, [text])
  const submit = async (e) => {
    e.preventDefault()
    const t = text.trim()
    if (!t || busy) return
    setBusy(true)
    setErr(null)
    try {
      await onPost(t)
      setText('')
    } catch (x) {
      setErr(/depth/i.test(x?.message || '') ? 'Replies stop three levels deep.' : 'That did not post. Check your connection and try again.')
    }
    setBusy(false)
  }
  return (
    <form className={cx(s.composer, reply && s.composerReply)} onSubmit={submit} data-ui="composer">
      {me && !reply ? <Avatar name={me.full_name || me.username} src={me.avatar_url} size={40} /> : null}
      <div className={s.box}>
        <label className="a-sr" htmlFor={`c-${reply ? 'r' : 'n'}`}>{placeholder}</label>
        <textarea
          id={`c-${reply ? 'r' : 'n'}`}
          ref={ref}
          className={s.input}
          rows={1}
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e)
            if (e.key === 'Escape' && onCancel) onCancel()
          }}
        />
        <div className={s.boxFoot}>
          {err ? <span className={s.err} role="alert">{err}</span> : <span />}
          <span className={s.boxBtns}>
            {onCancel ? <Button variant="quiet" size="sm" onClick={onCancel}>Cancel</Button> : null}
            <Button type="submit" size="sm" busy={busy} disabled={!text.trim()}>{reply ? 'Reply' : 'Post'}</Button>
          </span>
        </div>
      </div>
    </form>
  )
}
