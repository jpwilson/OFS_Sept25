/**
 * Transform OFS relationships and tag profiles into React Flow format
 * Uses manual hierarchical layout (Dagre has ESM compatibility issues with Vite)
 */

// Relationship type to hierarchy level mapping
// Level 0 = same as user, negative = above, positive = below
const RELATIONSHIP_LEVELS = {
  // Parents and parent-level (above user)
  'mother': -1,
  'father': -1,
  'parent': -1,
  'stepmother': -1,
  'stepfather': -1,
  'mother-in-law': -1,
  'father-in-law': -1,

  // Grandparents (2 levels above)
  'grandmother': -2,
  'grandfather': -2,
  'grandparent': -2,

  // Great-grandparents (3 levels above)
  'great-grandmother': -3,
  'great-grandfather': -3,

  // Same level as user
  'wife': 0,
  'husband': 0,
  'spouse': 0,
  'partner': 0,
  'sister': 0,
  'brother': 0,
  'sibling': 0,
  'half-sister': 0,
  'half-brother': 0,
  'stepsister': 0,
  'stepbrother': 0,
  'sister-in-law': 0,
  'brother-in-law': 0,
  'cousin': 0,

  // Children (below user)
  'daughter': 1,
  'son': 1,
  'child': 1,
  'stepdaughter': 1,
  'stepson': 1,
  'daughter-in-law': 1,
  'son-in-law': 1,

  // Grandchildren (2 levels below)
  'granddaughter': 2,
  'grandson': 2,
  'grandchild': 2,

  // Great-grandchildren (3 levels below)
  'great-granddaughter': 3,
  'great-grandson': 3,

  // Extended family
  'aunt': -1,
  'uncle': -1,
  'niece': 1,
  'nephew': 1,

  // Non-family
  'friend': 0,
  'best friend': 0,
  'close friend': 0,
  'pet': 1,
  'dog': 1,
  'cat': 1,
}

// Edge colors by relationship category
const EDGE_COLORS = {
  spouse: '#f472b6',      // Pink
  parent: '#60a5fa',      // Blue
  child: '#4ade80',       // Green
  sibling: '#fbbf24',     // Gold
  'in-law': '#f97316',    // Orange
  grandparent: '#94a3b8', // Gray
  grandchild: '#34d399',  // Teal
  extended: '#a78bfa',    // Light purple
  friend: '#06b6d4',      // Cyan
  pet: '#fb923c',         // Light orange
  default: '#9ca3af',     // Default gray
}

/**
 * Get the hierarchy level for a relationship type
 */
function getRelationshipLevel(relationshipType) {
  if (!relationshipType || relationshipType.toLowerCase() === 'family') {
    return 2 // Unknown/generic "family" goes below children
  }

  const rel = relationshipType.toLowerCase().trim()

  // Check for exact match first
  if (RELATIONSHIP_LEVELS[rel] !== undefined) {
    return RELATIONSHIP_LEVELS[rel]
  }

  // Check for partial matches
  for (const [key, level] of Object.entries(RELATIONSHIP_LEVELS)) {
    if (rel.includes(key)) {
      return level
    }
  }

  // Default: unknown relationships go below children
  return 2
}

/**
 * Get edge color based on relationship type
 */
function getEdgeColor(relationshipType) {
  if (!relationshipType) return EDGE_COLORS.default

  const rel = relationshipType.toLowerCase()

  if (['wife', 'husband', 'spouse', 'partner'].some(t => rel.includes(t))) {
    return EDGE_COLORS.spouse
  }
  if (['mother', 'father', 'parent', 'stepmother', 'stepfather'].some(t => rel.includes(t)) && !rel.includes('-in-law')) {
    return EDGE_COLORS.parent
  }
  if (['daughter', 'son', 'child', 'stepdaughter', 'stepson'].some(t => rel.includes(t)) && !rel.includes('-in-law')) {
    return EDGE_COLORS.child
  }
  if (['sister', 'brother', 'sibling', 'half-sister', 'half-brother', 'stepsister', 'stepbrother'].some(t => rel.includes(t)) && !rel.includes('-in-law')) {
    return EDGE_COLORS.sibling
  }
  if (rel.includes('-in-law')) {
    return EDGE_COLORS['in-law']
  }
  if (['grandmother', 'grandfather', 'grandparent', 'great-grand'].some(t => rel.includes(t)) && rel.includes('grand') && !rel.includes('child')) {
    return EDGE_COLORS.grandparent
  }
  if (['granddaughter', 'grandson', 'grandchild', 'great-grand'].some(t => rel.includes(t)) && rel.includes('child')) {
    return EDGE_COLORS.grandchild
  }
  if (['aunt', 'uncle', 'niece', 'nephew', 'cousin'].some(t => rel.includes(t))) {
    return EDGE_COLORS.extended
  }
  if (['friend'].some(t => rel.includes(t))) {
    return EDGE_COLORS.friend
  }
  if (['pet', 'dog', 'cat'].some(t => rel.includes(t))) {
    return EDGE_COLORS.pet
  }

  return EDGE_COLORS.default
}

