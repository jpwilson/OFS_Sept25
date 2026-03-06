"""
Seed script for demo account data.
Creates demo user, showcase events, follow relationships, and sample content.
Idempotent - safe to re-run.

Usage:
    cd backend
    python scripts/seed_demo_data.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.security import get_password_hash
# Import all models to resolve SQLAlchemy relationships
from app.models import (
    User, Event, Follow, Comment, ContentBlock, EventImage, EventLocation
)

# Connect to database
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

DEMO_EMAIL = "demo@ourfamilysocials.com"
DEMO_USERNAME = "demo-investor"
DEMO_PASSWORD = "March2026"

# Unsplash photos for showcase events
GREEK_PHOTOS = [
    "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=1200",  # Santorini blue domes
    "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200",  # Santorini sunset
    "https://images.unsplash.com/photo-1555993539-1732b0258235?w=1200",  # Greek harbor boats
    "https://images.unsplash.com/photo-1601581875039-e899893d520c?w=1200",  # Mykonos windmills
    "https://images.unsplash.com/photo-1504512485720-7d83a16ee930?w=1200",  # Beach turquoise water
]

BIRTHDAY_PHOTOS = [
    "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200",  # Birthday cake candles
    "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200",  # Party celebration
    "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200",  # Confetti celebration
    "https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=1200",  # Family dinner table
    "https://images.unsplash.com/photo-1602631985686-1bb0e6a8696e?w=1200",  # Gift giving
]

try:
    # --- Step 1: Create or find demo user ---
    demo_user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if not demo_user:
        demo_user = User(
            email=DEMO_EMAIL,
            username=DEMO_USERNAME,
            display_name="Demo Investor",
            hashed_password=get_password_hash(DEMO_PASSWORD),
            is_demo_account=True,
            is_active=True,
            subscription_tier="family",
            subscription_status="active",
            theme_preference="dark",
        )
        db.add(demo_user)
        db.flush()
        print(f"Created demo user: {demo_user.username} (id={demo_user.id})")
    else:
        # Ensure flags are correct
        demo_user.is_demo_account = True
        demo_user.subscription_tier = "family"
        demo_user.subscription_status = "active"
        demo_user.hashed_password = get_password_hash(DEMO_PASSWORD)
        db.flush()
        print(f"Demo user already exists: {demo_user.username} (id={demo_user.id})")

    # --- Step 2: Find admin/superuser to own showcase events ---
    admin_user = db.query(User).filter(User.is_superuser == True).first()
    if not admin_user:
        print("ERROR: No superuser found. Create a superuser first.")
        sys.exit(1)
    print(f"Using admin user: {admin_user.username} (id={admin_user.id})")

    # --- Step 3: Create follow from demo -> admin (idempotent) ---
    existing_follow = db.query(Follow).filter(
        Follow.follower_id == demo_user.id,
        Follow.following_id == admin_user.id
    ).first()
    if not existing_follow:
        follow = Follow(
            follower_id=demo_user.id,
            following_id=admin_user.id,
            status="accepted",
            is_close_family=False,
        )
        db.add(follow)
        print("Created follow: demo -> admin (accepted)")
    else:
        existing_follow.status = "accepted"
        print("Follow already exists: demo -> admin")

    # --- Step 4: Create showcase events ---
    def create_event_if_not_exists(title, **kwargs):
        existing = db.query(Event).filter(
            Event.title == title,
            Event.author_id == admin_user.id
        ).first()
        if existing:
            print(f"Event already exists: '{title}' (id={existing.id})")
            return existing, False
        event = Event(title=title, author_id=admin_user.id, **kwargs)
        db.add(event)
        db.flush()
        print(f"Created event: '{title}' (id={event.id})")
        return event, True

    # Event 1: Greek Island Hopping
    greek_event, greek_created = create_event_if_not_exists(
        title="Greek Island Hopping — Santorini to Mykonos",
        slug="greek-island-hopping-santorini-mykonos",
        summary="Two weeks sailing the Cyclades with the family. Sunsets, blue domes, and the best food of our lives.",
        description="""<h2>The Trip of a Lifetime</h2>
<p>We'd been planning this trip for over a year, and it exceeded every expectation. Starting in Santorini and ending in Mykonos, we spent two incredible weeks island-hopping through the Cyclades with the whole family.</p>

