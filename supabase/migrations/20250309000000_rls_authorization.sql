-- =============================================================================
-- RLS Authorization – deny by default, least privilege
-- Richiede: JWT con app_metadata.prisma_user_id e app_metadata.role
-- Nomi tabelle come in Prisma (PostgreSQL quoted identifiers).
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS authz;

-- Helper: ruolo corrente da JWT (ADMIN, UFFICIO, TECNICO)
CREATE OR REPLACE FUNCTION authz.current_role()
RETURNS text AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    'TECNICO'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: prisma user id corrente da JWT
CREATE OR REPLACE FUNCTION authz.current_user_id()
RETURNS uuid AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'prisma_user_id')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================================
-- User
-- Solo ADMIN può leggere (RLS: altri ruoli nessun accesso)
-- =============================================================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User_select_admin" ON "User";
CREATE POLICY "User_select_admin" ON "User"
  FOR SELECT USING (authz.current_role() = 'ADMIN');

-- =============================================================================
-- Manutenzione: tecnico vede solo propri (tecnicoId = current user)
-- =============================================================================
ALTER TABLE "Manutenzione" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manutenzione_select" ON "Manutenzione";
CREATE POLICY "Manutenzione_select" ON "Manutenzione"
  FOR SELECT USING (
    authz.current_role() IN ('ADMIN', 'UFFICIO')
    OR (authz.current_role() = 'TECNICO' AND "tecnicoId" = authz.current_user_id())
  );

DROP POLICY IF EXISTS "Manutenzione_insert" ON "Manutenzione";
CREATE POLICY "Manutenzione_insert" ON "Manutenzione"
  FOR INSERT WITH CHECK (
    authz.current_role() IN ('ADMIN', 'UFFICIO')
    OR (authz.current_role() = 'TECNICO' AND "tecnicoId" = authz.current_user_id())
  );

DROP POLICY IF EXISTS "Manutenzione_update" ON "Manutenzione";
CREATE POLICY "Manutenzione_update" ON "Manutenzione"
  FOR UPDATE USING (
    authz.current_role() IN ('ADMIN', 'UFFICIO')
  );

DROP POLICY IF EXISTS "Manutenzione_delete" ON "Manutenzione";
CREATE POLICY "Manutenzione_delete" ON "Manutenzione"
  FOR DELETE USING (
    authz.current_role() IN ('ADMIN', 'UFFICIO')
  );

-- =============================================================================
-- Intervento: come Manutenzione
-- =============================================================================
ALTER TABLE "Intervento" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Intervento_select" ON "Intervento";
CREATE POLICY "Intervento_select" ON "Intervento"
  FOR SELECT USING (
    authz.current_role() IN ('ADMIN', 'UFFICIO')
    OR (authz.current_role() = 'TECNICO' AND "tecnicoId" = authz.current_user_id())
  );

DROP POLICY IF EXISTS "Intervento_insert" ON "Intervento";
CREATE POLICY "Intervento_insert" ON "Intervento"
  FOR INSERT WITH CHECK (
    authz.current_role() IN ('ADMIN', 'UFFICIO')
    OR (authz.current_role() = 'TECNICO' AND "tecnicoId" = authz.current_user_id())
  );

DROP POLICY IF EXISTS "Intervento_update" ON "Intervento";
CREATE POLICY "Intervento_update" ON "Intervento"
  FOR UPDATE USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

DROP POLICY IF EXISTS "Intervento_delete" ON "Intervento";
CREATE POLICY "Intervento_delete" ON "Intervento"
  FOR DELETE USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

-- =============================================================================
-- VerificaBiennale: come Manutenzione (tecnicoId nullable)
-- =============================================================================
ALTER TABLE "VerificaBiennale" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "VerificaBiennale_select" ON "VerificaBiennale";
CREATE POLICY "VerificaBiennale_select" ON "VerificaBiennale"
  FOR SELECT USING (
    authz.current_role() IN ('ADMIN', 'UFFICIO')
    OR (authz.current_role() = 'TECNICO' AND "tecnicoId" = authz.current_user_id())
  );

DROP POLICY IF EXISTS "VerificaBiennale_insert" ON "VerificaBiennale";
CREATE POLICY "VerificaBiennale_insert" ON "VerificaBiennale"
  FOR INSERT WITH CHECK (
    authz.current_role() IN ('ADMIN', 'UFFICIO')
    OR (authz.current_role() = 'TECNICO' AND ("tecnicoId" IS NULL OR "tecnicoId" = authz.current_user_id()))
  );

