/**
 * Transform OFS relationships and tag profiles into family-chart data format
 */

// Infer gender from relationship type
function inferGender(relationshipType) {
  if (!relationshipType) return ''
  const rel = relationshipType.toLowerCase()

  // Female indicators
  if (['wife', 'mother', 'daughter', 'sister', 'grandmother', 'granddaughter',
       'aunt', 'niece', 'mother-in-law', 'sister-in-law', 'daughter-in-law'].some(t => rel.includes(t))) {
    return 'F'
  }

  // Male indicators
  if (['husband', 'father', 'son', 'brother', 'grandfather', 'grandson',
       'uncle', 'nephew', 'father-in-law', 'brother-in-law', 'son-in-law'].some(t => rel.includes(t))) {
    return 'M'
  }

  return ''
}

// Link two people based on relationship type
function linkRelationship(people, userId, otherId, relType) {
  const userKey = `user-${userId}`
  const otherKey = otherId.startsWith('user-') || otherId.startsWith('tag-') ? otherId : `user-${otherId}`

  const user = people.get(userKey)
  const other = people.get(otherKey)

  if (!user || !other) return

  const rel = relType.toLowerCase()

  // Spouse relationships
  if (['wife', 'husband', 'spouse', 'partner'].some(t => rel.includes(t))) {
    if (!user.rels.spouses.includes(other.id)) {
      user.rels.spouses.push(other.id)
    }
    if (!other.rels.spouses.includes(user.id)) {
      other.rels.spouses.push(user.id)
    }
  }
  // Children (they are my child, so I am their parent)
  else if (['daughter', 'son', 'child', 'stepdaughter', 'stepson'].some(t => rel.includes(t))) {
    if (!user.rels.children.includes(other.id)) {
      user.rels.children.push(other.id)
    }
    if (!other.rels.parents.includes(user.id)) {
      other.rels.parents.push(user.id)
    }
  }
  // Parents (they are my parent, so I am their child)
  else if (['mother', 'father', 'parent', 'stepmother', 'stepfather'].some(t => rel.includes(t))) {
    if (!user.rels.parents.includes(other.id)) {
      user.rels.parents.push(other.id)
    }
    if (!other.rels.children.includes(user.id)) {
      other.rels.children.push(user.id)
    }
  }
  // Grandparents (they are my grandparent)
  else if (['grandmother', 'grandfather', 'grandparent'].some(t => rel.includes(t))) {
    // For simplicity, treat as parent level (proper multi-gen would need placeholder nodes)
    if (!user.rels.parents.includes(other.id)) {
      user.rels.parents.push(other.id)
    }
    if (!other.rels.children.includes(user.id)) {
      other.rels.children.push(user.id)
    }
  }
  // Grandchildren
  else if (['granddaughter', 'grandson', 'grandchild'].some(t => rel.includes(t))) {
    if (!user.rels.children.includes(other.id)) {
      user.rels.children.push(other.id)
    }
    if (!other.rels.parents.includes(user.id)) {
      other.rels.parents.push(user.id)
    }
  }
  // Siblings - need special handling (share parents)
  else if (['sister', 'brother', 'sibling', 'half-sister', 'half-brother',
            'stepsister', 'stepbrother'].some(t => rel.includes(t))) {
    // For siblings, we can't directly link in family-chart without shared parents
    // Store as metadata for now - we'll handle display separately
    if (!user.rels.siblings) user.rels.siblings = []
    if (!other.rels.siblings) other.rels.siblings = []
    if (!user.rels.siblings.includes(other.id)) {
      user.rels.siblings.push(other.id)
    }
    if (!other.rels.siblings.includes(user.id)) {
      other.rels.siblings.push(user.id)
    }
  }
  // In-laws - approximate as extended family
  else if (['mother-in-law', 'father-in-law'].some(t => rel.includes(t))) {
    // In-law parents - treat as parents level for display
    if (!user.rels.parents.includes(other.id)) {
      user.rels.parents.push(other.id)
    }
  }
  else if (['sister-in-law', 'brother-in-law'].some(t => rel.includes(t))) {
    // Siblings of spouse - store as siblings
    if (!user.rels.siblings) user.rels.siblings = []
    if (!user.rels.siblings.includes(other.id)) {
      user.rels.siblings.push(other.id)
    }
  }
  else if (['daughter-in-law', 'son-in-law'].some(t => rel.includes(t))) {
    // Children's spouses - treat as children level
    if (!user.rels.children.includes(other.id)) {
      user.rels.children.push(other.id)
    }
  }
  // Pets - treat as children for tree structure
  else if (['pet', 'dog', 'cat'].some(t => rel.includes(t))) {
    if (!user.rels.children.includes(other.id)) {
      user.rels.children.push(other.id)
    }
    if (!other.rels.parents.includes(user.id)) {
      other.rels.parents.push(user.id)
    }
  }
  // Default: add as child for display purposes
  else {
    if (!user.rels.children.includes(other.id)) {
      user.rels.children.push(other.id)
    }
    if (!other.rels.parents.includes(user.id)) {
      other.rels.parents.push(user.id)
    }
  }
}

