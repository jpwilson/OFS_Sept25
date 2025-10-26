#!/usr/bin/env python3
"""
Comprehensive API Testing Script for Our Family Socials
Tests all major features and endpoints
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        self.tokens = {}

    def test(self, name, condition, error_msg=""):
        if condition:
            self.passed += 1
            print(f"✓ {name}")
            return True
        else:
            self.failed += 1
            print(f"✗ {name}")
            if error_msg:
                print(f"  Error: {error_msg}")
                self.errors.append(f"{name}: {error_msg}")
            return False

    def section(self, name):
        print(f"\n{'='*60}")
        print(f"{name}")
        print('='*60)

    def summary(self):
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY")
        print('='*60)
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Total:  {self.passed + self.failed}")

        if self.errors:
            print(f"\n{'='*60}")
            print("ERRORS:")
            for error in self.errors:
                print(f"  - {error}")

        return self.failed == 0

def main():
    runner = TestRunner()

    # ===== AUTHENTICATION TESTS =====
    runner.section("1. AUTHENTICATION TESTS")

    # Test login with Sarah Wilson
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "sarah@wilson.com",
            "password": "password123"
        })
        runner.test("Login with Sarah Wilson", response.status_code == 200)
        if response.status_code == 200:
            data = response.json()
            runner.tokens['sarah'] = data['access_token']
            runner.test("Token received", 'access_token' in data)
            runner.test("User data included", 'user' in data)
            runner.test("Username is sarahw", data['user']['username'] == 'sarahw')
    except Exception as e:
        runner.test("Login with Sarah Wilson", False, str(e))

    # Test login with Michael Chen
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "michael@chen.com",
            "password": "password123"
        })
        runner.test("Login with Michael Chen", response.status_code == 200)
        if response.status_code == 200:
            runner.tokens['michael'] = response.json()['access_token']
    except Exception as e:
        runner.test("Login with Michael Chen", False, str(e))

    # Test login with Emma Rodriguez
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "emma.r@rodriguez.com",
            "password": "password123"
        })
        runner.test("Login with Emma Rodriguez", response.status_code == 200)
        if response.status_code == 200:
            runner.tokens['emma'] = response.json()['access_token']
    except Exception as e:
        runner.test("Login with Emma Rodriguez", False, str(e))

    # Test invalid login
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "invalid@email.com",
            "password": "wrongpassword"
        })
        runner.test("Invalid login rejected", response.status_code != 200)
    except Exception as e:
        runner.test("Invalid login rejected", False, str(e))

    # ===== EVENTS TESTS =====
    runner.section("2. EVENTS TESTS")

    # Get all events
    try:
        response = requests.get(f"{BASE_URL}/events")
        runner.test("Get all events", response.status_code == 200)
        if response.status_code == 200:
            events = response.json()
            runner.test("Events is a list", isinstance(events, list))
            runner.test("Has events (>50)", len(events) > 50)
            if events:
                event = events[0]
                runner.test("Event has title", 'title' in event)
                runner.test("Event has author_username", 'author_username' in event)
                runner.test("Event has location", 'location_name' in event)
    except Exception as e:
        runner.test("Get all events", False, str(e))

    # Get specific event
    try:
        response = requests.get(f"{BASE_URL}/events/1")
        runner.test("Get event by ID", response.status_code == 200)
        if response.status_code == 200:
            event = response.json()
            runner.test("Event has ID", event['id'] == 1)
            runner.test("Event has title", 'title' in event)
            runner.test("Event has like_count", 'like_count' in event)
            runner.test("Event has comment_count", 'comment_count' in event)
    except Exception as e:
        runner.test("Get event by ID", False, str(e))

    # ===== PROFILE TESTS =====
    runner.section("3. PROFILE TESTS")

    # Get user profile
    try:
        response = requests.get(f"{BASE_URL}/users/sarahw")
        runner.test("Get user profile", response.status_code == 200)
        if response.status_code == 200:
            profile = response.json()
            runner.test("Profile has username", profile['username'] == 'sarahw')
            runner.test("Profile has full_name", 'full_name' in profile)
            runner.test("Profile has event_count", 'event_count' in profile)
            runner.test("Profile has follower_count", 'follower_count' in profile)
            runner.test("Profile has following_count", 'following_count' in profile)
            runner.test("Event count > 0", profile['event_count'] > 0)
    except Exception as e:
        runner.test("Get user profile", False, str(e))

    # Get user events
    try:
        response = requests.get(f"{BASE_URL}/users/sarahw/events")
        runner.test("Get user events", response.status_code == 200)
        if response.status_code == 200:
            events = response.json()
            runner.test("User events is a list", isinstance(events, list))
            runner.test("User has events", len(events) > 0)
    except Exception as e:
        runner.test("Get user events", False, str(e))

    # ===== FOLLOW SYSTEM TESTS =====
    runner.section("4. FOLLOW SYSTEM TESTS")

    if 'michael' in runner.tokens:
        # Check follow status
        try:
            headers = {"Authorization": f"Bearer {runner.tokens['michael']}"}
            response = requests.get(f"{BASE_URL}/users/sarahw/is-following", headers=headers)
            runner.test("Check follow status", response.status_code == 200)
        except Exception as e:
            runner.test("Check follow status", False, str(e))

        # Follow user
        try:
            headers = {"Authorization": f"Bearer {runner.tokens['michael']}"}
            response = requests.post(f"{BASE_URL}/users/sarahw/follow", headers=headers)
            runner.test("Follow user", response.status_code == 200)
        except Exception as e:
            runner.test("Follow user", False, str(e))

        # Unfollow user
        try:
            headers = {"Authorization": f"Bearer {runner.tokens['michael']}"}
            response = requests.delete(f"{BASE_URL}/users/sarahw/follow", headers=headers)
            runner.test("Unfollow user", response.status_code == 200)
        except Exception as e:
            runner.test("Unfollow user", False, str(e))

        # Get following list
        try:
            headers = {"Authorization": f"Bearer {runner.tokens['sarah']}"}
            response = requests.get(f"{BASE_URL}/users/me/following", headers=headers)
            runner.test("Get following list", response.status_code == 200)
            if response.status_code == 200:
                following = response.json()
                runner.test("Following is a list", isinstance(following, list))
        except Exception as e:
            runner.test("Get following list", False, str(e))

    # ===== LIKES TESTS =====
    runner.section("5. LIKES TESTS")

    if 'sarah' in runner.tokens:
        # Get event likes
        try:
            headers = {"Authorization": f"Bearer {runner.tokens['sarah']}"}
            response = requests.get(f"{BASE_URL}/events/1/likes", headers=headers)
            runner.test("Get event likes", response.status_code == 200)
            if response.status_code == 200:
                likes = response.json()
                runner.test("Likes has like_count", 'like_count' in likes)
                runner.test("Likes has is_liked", 'is_liked' in likes)
                runner.test("Likes has recent_likes", 'recent_likes' in likes)
        except Exception as e:
            runner.test("Get event likes", False, str(e))

        # Like event
        try:
            headers = {"Authorization": f"Bearer {runner.tokens['sarah']}"}
            response = requests.post(f"{BASE_URL}/events/2/likes", headers=headers)
            runner.test("Like event", response.status_code == 200)
        except Exception as e:
            runner.test("Like event", False, str(e))

        # Unlike event
        try:
            headers = {"Authorization": f"Bearer {runner.tokens['sarah']}"}
            response = requests.delete(f"{BASE_URL}/events/2/likes", headers=headers)
            runner.test("Unlike event", response.status_code == 200)
        except Exception as e:
            runner.test("Unlike event", False, str(e))

        # Get all likes for event
        try:
            response = requests.get(f"{BASE_URL}/events/1/likes/all")
            runner.test("Get all likes", response.status_code == 200)
            if response.status_code == 200:
                all_likes = response.json()
                runner.test("All likes is a list", isinstance(all_likes, list))
        except Exception as e:
            runner.test("Get all likes", False, str(e))

    # ===== COMMENTS TESTS =====
    runner.section("6. COMMENTS TESTS")

    # Get event comments
    try:
        response = requests.get(f"{BASE_URL}/events/1/comments")
        runner.test("Get event comments", response.status_code == 200)
        if response.status_code == 200:
            comments = response.json()
            runner.test("Comments is a list", isinstance(comments, list))
            if comments:
                comment = comments[0]
                runner.test("Comment has author_username", 'author_username' in comment)
                runner.test("Comment has content", 'content' in comment)
                runner.test("Comment has created_at", 'created_at' in comment)
    except Exception as e:
        runner.test("Get event comments", False, str(e))

    if 'sarah' in runner.tokens:
        # Create comment
        try:
            headers = {"Authorization": f"Bearer {runner.tokens['sarah']}"}
            response = requests.post(
                f"{BASE_URL}/events/2/comments",
                json={"content": "Test comment from automated testing!"},
                headers=headers
            )
            runner.test("Create comment", response.status_code == 200)
            if response.status_code == 200:
                comment = response.json()
                comment_id = comment['id']

                # Delete comment
                try:
                    response = requests.delete(
                        f"{BASE_URL}/events/2/comments/{comment_id}",
                        headers=headers
                    )
                    runner.test("Delete comment", response.status_code == 200)
                except Exception as e:
                    runner.test("Delete comment", False, str(e))
        except Exception as e:
            runner.test("Create comment", False, str(e))

    # ===== CREATE EVENT TEST =====
    runner.section("7. CREATE EVENT TEST")

    if 'sarah' in runner.tokens:
        try:
            headers = {"Authorization": f"Bearer {runner.tokens['sarah']}"}
            new_event = {
                "title": "API Test Event",
                "description": "This is a test event created via API",
                "start_date": "2025-12-01T10:00:00",
                "location_name": "Test Location",
                "latitude": 37.7749,
                "longitude": -122.4194,
                "cover_image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80"
            }
            response = requests.post(
                f"{BASE_URL}/events",
                json=new_event,
                headers=headers
            )
            runner.test("Create new event", response.status_code == 200)
            if response.status_code == 200:
                created_event = response.json()
                runner.test("Created event has ID", 'id' in created_event)
                runner.test("Created event has title", created_event['title'] == "API Test Event")
        except Exception as e:
            runner.test("Create new event", False, str(e))

    # ===== DATABASE INTEGRITY TESTS =====
    runner.section("8. DATABASE INTEGRITY TESTS")

    try:
        import sqlite3
        conn = sqlite3.connect('ofs.db')
        cursor = conn.cursor()

        # Count users
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        runner.test("Database has 20 users", user_count == 20)

        # Count events
        cursor.execute("SELECT COUNT(*) FROM events")
        event_count = cursor.fetchone()[0]
        runner.test("Database has 100+ events", event_count >= 100)

        # Count follows
        cursor.execute("SELECT COUNT(*) FROM follows")
        follow_count = cursor.fetchone()[0]
        runner.test("Database has 95+ follows", follow_count >= 95)

        # Count comments
        cursor.execute("SELECT COUNT(*) FROM comments")
        comment_count = cursor.fetchone()[0]
        runner.test("Database has comments", comment_count > 0)

        # Count likes
        cursor.execute("SELECT COUNT(*) FROM likes")
        like_count = cursor.fetchone()[0]
        runner.test("Database has likes", like_count > 0)

        conn.close()
    except Exception as e:
        runner.test("Database integrity check", False, str(e))

    # Print summary
    success = runner.summary()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
