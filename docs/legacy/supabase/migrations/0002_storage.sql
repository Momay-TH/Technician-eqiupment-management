-- Storage bucket for equipment photos / receipts (MVP: public read)
insert into storage.buckets (id, name, public)
values ('equipment', 'equipment', true)
on conflict (id) do nothing;

drop policy if exists "equipment files read" on storage.objects;
create policy "equipment files read" on storage.objects
  for select using (bucket_id = 'equipment');

drop policy if exists "equipment files upload" on storage.objects;
create policy "equipment files upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'equipment');

drop policy if exists "equipment files update" on storage.objects;
create policy "equipment files update" on storage.objects
  for update to authenticated
  using (bucket_id = 'equipment');

drop policy if exists "equipment files delete" on storage.objects;
create policy "equipment files delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'equipment');
