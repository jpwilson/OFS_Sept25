#!/usr/bin/env python3
"""
Comprehensive test for the follow request system
Tests:
1. Send follow request
2. Check request count
3. Get pending requests
4. Accept request
5. Reject request
6. Unfollow/cancel pending request
"""

import requests
import json

API_BASE = "http://localhost:8000/api/v1"

def login(email, password):
    """Login and get auth token"""
    response = requests.post(
        f"{API_BASE}/auth/login",
        headers={"Content-Type": "application/json"},
        json={"email": email, "password": password}
    )
    if response.status_code == 200:
        data = response.json()
        return data['access_token']
    else:
        print(f"Login failed for {email}: {response.text}")
        return None

def get_headers(token):
    """Get auth headers"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def test_follow_request_workflow():
    """Test complete follow request workflow"""
    print("=" * 60)
    print("TESTING FOLLOW REQUEST SYSTEM")
    print("=" * 60)

    # Login as two different users
    print("\n1. Logging in as Sarah Wilson (sarah@wilson.com)...")
    sarah_token = login("sarah@wilson.com", "password123")
    if not sarah_token:
        print("❌ Failed to login as sarah@wilson.com")
        return
    print("✓ Logged in as Sarah Wilson")

    print("\n2. Logging in as Tom Wilson (tom@wilson.com)...")
    tom_token = login("tom@wilson.com", "password123")
    if not tom_token:
        print("❌ Failed to login as tom@wilson.com")
        return
    print("✓ Logged in as Tom Wilson")

    # Sarah sends follow request to Tom
    print("\n3. Sarah sending follow request to Tom...")
    response = requests.post(
        f"{API_BASE}/users/tomw/follow",
        headers=get_headers(sarah_token)
    )
    print(f"   Response: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✓ {data.get('message', 'Follow request sent')}")
        print(f"   Status: {data.get('status', 'unknown')}")
    else:
        print(f"   Response: {response.text}")

    # Check follow status from Sarah's perspective
    print("\n4. Checking follow status from Sarah's perspective...")
    response = requests.get(
        f"{API_BASE}/users/tomw/is-following",
        headers=get_headers(sarah_token)
    )
    if response.status_code == 200:
        data = response.json()
        print(f"   is_following: {data.get('is_following')}")
        print(f"   status: {data.get('status')}")
        if data.get('status') == 'pending':
            print("   ✓ Follow request is pending")
        else:
            print(f"   ❌ Expected status 'pending', got '{data.get('status')}'")

    # Tom checks his follow request count
    print("\n5. Tom checking follow request count...")
    response = requests.get(
        f"{API_BASE}/users/me/follow-requests/count",
        headers=get_headers(tom_token)
    )
    if response.status_code == 200:
        data = response.json()
        count = data.get('count', 0)
        print(f"   ✓ Tom has {count} pending request(s)")
        if count == 0:
            print("   ⚠️  Expected at least 1 pending request")
    else:
        print(f"   ❌ Failed: {response.text}")

    # Tom views his pending requests
    print("\n6. Tom viewing pending follow requests...")
    response = requests.get(
        f"{API_BASE}/users/me/follow-requests",
        headers=get_headers(tom_token)
    )
    if response.status_code == 200:
        requests_data = response.json()
        print(f"   ✓ Tom has {len(requests_data)} pending request(s)")

        if len(requests_data) > 0:
            for req in requests_data:
                print(f"   - Request ID: {req.get('request_id')}")
                print(f"     From: {req.get('full_name')} (@{req.get('username')})")
                print(f"     Created: {req.get('created_at')}")

            # Tom accepts the first request
            first_request_id = requests_data[0].get('request_id')
            requester_username = requests_data[0].get('username')

            print(f"\n7. Tom accepting request {first_request_id} from {requester_username}...")
            response = requests.post(
                f"{API_BASE}/users/me/follow-requests/{first_request_id}/accept",
                headers=get_headers(tom_token)
            )
            if response.status_code == 200:
                data = response.json()
                print(f"   ✓ {data.get('message', 'Request accepted')}")
                print(f"   Status: {data.get('status', 'unknown')}")
            else:
                print(f"   ❌ Failed: {response.text}")

            # Verify Sarah is now following Tom
            print(f"\n8. Verifying Sarah is now following Tom...")
            response = requests.get(
                f"{API_BASE}/users/tomw/is-following",
                headers=get_headers(sarah_token)
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('is_following') and data.get('status') == 'accepted':
                    print("   ✓ Sarah is now following Tom (accepted)")
                else:
                    print(f"   ❌ Expected accepted follow, got: {data}")

            # Check Tom's follower count
            print(f"\n9. Checking Tom's profile for updated follower count...")
            response = requests.get(f"{API_BASE}/users/tomw")
            if response.status_code == 200:
                profile = response.json()
                print(f"   Followers: {profile.get('follower_count', 0)}")
                print(f"   Following: {profile.get('following_count', 0)}")
        else:
            print("   ⚠️  No pending requests found")
    else:
        print(f"   ❌ Failed: {response.text}")

    # Test rejecting a request - Sarah sends another request, Tom rejects it
    print("\n10. Testing request rejection...")

    # First, Sarah unfollows Tom
    print("    Sarah unfollowing Tom first...")
    response = requests.delete(
        f"{API_BASE}/users/tomw/follow",
        headers=get_headers(sarah_token)
    )
    if response.status_code == 200:
        print("    ✓ Unfollowed")

    # Sarah sends new request
    print("    Sarah sending new follow request...")
    response = requests.post(
        f"{API_BASE}/users/tomw/follow",
        headers=get_headers(sarah_token)
    )
    if response.status_code == 200:
        print("    ✓ New request sent")

    # Tom gets the new request
    response = requests.get(
        f"{API_BASE}/users/me/follow-requests",
        headers=get_headers(tom_token)
    )
    if response.status_code == 200:
        requests_data = response.json()
        if len(requests_data) > 0:
            request_id = requests_data[0].get('request_id')

            # Tom rejects it
            print(f"    Tom rejecting request {request_id}...")
            response = requests.post(
                f"{API_BASE}/users/me/follow-requests/{request_id}/reject",
                headers=get_headers(tom_token)
            )
            if response.status_code == 200:
                print("    ✓ Request rejected successfully")
            else:
                print(f"    ❌ Failed to reject: {response.text}")

    print("\n" + "=" * 60)
    print("FOLLOW REQUEST SYSTEM TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    test_follow_request_workflow()
