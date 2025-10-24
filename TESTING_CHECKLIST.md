# Our Family Socials - Comprehensive Testing Checklist

This checklist covers all features implemented in Phases C & D. Test each item systematically to ensure everything works correctly.

## Prerequisites
- [ ] Backend server running on port 8000
- [ ] Frontend dev server running on port 3000 or 5173
- [ ] Database seeded with diverse data (100 events, 20 users)

---

## 1. Authentication System

### Login
- [ ] Can access login page at `/login`
- [ ] All 20 demo accounts are visible and organized by family
- [ ] Can login with Sarah Wilson (sarah@wilson.com / password123)
- [ ] Can login with Michael Chen (michael@chen.com / password123)
- [ ] Can login with Emma Rodriguez (emma@rodriguez.com / password123)
- [ ] After successful login, redirects to Feed page
- [ ] Success toast appears after login
- [ ] Login persists after page refresh (JWT token stored)

### Logout
- [ ] Logout button appears in header when logged in
- [ ] Clicking logout clears authentication
- [ ] After logout, protected routes redirect to login
- [ ] Can log back in after logging out

---

## 2. Navigation

### Header Navigation
- [ ] Logo links to Feed (/)
- [ ] "Feed" link navigates to Feed page
- [ ] "Map" link navigates to Map page
- [ ] "Timeline" link navigates to Timeline page
- [ ] "Create" link navigates to Create Event page
- [ ] "Profile" link navigates to current user's profile
- [ ] All navigation links highlight current page

---

## 3. Feed Page

### Display
- [ ] Feed loads and displays events
- [ ] Each event card shows:
  - [ ] Cover image
  - [ ] Event title
  - [ ] Author name (clickable link)
  - [ ] Date
  - [ ] Location
  - [ ] Description excerpt
- [ ] Events are displayed in card format
- [ ] Hover effects work on event cards

### Filtering
- [ ] "All Events" button shows all events
- [ ] "Following" button filters to followed users' events
- [ ] "My Events" button filters to current user's events
- [ ] Active filter button is highlighted
- [ ] Filter count shows "Showing X of Y events" when filtered
- [ ] Date range filters work:
  - [ ] "From" date filters events after selected date
  - [ ] "To" date filters events before selected date
  - [ ] Both date filters work together

### Navigation
- [ ] Clicking event card navigates to event detail
- [ ] Clicking author name navigates to their profile
- [ ] Back button returns to Feed from event detail

---

## 4. Map Page

### Map Display
- [ ] Map loads with markers for all events
- [ ] Markers cluster when zoomed out
- [ ] Clicking cluster zooms into region
- [ ] Individual markers appear when zoomed in
- [ ] Clicking marker shows popup with event info
- [ ] Popup contains:
  - [ ] Event image
  - [ ] Event title
  - [ ] Author name
  - [ ] Location name
  - [ ] Description
  - [ ] "View Event" link

### Timeline
- [ ] Timeline appears at bottom of map
- [ ] Timeline shows event thumbnails in chronological order (oldest first)
- [ ] Timeline header shows event count
- [ ] Can collapse/expand timeline
- [ ] Clicking event thumbnail navigates to event detail
- [ ] Clicking location icon zooms map to event location

### Filtering
- [ ] "All Events" filter shows all map markers
- [ ] "Following" filter shows only followed users' events on map
- [ ] "My Events" filter shows only current user's events on map
- [ ] Date range filters affect both map markers and timeline
- [ ] Timeline updates to show only filtered events

---

## 5. Timeline Page

### Display
- [ ] Timeline page loads with vertical timeline
- [ ] Events grouped by year
- [ ] Year markers displayed prominently
- [ ] Events alternate left and right
- [ ] Each event card shows:
  - [ ] Cover image
  - [ ] Event title
  - [ ] Author name (clickable)
  - [ ] Location
  - [ ] Date
- [ ] Timeline line connects all events
- [ ] Dots appear at each event position

### Filtering
- [ ] "All Events" shows complete timeline
- [ ] "Following" filters to followed users
- [ ] "My Events" filters to current user
- [ ] Filter count displays correctly

### Responsive Design
- [ ] Mobile view switches to single-column layout
- [ ] Timeline remains readable on mobile

---

## 6. Profile Page

