# Development Log - Image Captions & Clickable Images Feature

**Created:** November 11, 2025
**Status:** In Progress - Debugging Implementation Issues

---

## Current Goal

Implement 3 features for event images:
1. **Show captions below in-event images** - Already working for content_blocks
2. **Make in-event images clickable** - Opens lightbox/carousel for viewing all images
3. **Show captions in lightbox** - Captions visible in full-screen image viewer

---

## Context & Background

### What We Have
- Production app deployed on Vercel (frontend + backend)
- Database on Supabase PostgreSQL
- Image caption system added Nov 8 (commit eed0af0)
  - `event_images` table stores images with captions
  - Images loaded via `GET /api/v1/upload/event-images/{id}`
- Lightbox library: `yet-another-react-lightbox` v3.25.0

### Recent Changes (Nov 8-11)
**Nov 8:** Added event_images table and caption system (commit 947d3aa)
**Nov 10:** Connection pool exhaustion issue - doubled API calls per page
**Nov 11:**
- Fixed by consolidating API calls (commit 147b5d6)
- Attempted caption display + clickable images (commit 7e81b9f) - **BROKE SITE**
- Reverted (commit 1a6be09)

---

## Problems Encountered

### Attempt 1: Full Implementation (Nov 11, commits 46bc524 & 7e81b9f)
**What we tried:**
- Added Captions plugin to lightbox
- Made images clickable with useCallback hooks
- Event delegation for rich HTML images

**What broke:**
- "Cannot access 'wt' before initialization" error
- Black screen on event detail pages
- Vercel bundling failure

**Root cause:**
- Circular dependency in state management
- `useCallback` depending on `allImages`
- `allImages` depending on other state
- `useEffect` using that callback
- Vite bundler couldn't resolve initialization order

**Error logs:**
```
Uncaught ReferenceError: Cannot access 'wt' before initialization
at index-C6UPhhYQ.js:48:72485
```

---

## Lessons Learned

### What NOT to Do ❌
1. **Don't use complex state dependencies** - Circular deps break Vite bundling
2. **Don't use useCallback for event handlers** - Creates initialization issues
3. **Don't implement multiple features at once** - Hard to isolate breakage
4. **Don't assume frontend changes can break auth** - We thought it was auth/DB but it was bundling

### What TO Do ✅
1. **Use simple inline functions** - No hooks, no complex dependencies
2. **Test locally with `npm run build` first** - Catches bundling errors
3. **Implement one feature at a time** - Commit, push, test production
4. **Use event delegation without hooks** - Plain addEventListener

---

## Current Strategy

### Phase 1: Clickable Images (Simplest)
**Approach:**
- Pass a simple `onImageClick(imageUrl)` callback from parent to child
- No useCallback, no complex state management
- Find image index by simple array lookup
- Open lightbox with `setLightboxState({ open: true, index })`

**Files to modify:**
- `frontend/src/pages/EventDetail.jsx` - Add click handler to image divs
- NO changes to ImageGallery needed yet

**Testing:**
1. Build locally: `npm run build`
2. If successful, commit and push
3. Test in production
4. If works, move to Phase 2

### Phase 2: Lightbox Captions
**Approach:**
- Add `Captions` plugin to yet-another-react-lightbox
- Use `description` field instead of `title`
- Simple toggle button (built into plugin)

**Testing:** Same as Phase 1

### Phase 3: Grid Captions (if needed)
**Approach:**
- Add caption text below grid items
- Simple CSS, no complex logic

---

## Database Notes

**IMPORTANT:** We do NOT use local SQLite database for development.
- **Production:** PostgreSQL on Supabase (session pooler, port 5432)
- **Local:** SQLite exists only to start FastAPI server
- **Migrations:** NO migration files - all schema changes via SQL in Supabase dashboard

### Connection Pool Issue (Resolved)
- **Problem:** MaxClientsInSessionMode error (Nov 10-11)
- **Cause:** Added 2nd API call per event page (doubled connections)
- **Fix:** Consolidated event_images into main event response (commit 147b5d6)
- **Status:** Resolved ✅

### Why Not Transaction Mode?
- Attempted to switch Supabase from Session to Transaction pooler
- Backend crashed: "Python process exited with exit status: 1"
- No useful error logs in Vercel
- Reverted to Session mode (port 5432)
- Consolidated API calls instead - works fine

---

## Technical Details

### Event Images Flow
1. User creates event with images in rich text editor
2. Images saved to `event_images` table with captions
3. Backend `/events/{id}` includes `event_images` array
4. Frontend `EventDetail.jsx` displays images
5. Images should be clickable to open lightbox

### Current Image Display
**Content Blocks (old system):**
```jsx
<div className={styles.imageBlock}>
  <div className={styles.image} style={{ backgroundImage: `url(...)` }} />
  {block.caption && <div className={styles.caption}>{block.caption}</div>}
</div>
```
- ✅ Captions display below images
- ❌ Not clickable

**Rich HTML Images (new system):**
```jsx
<div dangerouslySetInnerHTML={{ __html: parsedContent }} />
```
- ❌ No captions shown
- ❌ Not clickable

### Lightbox Library
- Package: `yet-another-react-lightbox` v3.25.0
- Current plugins: Thumbnails, Slideshow, Fullscreen, Zoom
- Need to add: Captions plugin
- Docs: https://yet-another-react-lightbox.com/plugins/captions

---

## Next Steps

1. **Implement clickable images (Phase 1)**
   - Simple approach, no hooks
   - Test locally with build
   - Commit and push if successful

2. **Add lightbox captions (Phase 2)**
   - After Phase 1 works in production
   - Add Captions plugin
   - Test locally, then push

3. **Update this log**
   - Document what worked
   - Document any new issues
   - Keep as reference for future work

---

## Success Criteria

✅ **Feature works when:**
- Event detail page loads without errors
- Images are clickable
- Clicking image opens lightbox at that image
- Captions display in lightbox
- No console errors
- No Vercel deployment failures

❌ **Roll back if:**
- Black screen on event detail
- Console errors about initialization
- Vercel deployment fails
- Can't login to site
- Database connection errors

---

## Progress Log

### Phase 1: Clickable Images ✅ COMPLETE
**Date:** November 12, 2025
**Commits:** df531b0, 4ae3bb8
**Status:** ✅ Working in production

**What we did:**
1. Added external lightbox control to ImageGallery component
2. Added `handleImageClick(imageUrl)` function in EventDetail (simple function, not useCallback)
3. Made content_blocks images clickable with inline onClick
4. Made rich HTML images clickable with event delegation
5. Added cursor pointer styling to all images

**Key insight:** Event delegation with `useEffect` that only depends on `[event]` avoids circular dependencies

**Testing:**
- ✅ Build successful locally
- ✅ Deployed to production
- ✅ Images are clickable
- ✅ Lightbox opens at correct image
- ✅ No console errors
- ✅ No black screen issues

---

**Last Updated:** November 12, 2025 12:10 AM CST
**Next Update:** After Phase 2 completion (lightbox captions)
