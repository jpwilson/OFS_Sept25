#!/usr/bin/env python3
"""
Rich Seed Data Generator for Our Family Socials
Creates 20 users across 4 families with 100 diverse events
"""
import requests
import json
from datetime import datetime, timedelta
import random

BASE_URL = "http://localhost:8000/api/v1"

# ============================================================================
# USER DATA - 20 Users across 4 Families
# ============================================================================

USERS = [
    # Wilson Family (4 members)
    {"email": "sarah@wilson.com", "username": "sarahw", "password": "password123", "full_name": "Sarah Wilson"},
    {"email": "tom@wilson.com", "username": "tomw", "password": "password123", "full_name": "Tom Wilson"},
    {"email": "emma.w@wilson.com", "username": "emmaw", "password": "password123", "full_name": "Emma Wilson"},
    {"email": "jake@wilson.com", "username": "jakew", "password": "password123", "full_name": "Jake Wilson"},

    # Chen Family (5 members)
    {"email": "michael@chen.com", "username": "michaelc", "password": "password123", "full_name": "Michael Chen"},
    {"email": "lisa@chen.com", "username": "lisac", "password": "password123", "full_name": "Lisa Chen"},
    {"email": "david@chen.com", "username": "davidc", "password": "password123", "full_name": "David Chen"},
    {"email": "mei@chen.com", "username": "meic", "password": "password123", "full_name": "Mei Chen"},
    {"email": "alex@chen.com", "username": "alexc", "password": "password123", "full_name": "Alex Chen"},

    # Rodriguez Family (5 members)
    {"email": "emma.r@rodriguez.com", "username": "emmar", "password": "password123", "full_name": "Emma Rodriguez"},
    {"email": "james@rodriguez.com", "username": "jamesr", "password": "password123", "full_name": "James Rodriguez"},
    {"email": "sofia@rodriguez.com", "username": "sofiar", "password": "password123", "full_name": "Sofia Rodriguez"},
    {"email": "carlos@rodriguez.com", "username": "carlosr", "password": "password123", "full_name": "Carlos Rodriguez"},
    {"email": "maria@rodriguez.com", "username": "mariar", "password": "password123", "full_name": "Maria Rodriguez"},

    # Johnson Family (6 members)
    {"email": "robert@johnson.com", "username": "robertj", "password": "password123", "full_name": "Robert Johnson"},
    {"email": "patricia@johnson.com", "username": "patriciaj", "password": "password123", "full_name": "Patricia Johnson"},
    {"email": "jennifer@johnson.com", "username": "jenniferj", "password": "password123", "full_name": "Jennifer Johnson"},
    {"email": "mark@johnson.com", "username": "markj", "password": "password123", "full_name": "Mark Johnson"},
    {"email": "linda@johnson.com", "username": "lindaj", "password": "password123", "full_name": "Linda Johnson"},
    {"email": "brian@johnson.com", "username": "brianj", "password": "password123", "full_name": "Brian Johnson"},
]

# ============================================================================
# EVENT TEMPLATES - Will create 100 events (5 per user)
# ============================================================================