### Display
- [ ] Profile loads for any username (/profile/sarahw)
- [ ] Profile shows:
  - [ ] Avatar (first letter of name)
  - [ ] Full name
  - [ ] Username with @ symbol
  - [ ] Bio (if present)
  - [ ] Stats: X events, Y followers, Z following
- [ ] User's events displayed in grid
- [ ] Each event card is clickable

### Follow System
- [ ] On other users' profiles:
  - [ ] "Follow" button appears if not following
  - [ ] "Following" button appears if already following
  - [ ] Clicking "Follow" follows the user
  - [ ] Success toast appears: "Following [Name]"
  - [ ] Button changes to "Following"
  - [ ] Follower count increments immediately
- [ ] On "Following" button:
  - [ ] Hover shows "(Unfollow)" hint
  - [ ] Clicking unfollows the user
  - [ ] Success toast appears: "Unfollowed [Name]"
  - [ ] Button changes back to "Follow"
  - [ ] Follower count decrements immediately

### Own Profile
- [ ] On your own profile:
  - [ ] "Create Event" button appears instead of Follow
  - [ ] Shows "Your Events" heading
  - [ ] Clicking "Create Event" navigates to create page

### Profile Links
- [ ] Clicking author name in Feed navigates to profile
- [ ] Clicking author name in Map navigates to profile
- [ ] Clicking author name in Timeline navigates to profile
- [ ] Clicking author name in Event Detail navigates to profile
- [ ] Clicking author name in Comments navigates to profile
- [ ] Clicking usernames in Likes list navigates to profile

---

## 7. Event Detail Page

### Display
- [ ] Event detail loads for any event ID
- [ ] Hero image displays full screen
- [ ] Event title overlays image
- [ ] Author name, date, location displayed
- [ ] Author name is clickable link to profile
- [ ] Content blocks display correctly:
  - [ ] Text blocks render with proper formatting
  - [ ] Image blocks display full width
  - [ ] Image captions display below images
- [ ] Description displays if no content blocks

### Likes System
- [ ] Like button displays with count
- [ ] Logged-out users see disabled like button
- [ ] Logged-in users can click like button
- [ ] Clicking like:
  - [ ] Button changes to filled heart (♥)
  - [ ] Heart animates with pulse effect
  - [ ] Count increments by 1
  - [ ] Button border turns red
  - [ ] Success toast appears: "Liked event"
- [ ] Clicking unlike:
  - [ ] Button changes to outline heart (♡)
  - [ ] Count decrements by 1
  - [ ] Button returns to normal color
  - [ ] Success toast appears: "Unliked event"

### Likes List
- [ ] "Liked by" section shows first 3 likers
- [ ] Each liker name is clickable profile link
- [ ] If more than 3 likes, shows "and X others"
- [ ] Clicking "X others" opens full likes modal
- [ ] Likes modal displays:
  - [ ] Modal title "Likes"
  - [ ] Close button (X)
  - [ ] Scrollable list of all likers
  - [ ] Each liker shows avatar, name, username
  - [ ] Clicking liker navigates to their profile
- [ ] Clicking outside modal closes it
- [ ] Clicking close button closes modal

### Comments System
- [ ] "Comments (X)" heading shows count
- [ ] Logged-out users see "Log in to leave a comment" prompt
- [ ] Logged-in users see comment textarea
- [ ] Comment textarea:
  - [ ] Placeholder text: "Share your thoughts..."
  - [ ] Can type multi-line comments
  - [ ] "Post Comment" button appears
  - [ ] Button disabled when textarea empty
  - [ ] Button disabled while posting

### Posting Comments
- [ ] Typing comment enables Post button
- [ ] Clicking "Post Comment":
  - [ ] Button shows "Posting..." briefly
  - [ ] Comment appears at top of list
  - [ ] Textarea clears
  - [ ] Success toast appears: "Comment posted"
  - [ ] Comment count increments

### Comment Display
- [ ] Each comment shows:
  - [ ] Avatar (first letter)
  - [ ] Author name (clickable)
  - [ ] Timestamp (relative: "5m ago", "2h ago", etc.)
  - [ ] Comment text (preserves line breaks)
- [ ] Comments sorted newest first
- [ ] Empty state shows: "No comments yet. Be the first to share your thoughts!"

