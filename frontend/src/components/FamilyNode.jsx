import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import styles from './FamilyNode.module.css'

function FamilyNode({ data }) {
  const { name, avatar, relationship, isCurrentUser, isTag } = data

  return (
    <div className={`${styles.familyNode} ${isCurrentUser ? styles.currentUser : ''}`}>
      {/* Top handle for incoming connections (from parents) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={styles.handle}
      />

      {/* Left handle for spouse connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={styles.handleSide}
      />

      {/* Right handle for spouse connections */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={styles.handleSide}
      />

      <div className={styles.nodeContent}>
        {avatar ? (
          <img src={avatar} alt="" className={styles.avatar} />
        ) : (
          <div className={styles.avatarPlaceholder}>
            {name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <div className={styles.nodeInfo}>
          <strong className={styles.name}>{name}</strong>
          <span className={styles.relationship}>{relationship}</span>
        </div>
        {isTag && (
          <span className={styles.tagBadge}>Tag</span>
        )}
      </div>

      {/* Bottom handle for outgoing connections (to children) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={styles.handle}
      />
    </div>
  )
}

export default memo(FamilyNode)
