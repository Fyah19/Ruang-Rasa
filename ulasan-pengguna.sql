-- Ulasan oleh pengguna sendiri (dengan foto chat dan bukti bayar)

-- 1. Izinkan sumber 'user'
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.reviews'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) ilike '%source%'
  loop
    execute 'alter table reviews drop constraint ' || quote_ident(c);
  end loop;
end $$;
alter table reviews add constraint reviews_source_check
  check (source in ('system','whatsapp','user'));

-- 2. Pengguna boleh melihat dan menghapus ulasan miliknya (yang bukan dari pesanan)
drop policy if exists "baca review sendiri" on reviews;
drop policy if exists "hapus review sendiri" on reviews;
create policy "baca review sendiri" on reviews for select to authenticated
  using (user_id = auth.uid());
create policy "hapus review sendiri" on reviews for delete to authenticated
  using (user_id = auth.uid() and order_id is null);

-- 3. Pengguna boleh mengunggah gambar ke folder miliknya sendiri
drop policy if exists "user unggah bukti" on storage.objects;
drop policy if exists "user hapus bukti" on storage.objects;
create policy "user unggah bukti" on storage.objects for insert to authenticated
  with check (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user hapus bukti" on storage.objects for delete to authenticated
  using (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Fungsi kirim ulasan. Maksimal 3 per pengguna.
-- Tanpa gambar: langsung tampil. Dengan gambar: menunggu persetujuan admin.
create or replace function submit_user_review(p_rating int, p_content text, p_chat text, p_proof text)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_nick text; v_img boolean;
begin
  if v_user is null then raise exception 'NOT_AUTH'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'BAD_RATING'; end if;
  p_chat := nullif(p_chat, ''); p_proof := nullif(p_proof, '');
  if p_chat is not null and (p_chat not like v_user::text || '/%' or p_chat like '%..%') then raise exception 'BAD_PATH'; end if;
  if p_proof is not null and (p_proof not like v_user::text || '/%' or p_proof like '%..%') then raise exception 'BAD_PATH'; end if;
  if coalesce(trim(p_content), '') = '' and p_chat is null and p_proof is null then raise exception 'EMPTY'; end if;
  if (select count(*) from reviews where user_id = v_user and order_id is null) >= 3 then raise exception 'LIMIT'; end if;
  v_img := p_chat is not null or p_proof is not null;
  select nickname into v_nick from profiles where id = v_user;
  insert into reviews (source, user_id, display_name, rating, content, chat_path, proof_path, published)
  values (case when v_img then 'whatsapp' else 'user' end, v_user, coalesce(v_nick, 'Pengguna'), p_rating,
          left(nullif(trim(p_content), ''), 600), p_chat, p_proof, not v_img);
end; $$;
