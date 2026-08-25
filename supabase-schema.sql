-- =======================================================
-- SUPABASE DATABASE SCHEMA FOR PDF SITEPLAN ANNOTATOR
-- Jalankan script SQL ini di Supabase SQL Editor (Dashboard > SQL Editor)
-- =======================================================

-- 1. Buat Tabel Siteplans
CREATE TABLE IF NOT EXISTS public.siteplans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    pdf_file_name TEXT,
    pdf_storage_path TEXT,
    pdf_url TEXT,
    canvas_width NUMERIC DEFAULT 0,
    canvas_height NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Buat Tabel Nodes Kavling
CREATE TABLE IF NOT EXISTS public.nodes (
    id TEXT PRIMARY KEY,
    siteplan_id UUID REFERENCES public.siteplans(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    category TEXT DEFAULT 'SAAKUURAA',
    type TEXT DEFAULT 'Single',
    status TEXT DEFAULT 'RENCANA',
    x NUMERIC NOT NULL,
    y NUMERIC NOT NULL,
    dimension TEXT,
    area TEXT,
    properties JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.siteplans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;

-- 4. Buat Kebijakan Akses (RLS Policies) untuk Pengguna Anon / Publik
-- Memungkinkan aplikasi membaca, menambah, mengubah, dan menghapus data
DROP POLICY IF EXISTS "Allow public read siteplans" ON public.siteplans;
CREATE POLICY "Allow public read siteplans" ON public.siteplans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert siteplans" ON public.siteplans;
CREATE POLICY "Allow public insert siteplans" ON public.siteplans FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update siteplans" ON public.siteplans;
CREATE POLICY "Allow public update siteplans" ON public.siteplans FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete siteplans" ON public.siteplans;
CREATE POLICY "Allow public delete siteplans" ON public.siteplans FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read nodes" ON public.nodes;
CREATE POLICY "Allow public read nodes" ON public.nodes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert nodes" ON public.nodes;
CREATE POLICY "Allow public insert nodes" ON public.nodes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update nodes" ON public.nodes;
CREATE POLICY "Allow public update nodes" ON public.nodes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete nodes" ON public.nodes;
CREATE POLICY "Allow public delete nodes" ON public.nodes FOR DELETE USING (true);

-- 5. Aktifkan Storage Bucket Publik untuk File PDF Siteplan (Opsional tapi Direkomendasikan)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('siteplans', 'siteplans', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access to siteplans bucket" ON storage.objects;
CREATE POLICY "Public Access to siteplans bucket" ON storage.objects
FOR ALL USING (bucket_id = 'siteplans');
