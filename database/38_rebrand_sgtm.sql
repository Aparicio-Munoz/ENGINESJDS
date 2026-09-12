-- ============================================================
-- SGTM — Actualización de branding para instalaciones existentes
-- ============================================================

USE engines_jds;

-- Solo reemplaza los valores predeterminados históricos; no sobrescribe
-- personalizaciones que cada taller haya realizado en Configuración.
UPDATE settings
SET
  business_name = CASE
    WHEN business_name IN ('ENGINES JDS', 'ENGINES-JDS') THEN 'SGTM'
    ELSE business_name
  END,
  footer_message = CASE
    WHEN footer_message = 'Gracias por confiar en ENGINES JDS' THEN 'Gracias por confiar en SGTM'
    ELSE footer_message
  END,
  website = CASE
    WHEN website = 'www.enginesjds.com' THEN NULL
    ELSE website
  END
WHERE id = 1
  AND (
    business_name IN ('ENGINES JDS', 'ENGINES-JDS')
    OR footer_message = 'Gracias por confiar en ENGINES JDS'
    OR website = 'www.enginesjds.com'
  );
