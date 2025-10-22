# Our Family Socials (OFS) - Project Context

## Core Concept
A curated social network for trusted friends and family to share rich, detailed life experiences - from vacations and weddings to DIY projects - in a magazine-style format with proper context, timeline, and geographic information.

## The Problem
Current social platforms (like Facebook) allow posting about events with some photos, but lack:
- Proper contextualization of photos with narrative
- Timeline and geographic mapping
- Magazine/blog-style layout where images are inline with relevant text
- Ability to create detailed, multi-day event stories
- Curation and structure for complex events

## The Solution
A platform that allows users to create detailed, structured event stories with:

### Event Structure
- **Events**: Weddings, vacations, honeymoons, DIY projects, etc.
- **Days/Sections**: Multi-day events broken into logical sections
- **Rich Content**: Text descriptions, photos with captions, videos
- **Metadata**: Dates, locations (GPS coordinates)
- **Timeline**: Events ordered chronologically as they actually happened

### Content Format
Think: Magazine article or illustrated book
- Narrative text describing experiences
- Photos embedded inline with relevant text sections
- Captions for each photo/video
- Context matters: breakfast photos appear with breakfast description
- Users can navigate through content at their own pace

### Geographic Component
- Spatial/geographic data (PostGIS-style in future)
- Map visualization of locations visited
- For DIY projects: simple GPS point (less relevant but included)
- Not required for MVP but architecture should support it

### Social Features
- Private network of trusted users (family/friends)
- View events shared by your network
- Comments and likes
- User can control who sees their events
- Reciprocal sharing model

## Example Use Case: Africa Vacation
1. Create "Africa Vacation 2025" event
2. Add days/sections: "Game Farm Day 1", "Drive to Zululand", etc.
3. For each day:
   - Write narrative about what happened
   - Add photos inline with text (breakfast photos with breakfast story)
   - Add video clips
   - Tag GPS locations
4. Family/friends can view the entire trip in context
5. They can see timeline, map of locations, and rich narrative with photos

## User Experience
- Homepage shows all events from your network, ordered by date
- Click into an event to see the full story
- Gallery views available
- Timeline view
- Map view (future)
- Comment/like on events

## Technical Stack (Initial)
- **Frontend**: React
- **Backend**: Python
- **Database**: SQLite (for local MVP), eventually SQL/PostgreSQL
- **Future**: PostGIS for spatial data

## Development Approach
Start with MVP, iterate and build out features progressively.

## Differentiator
Unlike Facebook posts or Instagram stories, this preserves the full context and narrative of life experiences in a way that's enjoyable to revisit and share - like a personal magazine that your loved ones can read.