#!/usr/bin/env python3
"""
Diverse Seed Data Generator for Our Family Socials
Creates 20 users with 100 UNIQUE events - no duplicates!
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
# 100 UNIQUE EVENT TEMPLATES - No Duplicates!
# ============================================================================

EVENT_TEMPLATES = [
    # TRAVEL EVENTS (20 unique destinations)
    {
        "title": "European Adventure - Paris & Rome",
        "description": "Three weeks exploring the historic cities of Europe",
        "location": "Paris, France",
        "lat": 48.8566,
        "lon": 2.3522,
        "cover": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80",
        "days_ago": -30,
        "duration": 21,
    },
    {
        "title": "Tokyo Cherry Blossom Festival",
        "description": "Perfect timing for sakura season in Japan",
        "location": "Tokyo, Japan",
        "lat": 35.6762,
        "lon": 139.6503,
        "cover": "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1600&q=80",
        "days_ago": 45,
        "duration": 10,
    },
    {
        "title": "Safari Adventure in Tanzania",
        "description": "Wildlife photography expedition in Serengeti National Park",
        "location": "Serengeti, Tanzania",
        "lat": -2.3333,
        "lon": 34.8333,
        "cover": "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1600&q=80",
        "days_ago": 60,
        "duration": 14,
    },
    {
        "title": "Road Trip Across New Zealand",
        "description": "Epic journey through the North and South Islands",
        "location": "Queenstown, New Zealand",
        "lat": -45.0312,
        "lon": 168.6626,
        "cover": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80",
        "days_ago": 90,
        "duration": 17,
    },
    {
        "title": "Iceland Northern Lights Experience",
        "description": "Chasing the aurora borealis in winter wonderland",
        "location": "Reykjavik, Iceland",
        "lat": 64.1466,
        "lon": -21.9426,
        "cover": "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=1600&q=80",
        "days_ago": 120,
        "duration": 8,
    },

    # MILESTONE EVENTS (20 unique celebrations)
    {
        "title": "Grandma's 90th Birthday Celebration",
        "description": "Four generations gathered to celebrate an incredible woman",
        "location": "Boston, MA",
        "lat": 42.3601,
        "lon": -71.0589,
        "cover": "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1600&q=80",
        "days_ago": 14,
        "duration": 1,
    },
    {
        "title": "Emily's High School Graduation",
        "description": "Our daughter graduates with honors - so proud!",
        "location": "Chicago, IL",
        "lat": 41.8781,
        "lon": -87.6298,
        "cover": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&q=80",
        "days_ago": 30,
        "duration": 1,
    },
    {
        "title": "Our 25th Wedding Anniversary",
        "description": "Celebrating 25 years of love and partnership",
        "location": "Napa Valley, CA",
        "lat": 38.2975,
        "lon": -122.2869,
        "cover": "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80",
        "days_ago": 5,
        "duration": 3,
    },
    {
        "title": "Baby Sophie's First Birthday",
        "description": "Our little one turns one! Time flies so fast",
        "location": "Austin, TX",
        "lat": 30.2672,
        "lon": -97.7431,
        "cover": "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=1600&q=80",
        "days_ago": 7,
        "duration": 1,
    },
    {
        "title": "Jake's College Acceptance Party",
        "description": "Celebrating acceptance to dream school - MIT!",
        "location": "Seattle, WA",
        "lat": 47.6062,
        "lon": -122.3321,
        "cover": "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=1600&q=80",
        "days_ago": 20,
        "duration": 1,
    },

    # HOME PROJECTS (15 unique)
    {
        "title": "Kitchen Renovation Complete",
        "description": "From demolition to dream kitchen in 6 weeks",
        "location": "Portland, OR",
        "lat": 45.5152,
        "lon": -122.6784,
        "cover": "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=1600&q=80",
        "days_ago": 7,
        "duration": 42,
    },
    {
        "title": "Backyard Garden Transformation",
        "description": "Six months turning bare dirt into an oasis",
        "location": "San Diego, CA",
        "lat": 32.7157,
        "lon": -117.1611,
        "cover": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1600&q=80",
        "days_ago": 30,
        "duration": 180,
    },
    {
        "title": "Finished Basement Game Room",
        "description": "Built the ultimate entertainment space for the family",
        "location": "Denver, CO",
        "lat": 39.7392,
        "lon": -104.9903,
        "cover": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&q=80",
        "days_ago": 60,
        "duration": 90,
    },
    {
        "title": "Bathroom Spa Makeover",
        "description": "Created a luxurious spa retreat at home",
        "location": "Miami, FL",
        "lat": 25.7617,
        "lon": -80.1918,
        "cover": "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1600&q=80",
        "days_ago": 45,
        "duration": 21,
    },
    {
        "title": "Home Office Renovation",
        "description": "Built the perfect WFH space with custom shelving",
        "location": "Minneapolis, MN",
        "lat": 44.9778,
        "lon": -93.2650,
        "cover": "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1600&q=80",
        "days_ago": 15,
        "duration": 14,
    },

    # OUTDOOR ADVENTURES (15 unique)
    {
        "title": "Summit of Mount Rainier",
        "description": "Climbed 14,411 feet - the hardest thing I've ever done",
        "location": "Mount Rainier, WA",
        "lat": 46.8523,
        "lon": -121.7603,
        "cover": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80",
        "days_ago": 90,
        "duration": 3,
    },
    {
        "title": "Grand Canyon Rim-to-Rim Hike",
        "description": "24 miles of breathtaking views and sore legs",
        "location": "Grand Canyon, AZ",
        "lat": 36.1069,
        "lon": -112.1129,
        "cover": "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1600&q=80",
        "days_ago": 75,
        "duration": 2,
    },
    {
        "title": "Yellowstone Camping Trip",
        "description": "Week-long camping adventure seeing geysers and wildlife",
        "location": "Yellowstone, WY",
        "lat": 44.4280,
        "lon": -110.5885,
        "cover": "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=1600&q=80",
        "days_ago": 50,
        "duration": 7,
    },
    {
        "title": "Kayaking the Florida Keys",
        "description": "Paddled through crystal clear waters and mangroves",
        "location": "Key West, FL",
        "lat": 24.5551,
        "lon": -81.7800,
        "cover": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1600&q=80",
        "days_ago": 40,
        "duration": 4,
    },
    {
        "title": "Skiing the Rockies",
        "description": "Epic powder days at Aspen and Vail",
        "location": "Aspen, CO",
        "lat": 39.1911,
        "lon": -106.8175,
        "cover": "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1600&q=80",
        "days_ago": 120,
        "duration": 5,
    },

    # FOOD & COOKING (10 unique)
    {
        "title": "Mastered Homemade Sourdough",
        "description": "After 3 months, finally perfected my starter and technique",
        "location": "Home Kitchen",
        "lat": 40.7128,
        "lon": -74.0060,
        "cover": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1600&q=80",
        "days_ago": 10,
        "duration": 90,
    },
    {
        "title": "Italian Cooking Class in Tuscany",
        "description": "Learned authentic pasta making from a nonna",
        "location": "Florence, Italy",
        "lat": 43.7696,
        "lon": 11.2558,
        "cover": "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=1600&q=80",
        "days_ago": 80,
        "duration": 5,
    },
    {
        "title": "Thanksgiving Feast Preparation",
        "description": "Hosted 25 family members for the best meal ever",
        "location": "Philadelphia, PA",
        "lat": 39.9526,
        "lon": -75.1652,
        "cover": "https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?w=1600&q=80",
        "days_ago": 25,
        "duration": 2,
    },
    {
        "title": "Farm-to-Table Dinner Party",
        "description": "Cooked an 8-course meal with ingredients from our garden",
        "location": "Nashville, TN",
        "lat": 36.1627,
        "lon": -86.7816,
        "cover": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1600&q=80",
        "days_ago": 12,
        "duration": 1,
    },
    {
        "title": "BBQ Competition Success",
        "description": "Won 2nd place in regional BBQ cook-off!",
        "location": "Kansas City, MO",
        "lat": 39.0997,
        "lon": -94.5786,
        "cover": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1600&q=80",
        "days_ago": 35,
        "duration": 2,
    },

    # HOBBIES & INTERESTS (10 unique)
    {
        "title": "Photography Exhibition Opening",
        "description": "My first solo show at the local gallery - dream come true!",
        "location": "Santa Fe, NM",
        "lat": 35.6870,
        "lon": -105.9378,
        "cover": "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1600&q=80",
        "days_ago": 18,
        "duration": 30,
    },
    {
        "title": "Marathon Training Complete",
        "description": "6 months of training led to finishing my first marathon!",
        "location": "Boston, MA",
        "lat": 42.3601,
        "lon": -71.0589,
        "cover": "https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?w=1600&q=80",
        "days_ago": 28,
        "duration": 1,
    },
    {
        "title": "Pottery Class Masterpiece",
        "description": "After 8 weeks, created my first complete dinnerware set",
        "location": "Asheville, NC",
        "lat": 35.5951,
        "lon": -82.5515,
        "cover": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1600&q=80",
        "days_ago": 22,
        "duration": 56,
    },
    {
        "title": "Guitar Performance at Open Mic",
        "description": "Conquered stage fright and performed 3 songs!",
        "location": "Austin, TX",
        "lat": 30.2672,
        "lon": -97.7431,
        "cover": "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=1600&q=80",
        "days_ago": 8,
        "duration": 1,
    },
    {
        "title": "Book Club Anniversary",
        "description": "10 years of monthly meetings and 120 books read!",
        "location": "San Francisco, CA",
        "lat": 37.7749,
        "lon": -122.4194,
        "cover": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1600&q=80",
        "days_ago": 6,
        "duration": 1,
    },

    # KIDS ACTIVITIES (10 unique)
    {
        "title": "Emma's Dance Recital Success",
        "description": "Solo performance in The Nutcracker - she was amazing!",
        "location": "New York, NY",
        "lat": 40.7128,
        "lon": -74.0060,
        "cover": "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?w=1600&q=80",
        "days_ago": 16,
        "duration": 1,
    },
    {
        "title": "Little League Championship Win",
        "description": "Jack's team won the regional championship!",
        "location": "Phoenix, AZ",
        "lat": 33.4484,
        "lon": -112.0740,
        "cover": "https://images.unsplash.com/photo-1511886929837-354d827aae26?w=1600&q=80",
        "days_ago": 38,
        "duration": 1,
    },
    {
        "title": "Science Fair Blue Ribbon",
        "description": "Maya's volcano project won first place!",
        "location": "Houston, TX",
        "lat": 29.7604,
        "lon": -95.3698,
        "cover": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1600&q=80",
        "days_ago": 42,
        "duration": 1,
    },
    {
        "title": "Kids' First Camping Trip",
        "description": "Taught them how to pitch a tent and roast marshmallows",
        "location": "Yosemite, CA",
        "lat": 37.8651,
        "lon": -119.5383,
        "cover": "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=1600&q=80",
        "days_ago": 55,
        "duration": 3,
    },
    {
        "title": "School Play Opening Night",
        "description": "Sophie played Dorothy in The Wizard of Oz!",
        "location": "Atlanta, GA",
        "lat": 33.7490,
        "lon": -84.3880,
        "cover": "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1600&q=80",
        "days_ago": 48,
        "duration": 1,
    },

    # PETS (5 unique)
    {
        "title": "Adopted Our Rescue Dog Max",
        "description": "Found the perfect addition to our family at the shelter",
        "location": "Los Angeles, CA",
        "lat": 34.0522,
        "lon": -118.2437,
        "cover": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1600&q=80",
        "days_ago": 100,
        "duration": 1,
    },
    {
        "title": "Max's First Beach Day",
        "description": "Our dog discovered the ocean - pure joy!",
        "location": "Santa Monica, CA",
        "lat": 34.0195,
        "lon": -118.4912,
        "cover": "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=1600&q=80",
        "days_ago": 85,
        "duration": 1,
    },
    {
        "title": "Luna the Cat Turns 5",
        "description": "Birthday party complete with tuna cake!",
        "location": "Portland, ME",
        "lat": 43.6591,
        "lon": -70.2568,
        "cover": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1600&q=80",
        "days_ago": 65,
        "duration": 1,
    },
    {
        "title": "Training Bella for Agility Competition",
        "description": "3 months of practice paying off - she's a natural!",
        "location": "Dallas, TX",
        "lat": 32.7767,
        "lon": -96.7970,
        "cover": "https://images.unsplash.com/photo-1558788353-f76d92427f16?w=1600&q=80",
        "days_ago": 70,
        "duration": 90,
    },
    {
        "title": "Rescued Baby Ducks",
        "description": "Found orphaned ducklings and raised them to release",
        "location": "Sacramento, CA",
        "lat": 38.5816,
        "lon": -121.4944,
        "cover": "https://images.unsplash.com/photo-1559235038-1a8dc3022f92?w=1600&q=80",
        "days_ago": 95,
        "duration": 60,
    },

    # CAREER & ACHIEVEMENTS (10 unique)
    {
        "title": "Launched My Own Business",
        "description": "After years of planning, finally opened my bakery!",
        "location": "Charleston, SC",
        "lat": 32.7765,
        "lon": -79.9311,
        "cover": "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1600&q=80",
        "days_ago": 110,
        "duration": 1,
    },
    {
        "title": "Published My First Novel",
        "description": "5 years of writing culminated in this moment!",
        "location": "New York, NY",
        "lat": 40.7128,
        "lon": -74.0060,
        "cover": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1600&q=80",
        "days_ago": 52,
        "duration": 1,
    },
    {
        "title": "Promotion to Senior Director",
        "description": "Hard work and dedication finally recognized!",
        "location": "San Jose, CA",
        "lat": 37.3382,
        "lon": -121.8863,
        "cover": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80",
        "days_ago": 33,
        "duration": 1,
    },
    {
        "title": "Earned My MBA",
        "description": "Three years of night school while working full-time",
        "location": "Boston, MA",
        "lat": 42.3601,
        "lon": -71.0589,
        "cover": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&q=80",
        "days_ago": 44,
        "duration": 1,
    },
    {
        "title": "Patent Approval Celebration",
        "description": "My invention got approved - officially an inventor!",
        "location": "Mountain View, CA",
        "lat": 37.3861,
        "lon": -122.0839,
        "cover": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80",
        "days_ago": 58,
        "duration": 1,
    },

    # MORE TRAVEL (15 unique)
    {
        "title": "Backpacking Through Southeast Asia",
        "description": "Two months exploring Thailand, Vietnam, and Cambodia",
        "location": "Bangkok, Thailand",
        "lat": 13.7563,
        "lon": 100.5018,
        "cover": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1600&q=80",
        "days_ago": 150,
        "duration": 60,
    },
    {
        "title": "Exploring the Scottish Highlands",
        "description": "Castles, lochs, and endless green landscapes",
        "location": "Inverness, Scotland",
        "lat": 57.4778,
        "lon": -4.2247,
        "cover": "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1600&q=80",
        "days_ago": 105,
        "duration": 10,
    },
    {
        "title": "Australian Outback Adventure",
        "description": "Uluru at sunrise changed my perspective on everything",
        "location": "Uluru, Australia",
        "lat": -25.3444,
        "lon": 131.0369,
        "cover": "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=1600&q=80",
        "days_ago": 135,
        "duration": 12,
    },
    {
        "title": "Cruise Through the Greek Islands",
        "description": "Santorini sunsets and endless blue waters",
        "location": "Santorini, Greece",
        "lat": 36.3932,
        "lon": 25.4615,
        "cover": "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=1600&q=80",
        "days_ago": 115,
        "duration": 8,
    },
    {
        "title": "Morocco Sahara Desert Trek",
        "description": "Camel riding and camping under infinite stars",
        "location": "Marrakech, Morocco",
        "lat": 31.6295,
        "lon": -7.9811,
        "cover": "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=1600&q=80",
        "days_ago": 125,
        "duration": 7,
    },
    {
        "title": "Norwegian Fjords Road Trip",
        "description": "Dramatic landscapes at every turn",
        "location": "Bergen, Norway",
        "lat": 60.3913,
        "lon": 5.3221,
        "cover": "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1600&q=80",
        "days_ago": 98,
        "duration": 9,
    },
    {
        "title": "Costa Rica Rainforest Expedition",
        "description": "Zip-lining through the canopy and spotting sloths",
        "location": "Monteverde, Costa Rica",
        "lat": 10.3009,
        "lon": -84.8267,
        "cover": "https://images.unsplash.com/photo-1580541631950-7282082b53ce?w=1600&q=80",
        "days_ago": 88,
        "duration": 6,
    },
    {
        "title": "Ireland's Wild Atlantic Way",
        "description": "Coastal cliffs and traditional pub music",
        "location": "Galway, Ireland",
        "lat": 53.2707,
        "lon": -9.0568,
        "cover": "https://images.unsplash.com/photo-1518398046578-8cca57782e17?w=1600&q=80",
        "days_ago": 78,
        "duration": 11,
    },
    {
        "title": "Peru Machu Picchu Trek",
        "description": "Four-day Inca Trail to the ancient citadel",
        "location": "Cusco, Peru",
        "lat": -13.5319,
        "lon": -71.9675,
        "cover": "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1600&q=80",
        "days_ago": 140,
        "duration": 7,
    },
    {
        "title": "Canadian Rockies National Parks",
        "description": "Banff and Jasper exceeded all expectations",
        "location": "Banff, Canada",
        "lat": 51.1784,
        "lon": -115.5708,
        "cover": "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=1600&q=80",
        "days_ago": 68,
        "duration": 8,
    },
    {
        "title": "Portugal Porto Wine Tour",
        "description": "Tasting port wine and exploring historic cellars",
        "location": "Porto, Portugal",
        "lat": 41.1579,
        "lon": -8.6291,
        "cover": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1600&q=80",
        "days_ago": 72,
        "duration": 5,
    },
    {
        "title": "Jordan Petra Discovery",
        "description": "Walking through the ancient rose-red city",
        "location": "Petra, Jordan",
        "lat": 30.3285,
        "lon": 35.4444,
        "cover": "https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=1600&q=80",
        "days_ago": 145,
        "duration": 6,
    },
    {
        "title": "Swiss Alps Hiking Adventure",
        "description": "Mountain trails and alpine meadows in summer",
        "location": "Interlaken, Switzerland",
        "lat": 46.6863,
        "lon": 7.8632,
        "cover": "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1600&q=80",
        "days_ago": 82,
        "duration": 9,
    },
    {
        "title": "Vietnam Halong Bay Cruise",
        "description": "Sailing through limestone karsts and emerald waters",
        "location": "Halong Bay, Vietnam",
        "lat": 20.9101,
        "lon": 107.1839,
        "cover": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1600&q=80",
        "days_ago": 92,
        "duration": 3,
    },
    {
        "title": "Dubai Modern Marvels Tour",
        "description": "From desert safaris to the tallest building on Earth",
        "location": "Dubai, UAE",
        "lat": 25.2048,
        "lon": 55.2708,
        "cover": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80",
        "days_ago": 102,
        "duration": 5,
    },

    # MORE MILESTONES (10 unique)
    {
        "title": "Twins' High School Graduation",
        "description": "Double the pride watching them both graduate",
        "location": "Baltimore, MD",
        "lat": 39.2904,
        "lon": -76.6122,
        "cover": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&q=80",
        "days_ago": 62,
        "duration": 1,
    },
    {
        "title": "Mom's Retirement Party",
        "description": "40 years of teaching - celebrating an inspiring career",
        "location": "Detroit, MI",
        "lat": 42.3314,
        "lon": -83.0458,
        "cover": "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1600&q=80",
        "days_ago": 54,
        "duration": 1,
    },
    {
        "title": "Our Baby's First Steps",
        "description": "Oliver walked across the living room today!",
        "location": "Home",
        "lat": 37.7749,
        "lon": -122.4194,
        "cover": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=1600&q=80",
        "days_ago": 11,
        "duration": 1,
    },
    {
        "title": "Silver Anniversary Vow Renewal",
        "description": "25 years later, saying 'I do' all over again",
        "location": "Maui, HI",
        "lat": 20.7984,
        "lon": -156.3319,
        "cover": "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80",
        "days_ago": 24,
        "duration": 7,
    },
    {
        "title": "Dad Beats Cancer",
        "description": "Final treatment done - celebrating his strength!",
        "location": "Cleveland, OH",
        "lat": 41.4993,
        "lon": -81.6944,
        "cover": "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=1600&q=80",
        "days_ago": 17,
        "duration": 1,
    },
    {
        "title": "Paying Off Our Mortgage",
        "description": "30 years later - the house is finally ours!",
        "location": "Indianapolis, IN",
        "lat": 39.7684,
        "lon": -86.1581,
        "cover": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80",
        "days_ago": 9,
        "duration": 1,
    },
    {
        "title": "Daughter's Wedding Day",
        "description": "Watching her marry her best friend - pure joy",
        "location": "Charleston, SC",
        "lat": 32.7765,
        "lon": -79.9311,
        "cover": "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=80",
        "days_ago": 32,
        "duration": 2,
    },
    {
        "title": "Became U.S. Citizens",
        "description": "After 10 years, officially American citizens!",
        "location": "New York, NY",
        "lat": 40.7128,
        "lon": -74.0060,
        "cover": "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=1600&q=80",
        "days_ago": 46,
        "duration": 1,
    },
    {
        "title": "Adopted Our Son",
        "description": "Finalization day - our family is complete!",
        "location": "Sacramento, CA",
        "lat": 38.5816,
        "lon": -121.4944,
        "cover": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=1600&q=80",
        "days_ago": 76,
        "duration": 1,
    },
    {
        "title": "Grandpa Turns 100",
        "description": "A century of life, wisdom, and stories",
        "location": "Portland, OR",
        "lat": 45.5152,
        "lon": -122.6784,
        "cover": "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1600&q=80",
        "days_ago": 4,
        "duration": 1,
    },

    # MORE OUTDOOR ADVENTURES (10 unique)
    {
        "title": "Whitewater Rafting Colorado River",
        "description": "Class IV rapids and stunning canyon views",
        "location": "Moab, UT",
        "lat": 38.5733,
        "lon": -109.5498,
        "cover": "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=1600&q=80",
        "days_ago": 66,
        "duration": 2,
    },
    {
        "title": "Rock Climbing in Joshua Tree",
        "description": "Conquered my first 5.10 route!",
        "location": "Joshua Tree, CA",
        "lat": 33.8734,
        "lon": -115.9010,
        "cover": "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1600&q=80",
        "days_ago": 56,
        "duration": 3,
    },
    {
        "title": "Mountain Biking Moab Trails",
        "description": "Slickrock trail was worth the bruises!",
        "location": "Moab, UT",
        "lat": 38.5733,
        "lon": -109.5498,
        "cover": "https://images.unsplash.com/photo-1544191696-102dbdaeeaa0?w=1600&q=80",
        "days_ago": 86,
        "duration": 4,
    },
    {
        "title": "Appalachian Trail Section Hike",
        "description": "Completed 100 miles through Virginia",
        "location": "Shenandoah, VA",
        "lat": 38.5325,
        "lon": -78.3927,
        "cover": "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1600&q=80",
        "days_ago": 96,
        "duration": 7,
    },
    {
        "title": "Scuba Diving Great Barrier Reef",
        "description": "Swimming with sea turtles and colorful coral",
        "location": "Cairns, Australia",
        "lat": -16.9203,
        "lon": 145.7710,
        "cover": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1600&q=80",
        "days_ago": 130,
        "duration": 5,
    },
    {
        "title": "Surfing Lessons in Hawaii",
        "description": "Finally stood up on a wave - hooked for life!",
        "location": "Oahu, HI",
        "lat": 21.4389,
        "lon": -158.0001,
        "cover": "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=1600&q=80",
        "days_ago": 106,
        "duration": 10,
    },
    {
        "title": "Paragliding Over the Alps",
        "description": "Soaring like a bird - unforgettable experience",
        "location": "Chamonix, France",
        "lat": 45.9237,
        "lon": 6.8694,
        "cover": "https://images.unsplash.com/photo-1504851149312-7a075b496cc7?w=1600&q=80",
        "days_ago": 116,
        "duration": 1,
    },
    {
        "title": "Fishing Trip in Alaska",
        "description": "Caught salmon and saw grizzly bears!",
        "location": "Juneau, AK",
        "lat": 58.3019,
        "lon": -134.4197,
        "cover": "https://images.unsplash.com/photo-1445126424502-06f01a951dd4?w=1600&q=80",
        "days_ago": 126,
        "duration": 6,
    },
    {
        "title": "Zip-lining Jungle Canopy Tour",
        "description": "Flying through the trees at 40 mph!",
        "location": "Arenal, Costa Rica",
        "lat": 10.4619,
        "lon": -84.7033,
        "cover": "https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?w=1600&q=80",
        "days_ago": 83,
        "duration": 1,
    },
    {
        "title": "Horseback Riding in Montana",
        "description": "Week-long ranch vacation in Big Sky Country",
        "location": "Bozeman, MT",
        "lat": 45.6770,
        "lon": -111.0429,
        "cover": "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1600&q=80",
        "days_ago": 108,
        "duration": 7,
    },

    # MORE HOME & LIFESTYLE (10 unique)
    {
        "title": "Solar Panel Installation",
        "description": "Going green - cut our power bill by 80%!",
        "location": "Phoenix, AZ",
        "lat": 33.4484,
        "lon": -112.0740,
        "cover": "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1600&q=80",
        "days_ago": 67,
        "duration": 3,
    },
    {
        "title": "Built a Backyard Treehouse",
        "description": "Dad and kids project - took all summer!",
        "location": "Raleigh, NC",
        "lat": 35.7796,
        "lon": -78.6382,
        "cover": "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=1600&q=80",
        "days_ago": 37,
        "duration": 90,
    },
    {
        "title": "Decluttered and Organized",
        "description": "Marie Kondo'd the entire house - feels amazing!",
        "location": "Home",
        "lat": 40.7128,
        "lon": -74.0060,
        "cover": "https://images.unsplash.com/photo-1617104551722-3b2ccbdfe235?w=1600&q=80",
        "days_ago": 19,
        "duration": 14,
    },
    {
        "title": "Planted an Orchard",
        "description": "15 fruit trees - apples, pears, and cherries",
        "location": "Eugene, OR",
        "lat": 44.0521,
        "lon": -123.0868,
        "cover": "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1600&q=80",
        "days_ago": 155,
        "duration": 5,
    },
    {
        "title": "Custom Built-In Bookshelves",
        "description": "Floor-to-ceiling library of my dreams",
        "location": "Madison, WI",
        "lat": 43.0731,
        "lon": -89.4012,
        "cover": "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1600&q=80",
        "days_ago": 27,
        "duration": 21,
    },
    {
        "title": "Outdoor Fire Pit Build",
        "description": "Perfect gathering spot for family nights",
        "location": "Boise, ID",
        "lat": 43.6150,
        "lon": -116.2023,
        "cover": "https://images.unsplash.com/photo-1564489563601-c53cfc451e93?w=1600&q=80",
        "days_ago": 41,
        "duration": 7,
    },
    {
        "title": "Garage Woodshop Setup",
        "description": "Built my dream workshop space",
        "location": "Columbus, OH",
        "lat": 39.9612,
        "lon": -82.9988,
        "cover": "https://images.unsplash.com/photo-1566140967404-b8b3932483f5?w=1600&q=80",
        "days_ago": 51,
        "duration": 14,
    },
    {
        "title": "Koi Pond Construction",
        "description": "Added a peaceful water feature to backyard",
        "location": "Charlotte, NC",
        "lat": 35.2271,
        "lon": -80.8431,
        "cover": "https://images.unsplash.com/photo-1568864277728-82334c0d68ed?w=1600&q=80",
        "days_ago": 71,
        "duration": 28,
    },
    {
        "title": "Master Bedroom Makeover",
        "description": "Created a serene retreat sanctuary",
        "location": "Tampa, FL",
        "lat": 27.9506,
        "lon": -82.4572,
        "cover": "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1600&q=80",
        "days_ago": 13,
        "duration": 10,
    },
    {
        "title": "Smart Home Automation",
        "description": "Fully automated lights, locks, and climate",
        "location": "San Antonio, TX",
        "lat": 29.4241,
        "lon": -98.4936,
        "cover": "https://images.unsplash.com/photo-1558089687-f282bdc01f6e?w=1600&q=80",
        "days_ago": 3,
        "duration": 5,
    },

    # FINAL 5 (to reach 100)
    {
        "title": "Volunteered at Animal Shelter",
        "description": "Started weekly volunteer program helping rescue animals",
        "location": "Richmond, VA",
        "lat": 37.5407,
        "lon": -77.4360,
        "cover": "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1600&q=80",
        "days_ago": 21,
        "duration": 1,
    },
    {
        "title": "Built Custom Gaming PC",
        "description": "Researched and assembled my dream gaming rig",
        "location": "Home",
        "lat": 40.7128,
        "lon": -74.0060,
        "cover": "https://images.unsplash.com/photo-1591238372408-a079e5a0c93c?w=1600&q=80",
        "days_ago": 29,
        "duration": 2,
    },
    {
        "title": "Completed Half Marathon",
        "description": "First race ever - 13.1 miles done!",
        "location": "Chicago, IL",
        "lat": 41.8781,
        "lon": -87.6298,
        "cover": "https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?w=1600&q=80",
        "days_ago": 36,
        "duration": 1,
    },
    {
        "title": "Stargazing at Dark Sky Park",
        "description": "Saw the Milky Way for the first time - breathtaking!",
        "location": "Big Bend, TX",
        "lat": 29.2500,
        "lon": -103.2500,
        "cover": "https://images.unsplash.com/photo-1464802686167-b939a6910659?w=1600&q=80",
        "days_ago": 47,
        "duration": 2,
    },
    {
        "title": "Learned to Knit",
        "description": "Made my first scarf after 6 weeks of practice",
        "location": "Home",
        "lat": 37.7749,
        "lon": -122.4194,
        "cover": "https://images.unsplash.com/photo-1492288991661-058aa541ff43?w=1600&q=80",
        "days_ago": 53,
        "duration": 42,
    },
    {
        "title": "Weekend Wine Tasting Tour",
        "description": "Explored 6 wineries in wine country with friends",
        "location": "Sonoma, CA",
        "lat": 38.2919,
        "lon": -122.4580,
        "cover": "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1600&q=80",
        "days_ago": 64,
        "duration": 2,
    },
    {
        "title": "Beach Bonfire with Family",
        "description": "Sunset bonfire with s'mores and storytelling",
        "location": "Malibu, CA",
        "lat": 34.0259,
        "lon": -118.7798,
        "cover": "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1600&q=80",
        "days_ago": 15,
        "duration": 1,
    },
    {
        "title": "Attended Music Festival",
        "description": "Three days of amazing live music and camping",
        "location": "Indio, CA",
        "lat": 33.7206,
        "lon": -116.2156,
        "cover": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1600&q=80",
        "days_ago": 87,
        "duration": 3,
    },
    {
        "title": "Learned to Paddleboard",
        "description": "Finally got my balance - no more falling in!",
        "location": "Lake Tahoe, CA",
        "lat": 39.0968,
        "lon": -120.0324,
        "cover": "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1600&q=80",
        "days_ago": 63,
        "duration": 4,
    },
    {
        "title": "Volunteered Teaching Coding",
        "description": "Started teaching basic coding to local middle schoolers",
        "location": "Oakland, CA",
        "lat": 37.8044,
        "lon": -122.2712,
        "cover": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&q=80",
        "days_ago": 39,
        "duration": 1,
    },
]

print("=" * 80)
print("DIVERSE SEED DATA GENERATOR")
print(f"Creating 20 users and 100 UNIQUE events")
print("=" * 80)

def register_users():
    """Register all users and return their tokens"""
    print("\n[1/4] Registering users...")
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
    """Create 100 diverse events - 5 per user, NO DUPLICATES"""
    print("\n[2/4] Creating 100 unique events...")

    events_created = []
    usernames = list(user_tokens.keys())
    events_per_user = 5

    # Shuffle templates to ensure variety
    shuffled_templates = EVENT_TEMPLATES.copy()
    random.shuffle(shuffled_templates)

    # Create 5 events per user
    for i, username in enumerate(usernames):
        token = user_tokens[username]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        for j in range(events_per_user):
            # Pick unique template for each event (no modulo - linear assignment)
            template_idx = i * events_per_user + j
            template = shuffled_templates[template_idx].copy()

            # Customize dates with more variation
            days_offset = template["days_ago"] - (random.randint(0, 30))
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
            }

            try:
                res = requests.post(f"{BASE_URL}/events", json=event_payload, headers=headers)
                if res.status_code == 201:
                    event_data = res.json()
                    events_created.append(event_data)
                    print(f"  ✓ Created '{template['title']}' by {username}")
                else:
                    print(f"  ✗ Failed to create event for {username}: {res.text}")
            except Exception as e:
                print(f"  ✗ Error creating event for {username}: {e}")

    return events_created

def add_comments(events, user_tokens):
    """Add diverse comments to events"""
    print("\n[3/4] Adding comments to events...")

    comment_templates = [
        "This looks amazing! Thanks for sharing!",
        "Wow, I'm so jealous! Wish I could have been there.",
        "Beautiful photos - you really captured the moment.",
        "This is going in my bucket list!",
        "So happy for you! Well deserved!",
        "What an incredible experience!",
        "The photos don't do it justice - it was even better in person!",
        "Can't wait to try this myself!",
        "You inspire me!",
        "This made my day!",
        "Absolutely stunning!",
        "I remember when we talked about this - so glad you did it!",
        "Goals! How did you plan this?",
        "This is the content I'm here for!",
        "Adding this to my travel list!",
    ]

    comments_added = 0
    usernames = list(user_tokens.keys())

    for event in events:
        # Random number of comments per event (2-5)
        num_comments = random.randint(2, 5)

        for _ in range(num_comments):
            commenter = random.choice(usernames)
            token = user_tokens[commenter]["token"]
            headers = {"Authorization": f"Bearer {token}"}

            comment_text = random.choice(comment_templates)

            try:
                res = requests.post(
                    f"{BASE_URL}/events/{event['id']}/comments",
                    params={"content": comment_text},
                    headers=headers
                )
                if res.status_code == 200:
                    comments_added += 1
            except Exception as e:
                pass

    print(f"  ✓ Added {comments_added} comments")

def add_likes(events, user_tokens):
    """Add likes to events"""
    print("\n[4/4] Adding likes to events...")

    likes_added = 0
    usernames = list(user_tokens.keys())

    for event in events:
        # Random number of likes per event (3-10)
        num_likes = random.randint(3, 10)

        # Select random users to like this event
        likers = random.sample(usernames, min(num_likes, len(usernames)))

        for liker in likers:
            token = user_tokens[liker]["token"]
            headers = {"Authorization": f"Bearer {token}"}

            try:
                res = requests.post(
                    f"{BASE_URL}/events/{event['id']}/like",
                    headers=headers
                )
                if res.status_code == 200:
                    likes_added += 1
            except Exception as e:
                pass

    print(f"  ✓ Added {likes_added} likes")

def main():
    # Step 1: Register users
    user_tokens = register_users()

    if len(user_tokens) < 20:
        print(f"\n⚠️  Only {len(user_tokens)} users registered. Continuing anyway...")

    # Step 2: Create events
    events = create_events(user_tokens)

    if len(events) == 0:
        print("\n❌ No events created! Exiting...")
        return

    # Step 3: Add comments
    add_comments(events, user_tokens)

    # Step 4: Add likes
    add_likes(events, user_tokens)

    print("\n" + "=" * 80)
    print(f"✅ SUCCESS! Created:")
    print(f"   - {len(user_tokens)} users")
    print(f"   - {len(events)} unique events (NO duplicates!)")
    print(f"   - Comments and likes added")
    print("=" * 80)

if __name__ == "__main__":
    main()
