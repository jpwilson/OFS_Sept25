#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"

# Users to create
users = [
    {"email": "michael@example.com", "username": "michaelc", "password": "password123", "full_name": "Michael Chen"},
    {"email": "emma@example.com", "username": "emmar", "password": "password123", "full_name": "Emma Rodriguez"},
]

# Register users and store tokens
user_tokens = {}

# First user already created (Sarah), get token by logging in
login_res = requests.post(f"{BASE_URL}/auth/login", json={"email": "sarah@example.com", "password": "password123"})
if login_res.status_code == 200:
    user_tokens["sarahw"] = login_res.json()["access_token"]
    print("✓ Logged in as Sarah Wilson")

# Register or login other users
for user in users:
    res = requests.post(f"{BASE_URL}/auth/register", json=user)
    if res.status_code == 201 or res.status_code == 200:
        token = res.json()["access_token"]
        user_tokens[user["username"]] = token
        print(f"✓ Created user {user['full_name']}")
    else:
        # User already exists, try to login
        login_res = requests.post(f"{BASE_URL}/auth/login", json={"email": user["email"], "password": user["password"]})
        if login_res.status_code == 200:
            token = login_res.json()["access_token"]
            user_tokens[user["username"]] = token
            print(f"✓ Logged in as {user['full_name']}")
        else:
            print(f"✗ Failed to login {user['username']}: {login_res.text}")

# Events to create - at least 2 per user
events = [
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
            "description": "Four generations gathered to celebrate an incredible woman who taught us all about love, resilience, and joy",
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
            "description": "A year of firsts - from first smile to first steps, documenting our daughter Sophie's incredible first year",
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
            "description": "Epic 5-week road trip from Portland to New York, hitting 15 states and countless adventures",
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
            "description": "The most magical day of our lives - surrounded by family and friends at a beautiful vineyard",
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

# Create events
for event_data in events:
    user = event_data["user"]
    event = event_data["event"]

    headers = {"Authorization": f"Bearer {user_tokens[user]}"}
    res = requests.post(f"{BASE_URL}/events", json=event, headers=headers)

    if res.status_code == 201 or res.status_code == 200:
        print(f"✓ Created event '{event['title']}' by {user}")
    else:
        print(f"✗ Failed to create event: {res.text}")

print("\n✨ Seed data created successfully!")
print("   Frontend: http://localhost:3000")
print("   Backend API: http://localhost:8000/docs")