### Deleting Comments
- [ ] Delete button appears only for:
  - [ ] Comment author
  - [ ] Event owner
- [ ] Clicking "Delete":
  - [ ] Confirmation dialog appears
  - [ ] Canceling does nothing
  - [ ] Confirming deletes comment
  - [ ] Comment removed from list
  - [ ] Success toast appears: "Comment deleted"
  - [ ] Comment count decrements

---

## 8. Create Event Page

### Form
- [ ] Create Event form loads
- [ ] All fields present:
  - [ ] Title (required)
  - [ ] Description
  - [ ] Start Date (required)
  - [ ] End Date
  - [ ] Location Name
  - [ ] Latitude
  - [ ] Longitude
  - [ ] Cover Image URL

### Creation
- [ ] Can fill out form fields
- [ ] Clicking "Create Event":
  - [ ] Validates required fields
  - [ ] Shows errors if validation fails
  - [ ] Creates event if valid
  - [ ] Success toast appears: "Event created successfully!"
  - [ ] Redirects to new event detail page
- [ ] Event attributed to logged-in user (not hardcoded)

---

## 9. Follow System Integration

### Following Filter
- [ ] Follow a few users (e.g., Sarah, Michael, Emma)
- [ ] Feed "Following" filter shows only their events
- [ ] Map "Following" filter shows only their markers
- [ ] Timeline "Following" filter shows only their events
- [ ] Unfollow a user and verify filters update

### Following Count
- [ ] Profile shows correct following count
- [ ] Profile shows correct follower count
- [ ] Counts update immediately after follow/unfollow

---

## 10. Toast Notifications

### Success Toasts
- [ ] Green checkmark icon
- [ ] "Success" title
- [ ] Clear message
- [ ] Auto-dismisses after 3 seconds
- [ ] Can manually close with X button

### Error Toasts
- [ ] Red X icon
- [ ] "Error" title
- [ ] Clear error message
- [ ] Auto-dismisses after 3 seconds
- [ ] Can manually close

### Toast Locations
- [ ] Appears in top-right corner
- [ ] Stacks if multiple toasts
- [ ] Smooth fade-in animation
- [ ] Smooth fade-out animation

---

## 11. User Experience & Polish

### Loading States
- [ ] Profile page shows skeleton while loading
- [ ] Feed shows skeleton while loading
- [ ] Event detail shows "Loading..." while loading
- [ ] Like button shows "..." while processing
- [ ] Follow button shows "..." while processing
- [ ] Comment submit shows "Posting..." while processing

### Hover Effects
- [ ] Event cards lift on hover
- [ ] Author links underline on hover
- [ ] Buttons change color on hover
- [ ] Follow button shows unfollow hint on hover
- [ ] Like button color changes on hover

### Responsive Design
- [ ] All pages work on mobile screens
- [ ] Timeline switches to single column on mobile
- [ ] Profile grid adjusts on mobile
- [ ] Navigation adapts to mobile
- [ ] Forms remain usable on mobile

---

## 12. Integration Testing Scenarios

### Scenario 1: New User Journey
1. [ ] Login as a new user
2. [ ] Browse Feed
3. [ ] Follow 2-3 users
4. [ ] View Map with "Following" filter
5. [ ] View Timeline with "Following" filter
6. [ ] Visit followed user's profile
7. [ ] View an event from followed user
8. [ ] Like the event
9. [ ] Post a comment
10. [ ] Create your own event
11. [ ] Verify event appears on your profile

### Scenario 2: Social Interactions
1. [ ] Login as User A (Sarah)
2. [ ] Create an event
3. [ ] Logout and login as User B (Michael)
4. [ ] Find Sarah's event in Feed
5. [ ] Like the event
6. [ ] Post a comment
7. [ ] Follow Sarah
8. [ ] Logout and login as User C (Emma)
9. [ ] Find same event
10. [ ] Like it
11. [ ] Post another comment
12. [ ] Logout and login back as Sarah
13. [ ] View your event
14. [ ] Verify 2 likes with both names
15. [ ] Verify 2 comments from Michael and Emma
16. [ ] Verify 2 followers on profile

