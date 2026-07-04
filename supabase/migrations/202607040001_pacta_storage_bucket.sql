insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pacta-evidence',
  'pacta-evidence',
  false,
  104857600,
  array[
    'application/pdf',
    'application/json',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'video/mp4'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
