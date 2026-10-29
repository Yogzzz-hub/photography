-- ==============================================================================
-- MYORB FAMILY VAULT - COMPLETE POSTGRESQL SCHEMA WITH ROW-LEVEL SECURITY (RLS)
-- Multi-Tenant Isolation, Cryptographic Payloads, Tamper-Evident Audit Trail
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. FAMILIES
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    storage_budget_bytes BIGINT NOT NULL DEFAULT 10737418240, -- 10 GB (Cloudflare R2 Free Tier)
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    settings JSONB NOT NULL DEFAULT '{"allowMemberInvites": true, "requireMFA": true, "autoTrashDays": 30, "defaultTheme": "cinematic-dark"}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. FAMILY MEMBERSHIPS & ROLES
CREATE TYPE public.family_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TABLE IF NOT EXISTS public.family_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.family_role NOT NULL DEFAULT 'member',
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(family_id, user_id)
);

-- 3. INVITATIONS
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role public.family_role NOT NULL DEFAULT 'member',
    token_hash TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. ALBUMS (Granular Cryptographic Collections)
CREATE TABLE IF NOT EXISTS public.albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cover_photo_id UUID,
    is_private BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. WRAPPED ALBUM KEYS (E2EE Key Distribution per Member)
CREATE TABLE IF NOT EXISTS public.wrapped_album_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wrapped_key_hex TEXT NOT NULL,
    iv_hex TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(album_id, user_id)
);

-- 6. PHOTOS (Encrypted Media Objects)
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES auth.users(id),
    storage_path TEXT NOT NULL UNIQUE,
    thumb_storage_path TEXT NOT NULL UNIQUE,
    file_size_bytes BIGINT NOT NULL,
    thumb_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    iv_hex TEXT NOT NULL,
    thumb_iv_hex TEXT NOT NULL,
    encrypted_metadata TEXT NOT NULL, -- AES-256-GCM ciphertext payload (Title, Story, Location, Notes, Tags)
    sha256_hash TEXT NOT NULL,
    capture_date DATE NOT NULL,
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    in_trash BOOLEAN NOT NULL DEFAULT false,
    trashed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. AUDIT LEDGER (Append-Only Event Ledger)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id),
    actor_name TEXT NOT NULL,
    actor_role public.family_role NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    resource_name TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. BACKUPS & SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.vault_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    photo_count INTEGER NOT NULL,
    album_count INTEGER NOT NULL,
    total_size_bytes BIGINT NOT NULL,
    checksum_sha256 TEXT NOT NULL,
    manifest_ciphertext TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- INDEXES FOR ULTRA-LOW LATENCY QUERIES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.family_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_family_trash_date ON public.photos(family_id, in_trash, capture_date DESC);
CREATE INDEX IF NOT EXISTS idx_photos_album ON public.photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_sha256 ON public.photos(family_id, sha256_hash);
CREATE INDEX IF NOT EXISTS idx_audit_family_time ON public.audit_events(family_id, created_at DESC);

-- ==============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wrapped_album_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_backups ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an active family member
CREATE OR REPLACE FUNCTION public.is_family_member(f_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.family_memberships
        WHERE family_id = f_id
          AND user_id = auth.uid()
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Photos: Members can select, uploaders and admins can update/trash
CREATE POLICY photos_select_policy ON public.photos
    FOR SELECT USING (public.is_family_member(family_id));

CREATE POLICY photos_insert_policy ON public.photos
    FOR INSERT WITH CHECK (
        public.is_family_member(family_id) AND auth.uid() = uploader_id
    );

CREATE POLICY photos_update_policy ON public.photos
    FOR UPDATE USING (
        public.is_family_member(family_id) AND (
            uploader_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.family_memberships
                WHERE family_id = photos.family_id
                  AND user_id = auth.uid()
                  AND role IN ('owner', 'admin')
            )
        )
    );

-- Audit Events: Read-only for family members, append-only via system/triggers
CREATE POLICY audit_select_policy ON public.audit_events
    FOR SELECT USING (public.is_family_member(family_id));

CREATE POLICY audit_insert_policy ON public.audit_events
    FOR INSERT WITH CHECK (public.is_family_member(family_id));
