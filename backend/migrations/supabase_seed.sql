-- Supabase Seed Data for Our Family Socials MVP
-- This creates minimal test data to verify the migration works

-- Clear existing data (if re-running)
DELETE FROM follows;
DELETE FROM likes;
DELETE FROM comments;
DELETE FROM event_locations;
DELETE FROM content_blocks;
DELETE FROM events;
DELETE FROM users;

-- Reset sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE events_id_seq RESTART WITH 1;
ALTER SEQUENCE comments_id_seq RESTART WITH 1;
ALTER SEQUENCE likes_id_seq RESTART WITH 1;
ALTER SEQUENCE follows_id_seq RESTART WITH 1;
ALTER SEQUENCE event_locations_id_seq RESTART WITH 1;
ALTER SEQUENCE content_blocks_id_seq RESTART WITH 1;

-- Insert 3 demo users with different subscription tiers
-- Password for all users: "password123" (hashed with bcrypt)
INSERT INTO users (email, username, full_name, hashed_password, avatar_url, bio, subscription_tier, is_active) VALUES
('sarah@example.com', 'sarahw', 'Sarah Wilson', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEg9KK', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', 'Family photographer and travel enthusiast 📸', 'free', true),
('tom@example.com', 'tomw', 'Tom Wilson', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEg9KK', 'https://api.dicebear.com/7.x/avataaars/svg?seed=tom', 'Adventure seeker and dad of two 🏔️', 'premium', true),
('emma@example.com', 'emmaw', 'Emma Wilson', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEg9KK', 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma', 'Creating memories with my amazing family ❤️', 'family', true);

-- Insert 9 events across the 3 users
INSERT INTO events (title, description, summary, start_date, end_date, location, latitude, longitude, cover_image_url, author_id, is_published, is_deleted, has_multiple_locations) VALUES

-- Sarah's events (Free tier - 3 events)
('Summer Beach Vacation 2024', '<p>We spent an amazing week at the beach! The kids loved building sandcastles and swimming in the ocean.</p><p>Highlights included:</p><ul><li>Daily sunrise walks on the beach</li><li>Fresh seafood dinners</li><li>Beach bonfires under the stars</li></ul>', 'A week of sun, sand, and family fun at the beach', '2024-07-15 10:00:00', '2024-07-22 16:00:00', 'Myrtle Beach, SC', 33.6891, -78.8867, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', 1, true, false, false),

('Emma''s 5th Birthday Party', '<p>Emma turned 5! We threw a princess-themed birthday party in our backyard.</p><p>The party featured:</p><ul><li>Face painting station</li><li>Princess dress-up corner</li><li>Homemade castle cake</li><li>Treasure hunt game</li></ul>', 'Magical princess party for our little girl', '2024-09-10 14:00:00', '2024-09-10 18:00:00', 'Oklahoma City, OK', 35.4676, -97.5164, 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800', 1, true, false, false),

('Family Hiking Trip - Arbuckle Mountains', '<p>Perfect fall weekend hiking in the Arbuckle Mountains. The weather was beautiful and the fall colors were stunning!</p>', 'Weekend hiking adventure in Oklahoma', '2024-10-05 08:00:00', '2024-10-06 17:00:00', 'Turner Falls Park, OK', 34.4130, -97.0450, 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800', 1, true, false, false),

-- Tom's events (Premium tier - 3 events)
('Road Trip Across Route 66', '<p>Epic 10-day road trip along historic Route 66! Started in Chicago and ended in Santa Monica.</p><p>We visited amazing landmarks and ate at classic diners along the way.</p>', 'The ultimate American road trip experience', '2024-06-01 07:00:00', '2024-06-10 20:00:00', 'Route 66, USA', 35.2220, -97.4395, 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800', 2, true, false, true),

('First Day of School 2024', '<p>Both kids started at their new school today! Emma is in kindergarten and Jake is in 2nd grade.</p><p>They were so excited (and a little nervous) 🎒📚</p>', 'Big milestone - kids starting new school year', '2024-08-19 08:00:00', '2024-08-19 15:00:00', 'Lincoln Elementary, Oklahoma City', 35.5183, -97.5164, 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', 2, true, false, false),

('Weekend Camping at Lake Thunderbird', '<p>Great camping weekend! We went fishing, roasted marshmallows, and told ghost stories by the campfire.</p>', 'Family camping adventure at the lake', '2024-08-25 16:00:00', '2024-08-27 12:00:00', 'Lake Thunderbird State Park, OK', 35.2226, -97.2089, 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800', 2, true, false, false),

-- Emma's events (Family tier - 3 events)
('Thanksgiving Dinner 2024', '<p>Hosted the entire family for Thanksgiving this year! 18 people around our table 🦃</p><p>Menu highlights:</p><ul><li>Herb-roasted turkey</li><li>Grandma''s famous stuffing</li><li>Homemade pumpkin pie</li><li>Cranberry sauce from scratch</li></ul>', 'Family gathering for Thanksgiving celebration', '2024-11-28 12:00:00', '2024-11-28 20:00:00', 'Oklahoma City, OK', 35.4676, -97.5164, 'https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?w=800', 3, true, false, false),

('Christmas Light Tour 2024', '<p>Our annual tradition of driving around to see Christmas lights! The kids picked out the best decorated houses.</p>', 'Magical evening viewing holiday lights', '2024-12-20 18:00:00', '2024-12-20 21:00:00', 'Nichols Hills, Oklahoma City', 35.5490, -97.5450, 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800', 3, true, false, false),

('New Year''s Eve Celebration', '<p>Rang in 2025 with close friends and family! We had a countdown party with the kids and stayed up till midnight 🎉</p>', 'Celebrating the new year with loved ones', '2024-12-31 19:00:00', '2025-01-01 01:00:00', 'Oklahoma City, OK', 35.4676, -97.5164, 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800', 3, true, false, false);

-- Insert event locations for the multi-location event (Route 66 trip)
INSERT INTO event_locations (event_id, location_name, latitude, longitude, location_type, order_index) VALUES
(4, 'Chicago Start Point', 41.8781, -87.6298, 'manual', 0),
(4, 'St. Louis Gateway Arch', 38.6247, -90.1848, 'manual', 1),
(4, 'Oklahoma City', 35.4676, -97.5164, 'manual', 2),
(4, 'Amarillo Big Texan', 35.1960, -101.8313, 'manual', 3),
(4, 'Grand Canyon', 36.0544, -112.1401, 'manual', 4),
(4, 'Santa Monica Pier', 34.0095, -118.4977, 'manual', 5);

-- Insert follow relationships
INSERT INTO follows (follower_id, following_id, status) VALUES
(1, 2, 'accepted'),  -- Sarah follows Tom
(1, 3, 'accepted'),  -- Sarah follows Emma
(2, 1, 'accepted'),  -- Tom follows Sarah
(2, 3, 'accepted'),  -- Tom follows Emma
(3, 1, 'accepted'),  -- Emma follows Sarah
(3, 2, 'accepted');  -- Emma follows Tom

-- Insert comments
INSERT INTO comments (event_id, author_id, content) VALUES
(1, 2, 'This looks amazing! We need to plan a beach trip soon.'),
(1, 3, 'The kids had such a great time! Let''s go back next summer.'),
(2, 2, 'Emma had the best time at her party! Thanks for organizing everything! 🎉'),
(2, 3, 'She''s still talking about it every day! Perfect party.'),
(4, 1, 'What an epic adventure! The photos are incredible.'),
(4, 3, 'Route 66 has been on my bucket list forever!'),
(7, 1, 'Thanksgiving at your place was wonderful! Thanks for hosting!'),
(7, 2, 'The turkey was perfectly cooked this year! 🦃');

-- Insert likes
INSERT INTO likes (event_id, user_id) VALUES
(1, 2),  -- Tom likes Sarah's beach vacation
(1, 3),  -- Emma likes Sarah's beach vacation
(2, 2),  -- Tom likes Emma's birthday
(2, 3),  -- Emma likes her own birthday event
(3, 2),  -- Tom likes Sarah's hiking trip
(4, 1),  -- Sarah likes Tom's Route 66 trip
(4, 3),  -- Emma likes Tom's Route 66 trip
(5, 1),  -- Sarah likes first day of school
(5, 3),  -- Emma likes first day of school
(6, 1),  -- Sarah likes camping trip
(7, 1),  -- Sarah likes Thanksgiving
(7, 2),  -- Tom likes Thanksgiving
(8, 1),  -- Sarah likes Christmas lights
(8, 2),  -- Tom likes Christmas lights
(9, 1),  -- Sarah likes New Year's
(9, 2);  -- Tom likes New Year's

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Seed data inserted successfully!';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - 3 demo users (sarahw: free, tomw: premium, emmaw: family)';
    RAISE NOTICE '  - 9 events across all users';
    RAISE NOTICE '  - 6 event locations for Route 66 trip';
    RAISE NOTICE '  - 6 follow relationships';
    RAISE NOTICE '  - 8 comments';
    RAISE NOTICE '  - 16 likes';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Login credentials:';
    RAISE NOTICE '  All users: password123';
    RAISE NOTICE '  Emails: sarah@example.com, tom@example.com, emma@example.com';
END $$;
