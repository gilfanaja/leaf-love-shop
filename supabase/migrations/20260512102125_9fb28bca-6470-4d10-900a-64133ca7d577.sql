
-- search_path on remaining functions
create or replace function public.touch_updated_at()
returns trigger language plpgsql security invoker set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

create or replace function public.generate_order_number()
returns text language plpgsql security invoker set search_path = public
as $$ begin
  return 'GG-' || to_char(now(),'YYYYMMDD') || '-' || lpad(floor(random()*100000)::text, 5, '0');
end; $$;

-- revoke execute from public/anon/authenticated on SECURITY DEFINER internals
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;

-- restrict public listing on product-images bucket: only allow read of specific objects, no LIST
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects for select
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] is not null);