DROP POLICY IF EXISTS "VerificaBiennale_update" ON "VerificaBiennale";
CREATE POLICY "VerificaBiennale_update" ON "VerificaBiennale"
  FOR UPDATE USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

DROP POLICY IF EXISTS "VerificaBiennale_delete" ON "VerificaBiennale";
CREATE POLICY "VerificaBiennale_delete" ON "VerificaBiennale"
  FOR DELETE USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

-- =============================================================================
-- Presenza: tecnico solo propri
-- =============================================================================
ALTER TABLE "Presenza" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Presenza_select" ON "Presenza";
CREATE POLICY "Presenza_select" ON "Presenza"
  FOR SELECT USING (
    authz.current_role() IN ('ADMIN', 'UFFICIO')
    OR (authz.current_role() = 'TECNICO' AND "tecnicoId" = authz.current_user_id())
  );

DROP POLICY IF EXISTS "Presenza_insert" ON "Presenza";
CREATE POLICY "Presenza_insert" ON "Presenza"
  FOR INSERT WITH CHECK (authz.current_role() IN ('ADMIN', 'UFFICIO'));

DROP POLICY IF EXISTS "Presenza_update" ON "Presenza";
CREATE POLICY "Presenza_update" ON "Presenza"
  FOR UPDATE USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

DROP POLICY IF EXISTS "Presenza_delete" ON "Presenza";
CREATE POLICY "Presenza_delete" ON "Presenza"
  FOR DELETE USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

-- =============================================================================
-- PresenzaCantiere: tecnico solo propri, nessun update/delete
-- =============================================================================
ALTER TABLE "PresenzaCantiere" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PresenzaCantiere_select" ON "PresenzaCantiere";
CREATE POLICY "PresenzaCantiere_select" ON "PresenzaCantiere"
  FOR SELECT USING (
    authz.current_role() IN ('ADMIN', 'UFFICIO')
    OR (authz.current_role() = 'TECNICO' AND "tecnicoId" = authz.current_user_id())
  );

DROP POLICY IF EXISTS "PresenzaCantiere_insert" ON "PresenzaCantiere";
CREATE POLICY "PresenzaCantiere_insert" ON "PresenzaCantiere"
  FOR INSERT WITH CHECK (
    authz.current_role() IN ('ADMIN', 'UFFICIO')
    OR (authz.current_role() = 'TECNICO' AND "tecnicoId" = authz.current_user_id())
  );

DROP POLICY IF EXISTS "PresenzaCantiere_update" ON "PresenzaCantiere";
CREATE POLICY "PresenzaCantiere_update" ON "PresenzaCantiere"
  FOR UPDATE USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

DROP POLICY IF EXISTS "PresenzaCantiere_delete" ON "PresenzaCantiere";
CREATE POLICY "PresenzaCantiere_delete" ON "PresenzaCantiere"
  FOR DELETE USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