EVENT_TEMPLATES = [
    # Travel Events
    {
        "title": "European Adventure 2025",
        "description": "Three weeks exploring Paris, Rome, and Barcelona with the family",
        "location": "Paris, France",
        "lat": 48.8566,
        "lon": 2.3522,
        "cover": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80",
        "days_ago": -30,
        "duration": 21,
        "is_public": True,
        "content_blocks": [
            {"type": "text", "content": "After months of planning, we finally embarked on our dream European adventure! This trip was everything we hoped for and more."},
            {"type": "image", "url": "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=1200&q=80", "caption": "Sunset at the Eiffel Tower - our first evening in Paris"},
            {"type": "text", "content": "Paris welcomed us with open arms. We spent three magical days wandering through the Louvre, savoring croissants at corner cafes, and marveling at Notre-Dame's grandeur."},
            {"type": "image", "url": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=80", "caption": "The kids loved the street performers at Montmartre"},
        ]
    },
    {
        "title": "Tokyo Cherry Blossom Festival",
        "description": "Perfect timing for sakura season - experiencing Japan's beauty",
        "location": "Tokyo, Japan",
        "lat": 35.6762,
        "lon": 139.6503,
        "cover": "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1600&q=80",
        "days_ago": 45,
        "duration": 10,
        "is_public": True,
        "content_blocks": [
            {"type": "text", "content": "We timed our trip perfectly to catch the cherry blossoms in full bloom. The entire city was painted in shades of pink and white."},
            {"type": "image", "url": "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1200&q=80", "caption": "Ueno Park was absolutely breathtaking"},
            {"type": "text", "content": "Beyond the cherry blossoms, Tokyo amazed us with its blend of ancient traditions and cutting-edge technology. From serene temples to bustling electronics districts, every neighborhood told a different story."},
        ]
    },

    # Milestone Events
    {
        "title": "Grandma's 90th Birthday Celebration",
        "description": "Four generations gathered to celebrate an incredible woman",
        "location": "Boston, MA",
        "lat": 42.3601,
        "lon": -71.0589,
        "cover": "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1600&q=80",
        "days_ago": 14,
        "duration": 1,
        "is_public": False,
        "content_blocks": [
            {"type": "text", "content": "Grandma Dorothy turned 90 today, and we couldn't let this milestone pass without a proper celebration. Over 50 family members traveled from across the country to honor her."},
            {"type": "image", "url": "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=1200&q=80", "caption": "The birthday girl surrounded by love"},
            {"type": "text", "content": "The highlight was when all the great-grandchildren sang 'Happy Birthday' - there wasn't a dry eye in the room. Grandma shared stories from her youth that we'd never heard before."},
            {"type": "image", "url": "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=1200&q=80", "caption": "Four generations in one photo - priceless"},
        ]
    },

    # Project Events
    {
        "title": "Kitchen Renovation Complete",
        "description": "From demolition to dream kitchen - a 6-week transformation",
        "location": "Portland, OR",
        "lat": 45.5152,
        "lon": -122.6784,
        "cover": "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=1600&q=80",
        "days_ago": 7,
        "duration": 42,
        "is_public": True,
        "content_blocks": [
            {"type": "text", "content": "After living with a construction zone for six weeks, our kitchen renovation is finally complete! It was a long journey, but seeing the finished result makes it all worthwhile."},
            {"type": "image", "url": "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1200&q=80", "caption": "Before: The outdated 1980s kitchen we lived with for years"},
            {"type": "text", "content": "We went with white shaker cabinets, quartz countertops, and a gorgeous blue tile backsplash. The new island has become everyone's favorite gathering spot."},
            {"type": "image", "url": "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=1200&q=80", "caption": "After: Our beautiful new kitchen - worth every penny!"},
        ]
    },
    {
        "title": "Backyard Garden Transformation",
        "description": "Six months of sweat equity turned our bare yard into an oasis",
        "location": "San Diego, CA",
        "lat": 32.7157,
        "lon": -117.1611,
        "cover": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1600&q=80",
        "days_ago": 30,
        "duration": 180,
        "is_public": True,
        "content_blocks": [
            {"type": "text", "content": "When we moved in, our backyard was nothing but dirt, weeds, and one sad dying tree. But we had a vision - a garden sanctuary where we could grow our own food and attract local wildlife."},
            {"type": "image", "url": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80", "caption": "Week 1: Just dirt and dreams"},
            {"type": "text", "content": "We started with raised beds for vegetables, added a drip irrigation system, and planted native California plants around the perimeter. The kids helped design a butterfly garden in the corner."},
            {"type": "image", "url": "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1200&q=80", "caption": "Month 6: Thriving vegetables and blooming flowers"},
        ]
    },
]

print("=" * 80)
print("RICH SEED DATA GENERATOR")
print("Creating 20 users and 100 events with content, comments, and likes")
print("=" * 80)

def register_users():
    """Register all users and return their tokens"""
    print("\n[1/5] Registering users...")
    user_tokens = {}

    for user in USERS:
        try:
            res = requests.post(f"{BASE_URL}/auth/register", json=user)
            if res.status_code == 200:
                token = res.json()["access_token"]
                user_tokens[user["username"]] = {
                    "token": token,
                    "full_name": user["full_name"]
                }
                print(f"  ✓ Registered {user['full_name']} (@{user['username']})")
            else:
                print(f"  ✗ Failed to register {user['username']}: {res.text}")
        except Exception as e:
            print(f"  ✗ Error registering {user['username']}: {e}")

    return user_tokens

def create_events(user_tokens):
    """Create 100 diverse events"""
    print("\n[2/5] Creating 100 events...")

    events_created = []
    usernames = list(user_tokens.keys())
    events_per_user = 5

    # Create 5 events per user
    for i, username in enumerate(usernames):
        token = user_tokens[username]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        for j in range(events_per_user):
            # Pick a template and customize it
            template_idx = (i * events_per_user + j) % len(EVENT_TEMPLATES)
            template = EVENT_TEMPLATES[template_idx].copy()

            # Customize dates
            days_offset = template["days_ago"] - (i * 5) - (j * 2)
            start_date = datetime.now() + timedelta(days=days_offset)
            end_date = start_date + timedelta(days=template["duration"])

            # Build event payload
            event_payload = {
                "title": template["title"],
                "description": template["description"],
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "location_name": template["location"],
                "latitude": template["lat"],
                "longitude": template["lon"],
                "cover_image_url": template["cover"],
                "is_published": template["is_public"]
            }

            try:
                res = requests.post(f"{BASE_URL}/events", json=event_payload, headers=headers)
                if res.status_code in [200, 201]:
                    event = res.json()
                    events_created.append({
                        "id": event["id"],
                        "title": event["title"],
                        "author": username,
                        "template": template
                    })
                    print(f"  ✓ Created '{template['title']}' by @{username}")
                else:
                    print(f"  ✗ Failed to create event: {res.text}")
            except Exception as e:
                print(f"  ✗ Error creating event: {e}")

    return events_created

def add_content_blocks(events_created, user_tokens):
    """Add rich content blocks to events"""
    print("\n[3/5] Adding content blocks to events...")

    for event_data in events_created:
        event_id = event_data["id"]
        username = event_data["author"]
        template = event_data["template"]

        if "content_blocks" not in template:
            continue

        token = user_tokens[username]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        for i, block in enumerate(template["content_blocks"]):
            payload = {
                "type": block["type"],
                "order": i
            }

            if block["type"] == "text":
                payload["content"] = block["content"]
            elif block["type"] == "image":
                payload["media_url"] = block["url"]
                payload["caption"] = block.get("caption", "")

            try:
                res = requests.post(
                    f"{BASE_URL}/events/{event_id}/content",
                    json=payload,
                    headers=headers
                )
                if res.status_code not in [200, 201]:
                    print(f"  ✗ Failed to add content block to event {event_id}")
            except Exception as e:
                print(f"  ✗ Error adding content block: {e}")

    print(f"  ✓ Added content blocks to {len(events_created)} events")

def add_comments(events_created, user_tokens):
    """Add comments from various users to events"""
    print("\n[4/5] Adding comments...")

    COMMENT_TEMPLATES = [
        "This looks amazing! Can't wait to hear more!",
        "What an incredible experience!",
        "Beautiful photos! Thanks for sharing.",
        "This brings back so many memories!",
        "Wow, I'm so jealous! Adding this to my bucket list.",
        "Great work on this! Really inspiring.",
        "Love seeing these updates!",
        "This turned out better than I imagined!",
        "Can't believe how much this has changed!",
        "Absolutely stunning!"
    ]

    comments_added = 0
    for event_data in events_created:
        event_id = event_data["id"]
        event_author = event_data["author"]

        # Each event gets 2-5 random comments from other users
        num_comments = random.randint(2, 5)
        commenters = random.sample(
            [u for u in user_tokens.keys() if u != event_author],
            min(num_comments, len(user_tokens) - 1)
        )

        for commenter in commenters:
            token = user_tokens[commenter]["token"]
            headers = {"Authorization": f"Bearer {token}"}
            comment_text = random.choice(COMMENT_TEMPLATES)

            try:
                res = requests.post(
                    f"{BASE_URL}/events/{event_id}/comments",
                    params={"content": comment_text},
                    headers=headers
                )
                if res.status_code in [200, 201]:
                    comments_added += 1
            except Exception as e:
                pass  # Silent fail for comments

    print(f"  ✓ Added {comments_added} comments across all events")

def add_likes(events_created, user_tokens):
    """Add likes from various users to events"""
    print("\n[5/5] Adding likes...")

    likes_added = 0
    for event_data in events_created:
        event_id = event_data["id"]
        event_author = event_data["author"]

        # Each event gets 3-10 random likes from other users
        num_likes = random.randint(3, 10)
        likers = random.sample(
            [u for u in user_tokens.keys() if u != event_author],
            min(num_likes, len(user_tokens) - 1)
        )

        for liker in likers:
            token = user_tokens[liker]["token"]
            headers = {"Authorization": f"Bearer {token}"}

            try:
                res = requests.post(
                    f"{BASE_URL}/events/{event_id}/like",
                    headers=headers
                )
                if res.status_code in [200, 201]:
                    likes_added += 1
            except Exception as e:
                pass  # Silent fail for likes

    print(f"  ✓ Added {likes_added} likes across all events")

def verify_data():
    """Verify the seeded data"""
    print("\n[Verification] Checking database...")

    try:
        res = requests.get(f"{BASE_URL}/events")
        if res.status_code == 200:
            events = res.json()
            print(f"\n  Total events: {len(events)}")

            # Count by author
            author_counts = {}
            for event in events:
                author = event.get('author_username', 'unknown')
                author_counts[author] = author_counts.get(author, 0) + 1

            print(f"  Events by author:")
            for author, count in sorted(author_counts.items()):
                print(f"    - @{author}: {count} events")
    except Exception as e:
        print(f"  ✗ Verification failed: {e}")

if __name__ == "__main__":
    try:
        user_tokens = register_users()
        events_created = create_events(user_tokens)
        add_content_blocks(events_created, user_tokens)
        add_comments(events_created, user_tokens)
        add_likes(events_created, user_tokens)
        verify_data()

        print("\n" + "=" * 80)
        print("✨ SEED DATA GENERATION COMPLETE!")
        print("=" * 80)
        print(f"\n{len(user_tokens)} users registered")
        print(f"{len(events_created)} events created")
        print("\nYour database now has rich, diverse content to work with!")
        print("\n")
    except KeyboardInterrupt:
        print("\n\nSeed data generation interrupted by user")
    except Exception as e:
        print(f"\n\n✗ Fatal error: {e}")
