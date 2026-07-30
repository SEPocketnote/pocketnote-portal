-- Ensure the tutor-photos bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutor-photos', 'tutor-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Anyone can read (photos are displayed to parents/admin)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'tutor-photos: public read'
  ) THEN
    CREATE POLICY "tutor-photos: public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'tutor-photos');
  END IF;
END $$;

-- Tutors can upload into their own folder ({tutor_id}/...)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'tutor-photos: tutor insert'
  ) THEN
    CREATE POLICY "tutor-photos: tutor insert"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'tutor-photos'
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM tutors WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Tutors can replace their own photo
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'tutor-photos: tutor update'
  ) THEN
    CREATE POLICY "tutor-photos: tutor update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'tutor-photos'
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM tutors WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Admins have full access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'tutor-photos: admin all'
  ) THEN
    CREATE POLICY "tutor-photos: admin all"
      ON storage.objects FOR ALL
      TO authenticated
      USING (
        bucket_id = 'tutor-photos'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;
