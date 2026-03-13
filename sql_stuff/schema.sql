-- Ensure the pgcrypto extension is enabled for gen_random_uuid()
-- Connect to your database and run this command once if needed:
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL, -- Store hashed passwords, NOT plain text
    skill_level VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: groups
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    description TEXT,
    visibility VARCHAR NOT NULL CHECK (visibility IN ('public', 'private')),
    invite_code VARCHAR UNIQUE, -- Nullable, only populated for private groups
    creator_id UUID NOT NULL REFERENCES users(id), -- Still track original creator
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: group_memberships (UPDATED with role)
CREATE TABLE group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    -- NEW: Role within the group
    role VARCHAR NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, group_id) -- Ensure a user can only join a group once
);

-- Table: events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    -- Changed creator_id to REFERENCES users(id) but logic will enforce it's a group admin
    creator_id UUID NOT NULL REFERENCES users(id), -- User who created the event (must be an admin)
    name VARCHAR NOT NULL,
    date_time TIMESTAMPTZ NOT NULL,
    location VARCHAR,
    court_details VARCHAR,
    suggested_cost NUMERIC(10, 2),
    max_players INTEGER NOT NULL CHECK (max_players > 0),
    skill_level VARCHAR,
    description TEXT,
    drop_deadline_hours INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: registrations
CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paid BOOLEAN NOT NULL DEFAULT false,
    registration_time TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (event_id, user_id)
);

-- Table: waitlist_entries
CREATE TABLE waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    waitlist_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (event_id, user_id)
);

-- Add Indexes for performance
CREATE INDEX idx_groups_creator_id ON groups(creator_id);
CREATE INDEX idx_groups_invite_code ON groups(invite_code);
CREATE INDEX idx_group_memberships_user_id ON group_memberships(user_id);
CREATE INDEX idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX idx_group_memberships_role ON group_memberships(role); -- Index the new role column
CREATE INDEX idx_events_group_id ON events(group_id);
CREATE INDEX idx_events_creator_id ON events(creator_id);
CREATE INDEX idx_events_date_time ON events(date_time);
CREATE INDEX idx_registrations_event_id ON registrations(event_id);
CREATE INDEX idx_registrations_user_id ON registrations(user_id);
CREATE INDEX idx_waitlist_entries_event_id_time ON waitlist_entries(event_id, waitlist_time);
CREATE INDEX idx_waitlist_entries_user_id ON waitlist_entries(user_id);