-- =============================================================================
-- Impianto: tecnico vede solo se ha almeno un rapporto (manutenzione/intervento/vb)
-- In RLS non possiamo esprimere "esiste manutenzione con tecnicoId = current user e impiantoId = id"
-- in modo semplice su SELECT Impianto. Usiamo una policy che consente:
-- ADMIN/UFFICIO: tutto; TECNICO: nessun accesso diretto (l'app filtra via Prisma).
-- Per consentire al TECNICO lettura solo di alcuni impianti servirebbe una tabella
-- di assegnazione o una VIEW. Qui neghiamo al TECNICO l'accesso diretto alla tabella
-- così che qualsiasi accesso passi dall'app (Prisma con filtro).
-- =============================================================================
ALTER TABLE "Impianto" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Impianto_all_admin_ufficio" ON "Impianto";
CREATE POLICY "Impianto_all_admin_ufficio" ON "Impianto"
  FOR ALL USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

-- TECNICO: nessuna policy INSERT/UPDATE/DELETE; per SELECT usiamo una policy che
-- permette solo gli impianti per cui esiste una manutenzione/intervento/verifica del tecnico
DROP POLICY IF EXISTS "Impianto_select_tecnico" ON "Impianto";
CREATE POLICY "Impianto_select_tecnico" ON "Impianto"
  FOR SELECT USING (
    authz.current_role() = 'TECNICO'
    AND (
      EXISTS (SELECT 1 FROM "Manutenzione" m WHERE m."impiantoId" = "Impianto".id AND m."tecnicoId" = authz.current_user_id())
      OR EXISTS (SELECT 1 FROM "Intervento" i WHERE i."impiantoId" = "Impianto".id AND i."tecnicoId" = authz.current_user_id())
      OR EXISTS (SELECT 1 FROM "VerificaBiennale" v WHERE v."impiantoId" = "Impianto".id AND v."tecnicoId" = authz.current_user_id())
    )
  );

-- =============================================================================
-- Cliente: ADMIN/UFFICIO tutto; TECNICO solo lettura (l'app filtra quali clienti)
-- Per semplicità TECNICO non ha accesso diretto alla tabella; l'app espone solo
-- i clienti degli impianti assegnati con campi limitati.
-- =============================================================================
ALTER TABLE "Cliente" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cliente_admin_ufficio" ON "Cliente";
CREATE POLICY "Cliente_admin_ufficio" ON "Cliente"
  FOR ALL USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

-- =============================================================================
-- Contratto, Fattura, NotaCredito: solo ADMIN e UFFICIO (dati economici)
-- =============================================================================
ALTER TABLE "Contratto" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Contratto_admin_ufficio" ON "Contratto";
CREATE POLICY "Contratto_admin_ufficio" ON "Contratto"
  FOR ALL USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

ALTER TABLE "Fattura" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Fattura_admin_ufficio" ON "Fattura";
CREATE POLICY "Fattura_admin_ufficio" ON "Fattura"
  FOR ALL USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

ALTER TABLE "NotaCredito" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "NotaCredito_admin_ufficio" ON "NotaCredito";
CREATE POLICY "NotaCredito_admin_ufficio" ON "NotaCredito"
  FOR ALL USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

-- =============================================================================
-- RolePermission: solo ADMIN
-- =============================================================================
ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RolePermission_admin" ON "RolePermission";
CREATE POLICY "RolePermission_admin" ON "RolePermission"
  FOR ALL USING (authz.current_role() = 'ADMIN');

-- =============================================================================
-- Amministratore: ADMIN/UFFICIO; TECNICO nessun accesso diretto (l'app filtra)
-- =============================================================================
ALTER TABLE "Amministratore" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Amministratore_admin_ufficio" ON "Amministratore";
CREATE POLICY "Amministratore_admin_ufficio" ON "Amministratore"
  FOR ALL USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

-- =============================================================================
-- Booking: ADMIN/UFFICIO tutto; TECNICO solo lettura (no modifica booking)
-- =============================================================================
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Booking_select_all" ON "Booking";
CREATE POLICY "Booking_select_all" ON "Booking"
  FOR SELECT USING (authz.current_role() IN ('ADMIN', 'UFFICIO', 'TECNICO'));
DROP POLICY IF EXISTS "Booking_modify_admin_ufficio" ON "Booking";
CREATE POLICY "Booking_modify_admin_ufficio" ON "Booking"
  FOR ALL USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

-- CondizionePagamento, ServizioContratto, BookingCliente: ereditano da padre o stesso ruolo
ALTER TABLE "CondizionePagamento" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "CondizionePagamento_admin_ufficio" ON "CondizionePagamento";
CREATE POLICY "CondizionePagamento_admin_ufficio" ON "CondizionePagamento"
  FOR ALL USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

ALTER TABLE "ServizioContratto" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ServizioContratto_admin_ufficio" ON "ServizioContratto";
CREATE POLICY "ServizioContratto_admin_ufficio" ON "ServizioContratto"
  FOR ALL USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));

ALTER TABLE "BookingCliente" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "BookingCliente_select" ON "BookingCliente";
CREATE POLICY "BookingCliente_select" ON "BookingCliente"
  FOR SELECT USING (authz.current_role() IN ('ADMIN', 'UFFICIO', 'TECNICO'));
DROP POLICY IF EXISTS "BookingCliente_modify" ON "BookingCliente";
CREATE POLICY "BookingCliente_modify" ON "BookingCliente"
  FOR ALL USING (authz.current_role() IN ('ADMIN', 'UFFICIO'));
