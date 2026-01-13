from logging.config import fileConfig

from sqlalchemy import create_engine
from sqlalchemy import pool

from alembic import context

# Import our app's settings and models
import sys
from pathlib import Path

# Add the backend directory to the path so we can import app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings
from app.core.database import Base

# Import all models to ensure they're registered with Base.metadata
from app.models import (
    User, Event, ContentBlock, Comment, Like, EventLocation,
    EventImage, ShareToken, Follow, InvitedViewer, ViewerNotificationLog,
    MediaLike, MediaComment, TagProfile, EventTag, TagProfileClaim,
    UserRelationship, UserMute
)
# Import models not exported from __init__.py
from app.models.custom_group import CustomGroup, CustomGroupMember
from app.models.tag_profile_relationship import TagProfileRelationship
from app.models.tag_profile_relationship_request import TagProfileRelationshipRequest

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Get database URL from settings (bypass config to avoid % interpolation issues)
database_url = settings.DATABASE_URL

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target_metadata to our models' metadata for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Create engine directly from settings URL instead of using config
    # This avoids issues with special characters in passwords
    connectable = create_engine(
        database_url,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