/**
 * Check if relationship is a spouse type
 */
function isSpouseRelationship(relationshipType) {
  if (!relationshipType) return false
  const rel = relationshipType.toLowerCase()
  return ['wife', 'husband', 'spouse', 'partner'].some(t => rel.includes(t))
}

/**
 * Check if this is a former/ex relationship
 */
function isFormerRelationship(relationshipType) {
  if (!relationshipType) return false
  const rel = relationshipType.toLowerCase()
  return rel.includes('ex-') || rel.includes('former') || rel.includes('divorced')
}

/**
 * Get sort order for a node based on relationship type
 * Lower number = further left
 */
function getNodeSortOrder(node) {
  const rel = (node.data.relationship || '').toLowerCase()
  const isCurrentUser = node.data.isCurrentUser

  // Current user always in middle
  if (isCurrentUser) return 500

  // Spouse: wife to the right of husband
  if (['wife', 'spouse', 'partner'].some(t => rel.includes(t)) && !rel.includes('husband')) {
    return 600 // Wife goes right of user
  }
  if (['husband'].some(t => rel.includes(t))) {
    return 400 // Husband goes left of user
  }

  // Brothers before sisters (left to right)
  if (['brother', 'brother-in-law'].some(t => rel.includes(t))) {
    return 300
  }
  if (['sister', 'sister-in-law'].some(t => rel.includes(t))) {
    return 700
  }

  // Sons before daughters (left to right)
  if (['son', 'son-in-law', 'grandson'].some(t => rel.includes(t))) {
    return 400
  }
  if (['daughter', 'daughter-in-law', 'granddaughter'].some(t => rel.includes(t))) {
    return 600
  }

  // Fathers before mothers
  if (['father', 'father-in-law', 'grandfather'].some(t => rel.includes(t))) {
    return 400
  }
  if (['mother', 'mother-in-law', 'grandmother'].some(t => rel.includes(t))) {
    return 600
  }

  // Default
  return 500
}

/**
 * Apply simple hierarchical layout to nodes
 * Groups nodes by rank/level and positions them
 * Conventions: husband left, wife right; brothers left of sisters
 */
function applyHierarchicalLayout(nodes) {
  const nodeWidth = 220
  const nodeHeight = 90
  const horizontalSpacing = 60
  const verticalSpacing = 120

  // Group nodes by rank
  const rankGroups = {}
  nodes.forEach(node => {
    const rank = node.data.rank || 0
    if (!rankGroups[rank]) {
      rankGroups[rank] = []
    }
    rankGroups[rank].push(node)
  })

  // Sort nodes within each rank by convention
  Object.keys(rankGroups).forEach(rank => {
    rankGroups[rank].sort((a, b) => getNodeSortOrder(a) - getNodeSortOrder(b))
  })

  // Get sorted ranks (negative first for parents above)
  const sortedRanks = Object.keys(rankGroups)
    .map(Number)
    .sort((a, b) => a - b)

  // Find the center rank (0 = user level)
  const centerY = 300 // Base Y position for user

  // Position nodes
  return nodes.map(node => {
    const rank = node.data.rank || 0
    const nodesInRank = rankGroups[rank]
    const indexInRank = nodesInRank.indexOf(node)
    const totalInRank = nodesInRank.length

    // Calculate Y based on rank (negative ranks go up)
    const y = centerY + (rank * verticalSpacing)

    // Calculate X to center the row
    const totalWidth = totalInRank * nodeWidth + (totalInRank - 1) * horizontalSpacing
    const startX = -totalWidth / 2
    const x = startX + indexInRank * (nodeWidth + horizontalSpacing)

    return {
      ...node,
      position: { x, y }
    }
  })
}

/**
 * Transform OFS data to React Flow format
 * @param {Object} currentUser - The logged in user
 * @param {Array} relationships - Verified user relationships
 * @param {Array} tagProfiles - Tag profiles (non-users)
 * @returns {Object} { nodes, edges } for React Flow
 */
