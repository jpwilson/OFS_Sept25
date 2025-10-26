#!/bin/bash

# Test script for Our Family Socials API

echo "=== Testing Our Family Socials API ==="
echo ""

# 1. Test login with Sarah Wilson
echo "1. Testing login with Sarah Wilson..."
SARAH_TOKEN=$(curl -s http://localhost:8000/api/v1/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email": "sarah@wilson.com", "password": "password123"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

if [ ! -z "$SARAH_TOKEN" ]; then
    echo "✓ Login successful"
else
    echo "✗ Login failed"
    exit 1
fi

# 2. Test getting all events
echo ""
echo "2. Testing get all events..."
EVENTS_COUNT=$(curl -s http://localhost:8000/api/v1/events/ | \
  python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
echo "   Found $EVENTS_COUNT events"

# 3. Test getting user profile
echo ""
echo "3. Testing get user profile..."
curl -s "http://localhost:8000/api/v1/users/sarahw" | python3 -m json.tool | head -20

# 4. Test follow user
echo ""
echo "4. Testing follow user (Sarah follows Michael)..."
MICHAEL_TOKEN=$(curl -s http://localhost:8000/api/v1/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email": "michael@chen.com", "password": "password123"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

curl -s -X POST "http://localhost:8000/api/v1/users/sarahw/follow" \
  -H "Authorization: Bearer $MICHAEL_TOKEN" | python3 -m json.tool

# 5. Test get event detail
echo ""
echo "5. Testing get event detail (Event 1)..."
curl -s "http://localhost:8000/api/v1/events/1" | python3 -m json.tool | head -30

# 6. Test like event
echo ""
echo "6. Testing like event..."
curl -s -X POST "http://localhost:8000/api/v1/events/1/like" \
  -H "Authorization: Bearer $SARAH_TOKEN" | python3 -m json.tool

# 7. Test create comment
echo ""
echo "7. Testing create comment..."
curl -s -X POST "http://localhost:8000/api/v1/events/1/comments" \
  -H "Authorization: Bearer $SARAH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test comment from API testing!"}' | python3 -m json.tool

# 8. Test get comments
echo ""
echo "8. Testing get comments for event 1..."
curl -s "http://localhost:8000/api/v1/events/1/comments" | python3 -m json.tool | head -40

echo ""
echo "=== Testing complete ==="
