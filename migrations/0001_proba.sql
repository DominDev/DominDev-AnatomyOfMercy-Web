-- Wyniki interaktywnej proby dylematu (/proba/). Jeden wiersz na ukonczona
-- probe. Bez danych osobowych: brak IP, ciasteczek i naglowkow przegladarki.
-- host odroznia produkcje od podgladow galezi, ktore pisza do tej samej bazy.
CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  version TEXT NOT NULL,
  client TEXT NOT NULL,
  path TEXT NOT NULL,
  return_mode TEXT,
  lucja TEXT,
  objection TEXT,
  final_path TEXT NOT NULL,
  decision_ms INTEGER NOT NULL,
  rereads INTEGER NOT NULL,
  timings TEXT NOT NULL,
  q1 TEXT, q2 TEXT, q3 TEXT, q4 TEXT, q5 TEXT,
  age TEXT,
  games TEXT,
  host TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS responses_host_created ON responses (host, created_at);