export function transformToReactFlow(currentUser, relationships, tagProfiles) {
  // Guard against missing user
  if (!currentUser || !currentUser.id) {
    console.warn('transformToReactFlow: No current user provided')
    return { nodes: [], edges: [] }
  }

  const nodes = []
  const edges = []
  const userId = `user-${currentUser.id}`

  // 1. Add current user as center node (rank 0)
  nodes.push({
    id: userId,
    type: 'familyMember',
    data: {
      name: currentUser.full_name || currentUser.display_name || currentUser.username,
      avatar: currentUser.avatar_url || '',
      relationship: 'You',
      isCurrentUser: true,
      username: currentUser.username,
      rank: 0
    },
    position: { x: 0, y: 0 } // Will be calculated by Dagre
  })

  // Track spouse IDs for special positioning
  const spouseIds = []

  // 2. Add verified user relationships
  if (relationships && relationships.length > 0) {
    relationships.forEach(rel => {
      if (!rel || !rel.other_user_id) return

      const personId = `user-${rel.other_user_id}`
      const relationshipType = rel.my_relationship_to_them || rel.relationship_to_you || 'family'
      const level = getRelationshipLevel(relationshipType)
      const isSpouse = isSpouseRelationship(relationshipType)
      const isFormer = isFormerRelationship(relationshipType)

      if (isSpouse) {
        spouseIds.push(personId)
      }

      // Add node
      nodes.push({
        id: personId,
        type: 'familyMember',
        data: {
          name: rel.other_user_display_name || rel.other_user_full_name || rel.other_user_username || 'Unknown',
          avatar: rel.other_user_avatar_url || '',
          relationship: relationshipType,
          isCurrentUser: false,
          username: rel.other_user_username,
          rank: level
        },
        position: { x: 0, y: 0 }
      })

      // Add edge from user to this person
      // Direction depends on relationship level
      const edgeSource = level < 0 ? personId : userId // Parents point to user
      const edgeTarget = level < 0 ? userId : personId  // User points to children

      edges.push({
        id: `edge-${userId}-${personId}`,
        source: isSpouse ? userId : edgeSource,
        target: isSpouse ? personId : edgeTarget,
        type: 'smoothstep',
        label: relationshipType,
        labelStyle: {
          fill: 'var(--text-secondary)',
          fontSize: 11,
          fontWeight: 500
        },
        labelBgStyle: {
          fill: 'var(--bg-secondary)',
          fillOpacity: 0.9
        },
        labelBgPadding: [4, 4],
        style: {
          stroke: getEdgeColor(relationshipType),
          strokeWidth: 2,
          strokeDasharray: isFormer ? '5,5' : '0'
        },
        animated: isSpouse && !isFormer
      })
    })
  }

  // 3. Add tag profiles (non-users like pets, kids without accounts)
  if (tagProfiles && tagProfiles.length > 0) {
    tagProfiles.forEach(tag => {
      if (!tag || !tag.id) return

      const personId = `tag-${tag.id}`
      const relationshipType = tag.relationship_to_creator || 'family'
      const level = getRelationshipLevel(relationshipType)
      const isFormer = isFormerRelationship(relationshipType)

      // Add node
      nodes.push({
        id: personId,
        type: 'familyMember',
        data: {
          name: tag.name || 'Unknown',
          avatar: tag.photo_url || '',
          relationship: relationshipType,
          isCurrentUser: false,
          isTag: true,
          rank: level
        },
        position: { x: 0, y: 0 }
      })

      // Add edge
      const edgeSource = level < 0 ? personId : userId
      const edgeTarget = level < 0 ? userId : personId

      edges.push({
        id: `edge-${userId}-${personId}`,
        source: edgeSource,
        target: edgeTarget,
        type: 'smoothstep',
        label: relationshipType,
        labelStyle: {
          fill: 'var(--text-secondary)',
          fontSize: 11,
          fontWeight: 500
        },
        labelBgStyle: {
          fill: 'var(--bg-secondary)',
          fillOpacity: 0.9
        },
        labelBgPadding: [4, 4],
        style: {
          stroke: getEdgeColor(relationshipType),
          strokeWidth: 2,
          strokeDasharray: isFormer ? '5,5' : '0'
        }
      })
    })
  }

  // 4. Apply hierarchical layout
  const layoutedNodes = applyHierarchicalLayout(nodes)

  // 5. Adjust spouse positions to be beside user instead of above/below
  if (spouseIds.length > 0) {
    const userNode = layoutedNodes.find(n => n.id === userId)
    if (userNode) {
      spouseIds.forEach((spouseId, index) => {
        const spouseNode = layoutedNodes.find(n => n.id === spouseId)
        if (spouseNode) {
          // Position spouse to the right of user
          spouseNode.position = {
            x: userNode.position.x + 250 * (index + 1),
            y: userNode.position.y
          }
        }
      })
    }
  }

  return { nodes: layoutedNodes, edges }
}

/**
 * Get color for relationship group (exported for other uses)
 */
export function getRelationshipColor(relationshipType) {
  return getEdgeColor(relationshipType)
}

// Keep the old function name as alias for backwards compatibility during migration
export const transformToFamilyChart = transformToReactFlow