/**
 * Transform OFS data to family-chart format
 * @param {Object} currentUser - The logged in user
 * @param {Array} relationships - Verified user relationships
 * @param {Array} tagProfiles - Tag profiles (non-users)
 * @returns {Array} Data in family-chart format
 */
export function transformToFamilyChart(currentUser, relationships, tagProfiles) {
  const people = new Map()

  // 1. Add current user as center/main node
  people.set(`user-${currentUser.id}`, {
    id: `user-${currentUser.id}`,
    data: {
      'first name': currentUser.full_name || currentUser.display_name || currentUser.username,
      'last name': '',
      'gender': currentUser.gender || '',
      'avatar': currentUser.avatar_url || '',
      'isCurrentUser': true
    },
    rels: { spouses: [], children: [], parents: [], siblings: [] }
  })

  // 2. Add verified user relationships
  if (relationships && relationships.length > 0) {
    relationships.forEach(rel => {
      const personId = `user-${rel.other_user_id}`

      // Only add if not already in map
      if (!people.has(personId)) {
        people.set(personId, {
          id: personId,
          data: {
            'first name': rel.other_user_display_name || rel.other_user_full_name || rel.other_user_username,
            'last name': '',
            'gender': inferGender(rel.relationship_to_you),
            'avatar': rel.other_user_avatar_url || '',
            'username': rel.other_user_username,
            'verified': true,
            'relationship': rel.relationship_to_you
          },
          rels: { spouses: [], children: [], parents: [], siblings: [] }
        })
      }

      // Create bidirectional link
      linkRelationship(people, currentUser.id, personId, rel.relationship_to_you)
    })
  }

  // 3. Add tag profiles (non-users like pets, kids without accounts)
  if (tagProfiles && tagProfiles.length > 0) {
    tagProfiles.forEach(tag => {
      const personId = `tag-${tag.id}`

      if (!people.has(personId)) {
        people.set(personId, {
          id: personId,
          data: {
            'first name': tag.name,
            'last name': '',
            'gender': inferGender(tag.relationship_to_creator),
            'avatar': tag.photo_url || '',
            'isTag': true,
            'relationship': tag.relationship_to_creator
          },
          rels: { spouses: [], children: [], parents: [], siblings: [] }
        })
      }

      // Link to creator
      linkRelationship(people, currentUser.id, personId, tag.relationship_to_creator)
    })
  }

  // Convert Map to array for family-chart
  return Array.from(people.values())
}

/**
 * Get color for relationship group
 * @param {string} relationshipType
 * @returns {string} Hex color
 */
export function getRelationshipColor(relationshipType) {
  if (!relationshipType) return '#9ca3af'

  const rel = relationshipType.toLowerCase()

  if (['wife', 'husband', 'spouse', 'partner'].some(t => rel.includes(t))) {
    return '#f472b6' // Pink
  }
  if (['daughter', 'son', 'child'].some(t => rel.includes(t))) {
    return '#4ade80' // Green
  }
  if (['mother', 'father', 'parent'].some(t => rel.includes(t))) {
    return '#60a5fa' // Blue
  }
  if (['sister', 'brother', 'sibling'].some(t => rel.includes(t))) {
    return '#fbbf24' // Yellow/Gold
  }
  if (['grandmother', 'grandfather'].some(t => rel.includes(t))) {
    return '#94a3b8' // Gray
  }
  if (['granddaughter', 'grandson'].some(t => rel.includes(t))) {
    return '#34d399' // Teal
  }
  if (['aunt', 'uncle', 'niece', 'nephew', 'cousin'].some(t => rel.includes(t))) {
    return '#a78bfa' // Light purple
  }
  if (rel.includes('-in-law')) {
    return '#f97316' // Orange
  }
  if (['friend'].some(t => rel.includes(t))) {
    return '#06b6d4' // Cyan
  }
  if (['pet', 'dog', 'cat'].some(t => rel.includes(t))) {
    return '#fb923c' // Light orange
  }

  return '#9ca3af' // Default gray
}
