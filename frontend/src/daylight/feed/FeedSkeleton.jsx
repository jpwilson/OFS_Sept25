// Loading placeholders shaped like the view that is coming (owner: FEED).
import { Loading, Skeleton, SkeletonText } from '../ui/Skeleton.jsx'
import s from './FeedSkeleton.module.css'

function CardSk({ lead }) {
  return (
    <div className={lead ? s.lead : s.card}>
      <Skeleton h="auto" r={0} className={s.cover} />
      <div className={s.text}>
        <Skeleton w="34%" h={11} r={6} />
        <Skeleton w={lead ? '78%' : '86%'} h={lead ? 30 : 22} r={8} />
        {lead ? <SkeletonText lines={2} size={14} /> : null}
        <Skeleton w="58%" h={14} r={7} />
      </div>
    </div>
  )
}

export default function FeedSkeleton({ view = 'feed' }) {
  if (view === 'calendar') {
    return (
      <Loading label="Loading the calendar" className={s.months}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} h={300} r={20} />
        ))}
      </Loading>
    )
  }
  return (
    <Loading label="Loading stories" className={s.wrap}>
      <Skeleton w={150} h={13} r={6} />
      <div className={s.grid}>
        <CardSk lead />
        <CardSk />
        <CardSk />
      </div>
    </Loading>
  )
}
