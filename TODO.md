# Our Family Socials - TODO List

**Last Updated:** January 16, 2026

---

## In Progress / High Priority

*No critical items currently*

---

## Planned Features

### Notification System Upgrade
**Current State:**
- Event comments trigger email notifications
- New followers trigger notifications
- New events from followed users trigger notifications

**Missing:**
- [ ] Media reaction notifications (when someone reacts to your photo/video)
- [ ] Media comment notifications (when someone comments on your photo/video)
- [ ] Add user preferences: `notify_media_reaction`, `notify_media_comment`
- [ ] Consider batching/digest for high-volume engagement
- [ ] Decision needed: individual vs daily digest vs comments-only

### Staging Environment
- [ ] Set up staging environment for testing before production

### Testing Infrastructure
- [ ] Add linting
- [ ] Add functional tests

### Username Change Feature
- [ ] Allow users to change username
- [ ] Limit: once per month
- [ ] Paying users only

---

## Completed (January 2026)

- [x] Mobile image comments UX improvements (bottom sheet, close button, visible engagement)
- [x] Mobile filter layout reorganization (stacked date toggle, bottom sheet, right-aligned toggle)
- [x] Category filter ribbon with icons and scroll arrows
- [x] Multi-category support (events can have 2 categories)
- [x] Event tags bug fix (was using slug instead of numeric ID)
- [x] Unified pricing pages (logged-in and logged-out)
- [x] Free tier messaging update ("View-only - cannot create events")
- [x] Ad blocker troubleshooting note on billing page
- [x] Image commenting UI in lightbox
- [x] Multiple reaction types for images/videos (10 emojis)
- [x] Inline image overlays showing reaction/comment counts
- [x] Video caption fix in event view
- [x] Reaction picker portal fix for lightbox

---

## Notes

- Reactions and comments work for both images AND videos
- All database changes should use Alembic migrations
- Always run `npm run build` before pushing
