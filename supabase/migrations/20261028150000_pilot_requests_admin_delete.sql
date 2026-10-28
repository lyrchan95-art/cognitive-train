-- Admins can delete pilot requests (privacy policy: deleted within 12 months if no pilot goes ahead).
CREATE POLICY "Admins delete pilot requests" ON public.pilot_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
