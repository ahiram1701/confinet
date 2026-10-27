-- Semilla mínima y conservadora de reputación de dominios.
-- Solo incluye categorías ampliamente reconocidas (agencias de noticias, organismos oficiales
-- y sitios de sátira autodeclarada). El resto se gestiona desde el panel de administración o
-- importando listas abiertas cuya licencia permita su uso.
INSERT OR IGNORE INTO domain_reputation (domain, rating, source, notes) VALUES
  ('reuters.com', 'reliable', 'Semilla Confinet', 'Agencia de noticias internacional'),
  ('apnews.com', 'reliable', 'Semilla Confinet', 'Agencia de noticias internacional'),
  ('efe.com', 'reliable', 'Semilla Confinet', 'Agencia de noticias'),
  ('afp.com', 'reliable', 'Semilla Confinet', 'Agencia de noticias internacional'),
  ('europapress.es', 'reliable', 'Semilla Confinet', 'Agencia de noticias'),
  ('bbc.com', 'reliable', 'Semilla Confinet', 'Radiodifusión pública'),
  ('bbc.co.uk', 'reliable', 'Semilla Confinet', 'Radiodifusión pública'),
  ('rtve.es', 'reliable', 'Semilla Confinet', 'Radiodifusión pública'),
  ('who.int', 'reliable', 'Semilla Confinet', 'Organización Mundial de la Salud'),
  ('un.org', 'reliable', 'Semilla Confinet', 'Naciones Unidas'),
  ('europa.eu', 'reliable', 'Semilla Confinet', 'Unión Europea'),
  ('ine.es', 'reliable', 'Semilla Confinet', 'Instituto Nacional de Estadística'),
  ('nature.com', 'reliable', 'Semilla Confinet', 'Revista científica revisada por pares'),
  ('science.org', 'reliable', 'Semilla Confinet', 'Revista científica revisada por pares'),
  ('wikipedia.org', 'mixed', 'Semilla Confinet', 'Enciclopedia colaborativa: verificar las fuentes citadas'),
  ('elmundotoday.com', 'satire', 'Semilla Confinet', 'Sátira autodeclarada'),
  ('theonion.com', 'satire', 'Semilla Confinet', 'Sátira autodeclarada'),
  ('thebeaverton.com', 'satire', 'Semilla Confinet', 'Sátira autodeclarada'),
  ('babylonbee.com', 'satire', 'Semilla Confinet', 'Sátira autodeclarada');
