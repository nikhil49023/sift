DO $$ BEGIN
IF to_regclass('storage.buckets') IS NOT NULL THEN
  INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  VALUES('sift-private','sift-private',false,10485760,ARRAY['application/pdf'])
  ON CONFLICT(id) DO UPDATE SET public=false;
END IF;
END $$;
-- No browser read/write policies: only server-side signed downloads and uploads.