### Scenario 3: Content Discovery
1. [ ] Login as any user
2. [ ] Browse Feed - note event variety
3. [ ] Apply date filter (e.g., events from 2024)
4. [ ] Switch to Map view
5. [ ] Verify map shows filtered events
6. [ ] Click on a cluster
7. [ ] Zoom in to see individual markers
8. [ ] Click marker popup "View Event"
9. [ ] Like and comment on event
10. [ ] Click author name to visit profile
11. [ ] Follow author
12. [ ] View their other events
13. [ ] Navigate to Timeline
14. [ ] Scroll through chronological history
15. [ ] Verify year groupings make sense

### Scenario 4: Profile & Following
1. [ ] Login and go to your profile
2. [ ] Verify all your events are listed
3. [ ] Navigate to another user's profile
4. [ ] Follow them
5. [ ] Verify follower count increased
6. [ ] Go back to Feed
7. [ ] Apply "Following" filter
8. [ ] Verify you see their events
9. [ ] Unfollow them
10. [ ] Verify "Following" filter excludes their events

### Scenario 5: Comments & Likes
1. [ ] Find an event with no comments
2. [ ] Post first comment
3. [ ] Verify "No comments" message disappears
4. [ ] Post another comment
5. [ ] Verify both comments appear
6. [ ] Delete your first comment
7. [ ] Verify only one comment remains
8. [ ] Like the event
9. [ ] View likes list
10. [ ] Unlike the event
11. [ ] Verify count decreased

---

## 13. Edge Cases & Error Handling

### Authentication
- [ ] Accessing protected routes without login redirects to login page
- [ ] Expired tokens log user out
- [ ] Invalid credentials show error message

### Follow System
- [ ] Cannot follow yourself
- [ ] Following same user twice doesn't duplicate
- [ ] Unfollowing user you don't follow doesn't error

### Comments
- [ ] Cannot post empty comment
- [ ] Cannot delete other users' comments (unless event owner)
- [ ] Very long comments wrap properly

### Likes
- [ ] Cannot like same event twice
- [ ] Unlike without having liked doesn't error
- [ ] Likes list handles 100+ likes gracefully

### Data Validation
- [ ] Event creation with missing required fields shows errors
- [ ] Invalid dates are rejected
- [ ] Invalid URLs are handled

---

## 14. Performance

### Loading Times
- [ ] Feed loads within 2 seconds
- [ ] Map loads within 3 seconds (with all markers)
- [ ] Event detail loads within 1 second
- [ ] Profile loads within 1 second
- [ ] Timeline loads within 2 seconds

### Interactions
- [ ] Like button responds instantly
- [ ] Follow button responds instantly
- [ ] Comments post within 1 second
- [ ] Filter changes apply within 500ms

### Map Performance
- [ ] Clustering handles 100 markers smoothly
- [ ] Zoom transitions are smooth
- [ ] No lag when clicking markers
- [ ] Timeline scrolls smoothly

---

## 15. Browser Compatibility

### Browsers to Test
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Features to Verify
- [ ] All functionality works
- [ ] Styles render correctly
- [ ] Animations are smooth
- [ ] No console errors

---

## 16. Final Verification

### Complete Feature Set
- [ ] Authentication (login/logout)
- [ ] Feed with filtering
- [ ] Map with markers and timeline
- [ ] Timeline view
- [ ] Profiles with follow buttons
- [ ] Event detail with likes and comments
- [ ] Event creation
- [ ] Toast notifications
- [ ] Profile links throughout app

### Data Integrity
- [ ] Events have correct authors
- [ ] Likes persist after page refresh
- [ ] Comments persist after page refresh
- [ ] Follow relationships persist
- [ ] Filters work correctly with real data

### User Experience
- [ ] Navigation is intuitive
- [ ] Feedback is immediate
- [ ] Errors are handled gracefully
- [ ] Loading states are clear
- [ ] Success confirmations are satisfying

---

## Summary

**Total Test Items:** ~180 individual checks across 16 categories

**Estimated Testing Time:** 2-3 hours for complete thorough testing

**Critical Path Items (test these first):**
1. Login with demo accounts
2. View Feed and apply filters
3. Follow users and verify filtering works
4. View event detail
5. Like and comment on events
6. Create new event
7. View profiles and follow/unfollow

**Notes:**
- Test as multiple different users to verify social features
- Check both "happy path" and error scenarios
- Verify data persists across sessions
- Check mobile responsiveness throughout
- Confirm all profile links work everywhere

Good luck with testing! 🎉
