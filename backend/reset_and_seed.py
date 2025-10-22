#!/usr/bin/env python3
"""
Database Reset and Seed Script
Deletes all events and creates 9 properly attributed events (3 per user)
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"

print("=" * 70)
print("DATABASE RESET AND SEED SCRIPT")
print("=" * 70)

# Step 1: Login as each user to get tokens
print("\n[1/4] Authenticating users...")
users_config = [
    {"email": "sarah@example.com", "username": "sarahw", "password": "password123", "full_name": "Sarah Wilson"},
    {"email": "michael@example.com", "username": "michaelc", "password": "password123", "full_name": "Michael Chen"},
    {"email": "emma@example.com", "username": "emmar", "password": "password123", "full_name": "Emma Rodriguez"},
]

user_tokens = {}
for user_config in users_config:
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": user_config["email"],
        "password": user_config["password"]
    })

    if login_res.status_code == 200:
        token = login_res.json()["access_token"]
        user_tokens[user_config["username"]] = token
        print(f"  ✓ Logged in as {user_config['full_name']} (@{user_config['username']})")
    else:
        print(f"  ✗ Failed to login {user_config['username']}: {login_res.text}")
        exit(1)

# Step 2: Delete ALL existing events
print("\n[2/4] Deleting all existing events...")
for username, token in user_tokens.items():
    headers = {"Authorization": f"Bearer {token}"}

    # Get all events
    events_res = requests.get(f"{BASE_URL}/events", headers=headers)
    if events_res.status_code == 200:
        events = events_res.json()
        deleted_count = 0

        for event in events:
            delete_res = requests.delete(f"{BASE_URL}/events/{event['id']}", headers=headers)
            if delete_res.status_code == 200 or delete_res.status_code == 204:
                deleted_count += 1

        if deleted_count > 0:
            print(f"  ✓ Deleted {deleted_count} events for {username}")

# Step 3: Create fresh events - properly attributed
print("\n[3/4] Creating fresh events...")

events_to_create = [
    # Sarah Wilson - 3 events
    {
        "user": "sarahw",
        "event": {
            "title": "Africa Adventure 2025",
            "description": "Our incredible journey through South Africa - safari adventures in Kruger National Park",
            "start_date": (datetime.now() + timedelta(days=60)).isoformat(),
            "end_date": (datetime.now() + timedelta(days=73)).isoformat(),
            "location_name": "South Africa",
            "latitude": -25.7479,
            "longitude": 28.2293,
            "cover_image_url": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1600&q=80",
            "is_published": True
        }
    },
    {
        "user": "sarahw",
        "event": {
            "title": "Japanese Cherry Blossom Journey",
            "description": "Perfect timing for sakura season - exploring Japan's ancient temples and modern cities",
            "start_date": (datetime.now() - timedelta(days=200)).isoformat(),
            "end_date": (datetime.now() - timedelta(days=187)).isoformat(),
            "location_name": "Tokyo & Kyoto, Japan",
            "latitude": 35.6762,
            "longitude": 139.6503,
            "cover_image_url": "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1600&q=80",
            "is_published": True
        }
    },
    {
        "user": "sarahw",
        "event": {
            "title": "Grandma's 90th Birthday Celebration",
            "description": "Four generations gathered to celebrate an incredible woman",
            "start_date": (datetime.now() - timedelta(days=45)).isoformat(),
            "end_date": (datetime.now() - timedelta(days=45)).isoformat(),
            "location_name": "Boston, MA",
            "latitude": 42.3601,
            "longitude": -71.0589,
            "cover_image_url": "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1600&q=80",
            "is_published": True
        }
    },
    # Michael Chen - 3 events
    {
        "user": "michaelc",
        "event": {
            "title": "Kitchen Renovation Complete",
            "description": "After months of planning and four weeks of construction, our kitchen transformation is finally done",
            "start_date": (datetime.now() - timedelta(days=30)).isoformat(),
            "end_date": (datetime.now() - timedelta(days=5)).isoformat(),
            "location_name": "Portland, OR",
            "latitude": 45.5152,
            "longitude": -122.6784,
            "cover_image_url": "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=1600&q=80",
            "is_published": True
        }
    },
    {
        "user": "michaelc",
        "event": {
            "title": "Baby's First Year",
            "description": "A year of firsts - from first smile to first steps",
            "start_date": (datetime.now() - timedelta(days=365)).isoformat(),
            "end_date": (datetime.now()).isoformat(),
            "location_name": "Portland, OR",
            "latitude": 45.5152,
            "longitude": -122.6784,
            "cover_image_url": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=1600&q=80",
            "is_published": True
        }
    },
    {
        "user": "michaelc",
        "event": {
            "title": "Cross-Country Road Trip",
            "description": "Epic 5-week road trip from Portland to New York",
            "start_date": (datetime.now() - timedelta(days=120)).isoformat(),
            "end_date": (datetime.now() - timedelta(days=85)).isoformat(),
            "location_name": "USA Coast to Coast",
            "latitude": 39.8283,
            "longitude": -98.5795,
            "cover_image_url": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80",
            "is_published": True
        }
    },
    # Emma Rodriguez - 3 events
    {
        "user": "emmar",
        "event": {
            "title": "Emma & James Wedding",
            "description": "The most magical day of our lives",
            "start_date": (datetime.now() - timedelta(days=270)).isoformat(),
            "end_date": (datetime.now() - timedelta(days=270)).isoformat(),
            "location_name": "Napa Valley, CA",
            "latitude": 38.2975,
            "longitude": -122.2869,
            "cover_image_url": "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80",
            "is_published": True
        }
    },
    {
        "user": "emmar",
        "event": {
            "title": "Iceland Northern Lights Adventure",
            "description": "Chasing the aurora borealis across the land of fire and ice",
            "start_date": (datetime.now() - timedelta(days=310)).isoformat(),
            "end_date": (datetime.now() - timedelta(days=300)).isoformat(),
            "location_name": "Reykjavik, Iceland",
            "latitude": 64.1466,
            "longitude": -21.9426,
            "cover_image_url": "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=1600&q=80",
            "is_published": True
        }
    },
    {
        "user": "emmar",
        "event": {
            "title": "Backyard Garden Transformation",
            "description": "Six months of sweat equity turned our bare backyard into a flourishing garden oasis",
            "start_date": (datetime.now() - timedelta(days=210)).isoformat(),
            "end_date": (datetime.now() - timedelta(days=30)).isoformat(),
            "location_name": "San Diego, CA",
            "latitude": 32.7157,
            "longitude": -117.1611,
            "cover_image_url": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1600&q=80",
            "is_published": True
        }
    }
]

created_events = []
for event_data in events_to_create:
    username = event_data["user"]
    event = event_data["event"]

    headers = {"Authorization": f"Bearer {user_tokens[username]}"}
    res = requests.post(f"{BASE_URL}/events", json=event, headers=headers)

    if res.status_code == 201 or res.status_code == 200:
        created_event = res.json()
        created_events.append(created_event)
        print(f"  ✓ Created '{event['title']}' by @{username}")
    else:
        print(f"  ✗ Failed to create event: {res.text}")

# Step 4: Verify
print("\n[4/4] Verifying database...")
verify_res = requests.get(f"{BASE_URL}/events")
if verify_res.status_code == 200:
    all_events = verify_res.json()

    # Count by author
    author_counts = {}
    for event in all_events:
        author = event.get('author_username', 'unknown')
        author_counts[author] = author_counts.get(author, 0) + 1

    print(f"\n  Total events in database: {len(all_events)}")
    print("  Events by author:")
    for author, count in author_counts.items():
        print(f"    - @{author}: {count} events")

print("\n" + "=" * 70)
print("✨ DATABASE RESET COMPLETE!")
print("=" * 70)
print("\nNext steps:")
print("1. Restart frontend: http://localhost:3000")
print("2. Check Michael Chen's profile - should have 3 events")
print("3. Check Emma Rodriguez's profile - should have 3 events")
print("4. Check Map view - should show 9 events with clustering")
print("\n")