<h3>Santorini — Days 1-5</h3>
<p>We arrived in Fira just as the sun was setting over the caldera. The kids couldn't stop pointing at the blue-domed churches cascading down the cliff face. Our villa in Oia had a private terrace overlooking the sea, and every evening we'd gather there to watch the sunset paint the sky in impossible shades of pink and gold.</p>
<p>The highlight was a catamaran cruise around the volcanic islands. We swam in natural hot springs, snorkeled in crystal-clear coves, and had a barbecue lunch on the boat while dolphins played off the bow.</p>

<h3>Naxos — Days 6-9</h3>
<p>Naxos was our hidden gem. Less touristy than Santorini, with incredible beaches and the most welcoming locals. The kids spent hours exploring the Portara — the massive marble doorway of an unfinished Temple of Apollo that frames the most spectacular sunset view.</p>
<p>We rented ATVs and drove into the mountains, discovering tiny villages where grandmothers insisted on feeding us homemade cheese and fresh figs. The mountain roads were an adventure in themselves.</p>

<h3>Mykonos — Days 10-14</h3>
<p>We ended our trip in Mykonos, where the famous windmills and Little Venice provided the perfect backdrop for our final family photos. The beaches were stunning — Paradise Beach lived up to its name.</p>
<p>Our last dinner was at a tiny taverna in the old town, where the owner's grandmother cooked us a five-course meal of recipes passed down through generations. We left with full hearts and a promise to return.</p>""",
        start_date=datetime(2025, 7, 12),
        end_date=datetime(2025, 7, 26),
        location_name="Santorini, Greece",
        latitude=36.3932,
        longitude=25.4615,
        cover_image_url=GREEK_PHOTOS[0],
        has_multiple_locations=True,
        is_published=True,
        privacy_level="followers",
        category="Vacation",
    )

    if greek_created:
        # Add content blocks
        greek_blocks = [
            ContentBlock(event_id=greek_event.id, content_type="text", content="<h2>The Trip of a Lifetime</h2><p>We'd been planning this trip for over a year, and it exceeded every expectation.</p>", order_index=0),
            ContentBlock(event_id=greek_event.id, content_type="image", content=GREEK_PHOTOS[1], order_index=1),
            ContentBlock(event_id=greek_event.id, content_type="text", content="<h3>Santorini Sunsets</h3><p>Every evening we'd gather on our terrace to watch the sunset paint the sky in impossible shades of pink and gold.</p>", order_index=2),
            ContentBlock(event_id=greek_event.id, content_type="image", content=GREEK_PHOTOS[2], order_index=3),
            ContentBlock(event_id=greek_event.id, content_type="text", content="<h3>Harbor Life</h3><p>The harbors were alive with color — fishing boats, tavernas, and the smell of fresh grilled octopus.</p>", order_index=4),
            ContentBlock(event_id=greek_event.id, content_type="image", content=GREEK_PHOTOS[3], order_index=5),
            ContentBlock(event_id=greek_event.id, content_type="image", content=GREEK_PHOTOS[4], order_index=6),
        ]
        db.add_all(greek_blocks)

        # Add images
        for i, url in enumerate(GREEK_PHOTOS):
            db.add(EventImage(event_id=greek_event.id, image_url=url, order_index=i))

        # Add locations
        greek_locations = [
            EventLocation(event_id=greek_event.id, location_name="Santorini, Greece", latitude=36.3932, longitude=25.4615, location_type="manual", order_index=0),
            EventLocation(event_id=greek_event.id, location_name="Naxos, Greece", latitude=37.1036, longitude=25.3762, location_type="manual", order_index=1),
            EventLocation(event_id=greek_event.id, location_name="Mykonos, Greece", latitude=37.4467, longitude=25.3289, location_type="manual", order_index=2),
        ]
        db.add_all(greek_locations)

        # Add comments from admin
        greek_comments = [
            Comment(event_id=greek_event.id, author_id=admin_user.id, content="The sunset photos from Oia are absolutely breathtaking! Best vacation we've ever taken."),
            Comment(event_id=greek_event.id, author_id=admin_user.id, content="That little taverna in Mykonos... I still dream about the moussaka. We need to go back!"),
        ]
        db.add_all(greek_comments)

    # Event 2: Grandma's 80th Birthday
    bday_event, bday_created = create_event_if_not_exists(
        title="Grandma's 80th Birthday Celebration",
        slug="grandmas-80th-birthday-celebration",
        summary="Three generations came together to celebrate Grandma's 80th. Tears, laughter, and her famous chocolate cake.",
        description="""<h2>80 Years of Love</h2>
<p>When we started planning Grandma's 80th birthday, we knew we wanted it to be special. What we didn't expect was just how magical it would turn out to be. Three generations, 47 family members, all gathered in one place for the first time in years.</p>

<h3>The Secret Plan</h3>
<p>For three months, we coordinated behind Grandma's back. Aunts flying in from Seattle, cousins driving up from San Diego, even Uncle Robert came from London. The group chat had 32 people in it, and somehow nobody spilled the beans.</p>
<p>We booked the garden room at the restaurant where Grandma and Grandpa had their first date — a detail we only discovered when going through old photo albums for the slideshow.</p>

<h3>The Big Reveal</h3>
<p>The look on her face when she walked in and saw everyone... I've never seen someone go from confused to crying tears of joy so fast. She spent the first twenty minutes just going from person to person, holding their faces in her hands the way she always does, saying "I can't believe you're here."</p>

<h3>The Cake</h3>
<p>We commissioned a five-tier cake decorated with photos from each decade of her life, printed on edible paper. But the real star was Grandma's own chocolate cake recipe, which three of her granddaughters had secretly learned to bake. When we brought it out, she just shook her head and laughed: "Nobody makes it like me, but you girls came close."</p>

<h3>The Speech</h3>
<p>Grandma's speech was only four minutes long, but there wasn't a dry eye in the room. She talked about how family isn't about blood — it's about showing up. "You all showed up today," she said. "That's all I ever wanted."</p>""",
        start_date=datetime(2025, 9, 14),
        end_date=datetime(2025, 9, 14),
        location_name="The Garden Room, San Francisco",
        latitude=37.7749,
        longitude=-122.4194,
        cover_image_url=BIRTHDAY_PHOTOS[0],
        has_multiple_locations=False,
        is_published=True,
        privacy_level="followers",
        category="Birthday",
    )

    if bday_created:
        # Add content blocks
        bday_blocks = [
            ContentBlock(event_id=bday_event.id, content_type="text", content="<h2>80 Years of Love</h2><p>Three generations, 47 family members, all gathered in one place for the first time in years.</p>", order_index=0),
            ContentBlock(event_id=bday_event.id, content_type="image", content=BIRTHDAY_PHOTOS[1], order_index=1),
            ContentBlock(event_id=bday_event.id, content_type="text", content="<h3>The Big Reveal</h3><p>The look on her face when she walked in and saw everyone... tears of pure joy.</p>", order_index=2),
            ContentBlock(event_id=bday_event.id, content_type="image", content=BIRTHDAY_PHOTOS[2], order_index=3),
            ContentBlock(event_id=bday_event.id, content_type="text", content="<h3>The Cake</h3><p>Five tiers decorated with photos from each decade of her life, plus her own famous chocolate cake recipe.</p>", order_index=4),
            ContentBlock(event_id=bday_event.id, content_type="image", content=BIRTHDAY_PHOTOS[3], order_index=5),
            ContentBlock(event_id=bday_event.id, content_type="image", content=BIRTHDAY_PHOTOS[4], order_index=6),
        ]
        db.add_all(bday_blocks)

        # Add images
        for i, url in enumerate(BIRTHDAY_PHOTOS):
            db.add(EventImage(event_id=bday_event.id, image_url=url, order_index=i))

        # Add location
        db.add(EventLocation(
            event_id=bday_event.id,
            location_name="The Garden Room, San Francisco",
            latitude=37.7749,
            longitude=-122.4194,
            location_type="manual",
            order_index=0,
        ))

        # Add comments from admin
        bday_comments = [
            Comment(event_id=bday_event.id, author_id=admin_user.id, content="That speech at the end had everyone in tears. Grandma really knows how to make a moment."),
            Comment(event_id=bday_event.id, author_id=admin_user.id, content="The five-tier cake with photos from each decade was such a brilliant idea. Already planning what to do for her 85th!"),
        ]
        db.add_all(bday_comments)

    # Mark showcase events
    greek_event.is_demo_showcase = True
    bday_event.is_demo_showcase = True

    db.commit()

    # Print summary
    print("\n--- Demo Data Summary ---")
    print(f"Demo user: {demo_user.username} (id={demo_user.id})")
    print(f"Demo password: {DEMO_PASSWORD}")
    print(f"Event 1: '{greek_event.title}' (id={greek_event.id}, is_demo_showcase=True)")
    print(f"Event 2: '{bday_event.title}' (id={bday_event.id}, is_demo_showcase=True)")
    print("Done!")

except Exception as e:
    db.rollback()
    print(f"ERROR: {e}")
    raise
finally:
    db.close()
