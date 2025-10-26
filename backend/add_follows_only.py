#!/usr/bin/env python3
"""
Add Follow Relationships ONLY - doesn't touch existing data
"""
import requests
import random

BASE_URL = "http://localhost:8000/api/v1"

# All 20 demo users (email + username)
USERS = [
    {"email": "sarah@wilson.com", "username": "sarahw", "password": "password123"},
    {"email": "tom@wilson.com", "username": "tomw", "password": "password123"},
    {"email": "emma.w@wilson.com", "username": "emmaw", "password": "password123"},
    {"email": "jake@wilson.com", "username": "jakew", "password": "password123"},
    {"email": "michael@chen.com", "username": "michaelc", "password": "password123"},
    {"email": "lisa@chen.com", "username": "lisac", "password": "password123"},
    {"email": "david@chen.com", "username": "davidc", "password": "password123"},
    {"email": "mei@chen.com", "username": "meic", "password": "password123"},
    {"email": "alex@chen.com", "username": "alexc", "password": "password123"},
    {"email": "emma.r@rodriguez.com", "username": "emmar", "password": "password123"},
    {"email": "james@rodriguez.com", "username": "jamesr", "password": "password123"},
    {"email": "sofia@rodriguez.com", "username": "sofiar", "password": "password123"},
    {"email": "carlos@rodriguez.com", "username": "carlosr", "password": "password123"},
    {"email": "maria@rodriguez.com", "username": "mariar", "password": "password123"},
    {"email": "robert@johnson.com", "username": "robertj", "password": "password123"},
    {"email": "patricia@johnson.com", "username": "patriciaj", "password": "password123"},
    {"email": "linda@johnson.com", "username": "lindaj", "password": "password123"},
    {"email": "william@johnson.com", "username": "williamj", "password": "password123"},
    {"email": "jennifer@johnson.com", "username": "jenniferj", "password": "password123"},
    {"email": "brian@johnson.com", "username": "brianj", "password": "password123"},
]

def login_users():
    """Login all users and get their tokens"""
    print("Logging in users...")
    user_tokens = {}

    for user in USERS:
        try:
            res = requests.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": user["email"],
                    "password": user["password"]
                }
            )
            if res.status_code == 200:
                data = res.json()
                user_tokens[user["username"]] = data["access_token"]
                print(f"  ✓ Logged in: {user['username']}")
            else:
                print(f"  ✗ Failed to login: {user['username']} - {res.status_code}")
        except Exception as e:
            print(f"  ✗ Error logging in {user['username']}: {e}")

    return user_tokens

def add_follows(user_tokens):
    """Create follow relationships between users"""
    print("\nAdding follow relationships...")

    usernames = list(user_tokens.keys())
    follows_added = 0

    for follower in usernames:
        # Each user follows 3-7 random other users
        num_to_follow = random.randint(3, 7)

        # Get other users (not self)
        others = [u for u in usernames if u != follower]
        to_follow = random.sample(others, min(num_to_follow, len(others)))

        for followee in to_follow:
            token = user_tokens[follower]
            headers = {"Authorization": f"Bearer {token}"}

            try:
                res = requests.post(
                    f"{BASE_URL}/users/{followee}/follow",
                    headers=headers
                )
                if res.status_code == 200:
                    follows_added += 1
                    print(f"  ✓ {follower} → {followee}")
            except Exception as e:
                print(f"  ✗ Failed: {follower} → {followee}")

    print(f"\n✅ Added {follows_added} follow relationships!")

def main():
    user_tokens = login_users()

    if len(user_tokens) == 0:
        print("\n❌ No users logged in! Exiting...")
        return

    add_follows(user_tokens)

if __name__ == "__main__":
    main()
