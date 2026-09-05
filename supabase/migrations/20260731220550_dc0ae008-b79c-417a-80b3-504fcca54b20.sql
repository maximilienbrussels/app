CREATE POLICY "Admins beheren producten insert" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.is_active_admin(auth.uid()));
CREATE POLICY "Admins beheren producten update" ON public.products
  FOR UPDATE TO authenticated USING (public.is_active_admin(auth.uid()))
  WITH CHECK (public.is_active_admin(auth.uid()));
CREATE POLICY "Admins beheren producten delete" ON public.products
  FOR DELETE TO authenticated USING (public.is_active_admin(auth.uid()));

CREATE POLICY "Team leest bestellingen" ON public.orders
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins werken bestellingen bij" ON public.orders
  FOR UPDATE TO authenticated USING (public.is_active_admin(auth.uid()))
  WITH CHECK (public.is_active_admin(auth.uid()));
CREATE POLICY "Team leest bestellijnen" ON public.order_items
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));