-- Wyniki interaktywnego dylematu (/pl/dylemat/), wersja tresci 2.x. Jeden
-- wiersz na ukonczona droge. Bez danych osobowych: brak IP, ciasteczek i
-- naglowkow przegladarki. host odroznia produkcje od podgladow galezi, ktore
-- pisza do tej samej bazy. Tabela responses z 0001 zostaje dla wynikow wersji
-- pierwszej.
CREATE TABLE IF NOT EXISTS dylemat_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  version TEXT NOT NULL,
  client TEXT NOT NULL,
  path TEXT NOT NULL,
  difficulty INTEGER NOT NULL,
  return_mode TEXT,
  lucja TEXT,
  objection TEXT,
  final_path TEXT NOT NULL,
  difficulty_return INTEGER,
  difficulty_lucja INTEGER,
  difficulty_objection INTEGER,
  decision_ms INTEGER NOT NULL,
  timings TEXT NOT NULL,
  info_opens TEXT NOT NULL,
  paid TEXT,
  value TEXT,
  veyr INTEGER,
  more TEXT,
  who TEXT,
  clarity INTEGER,
  comment TEXT,
  age TEXT,
  games TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  host TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS dylemat_responses_host_version ON dylemat_responses (host, version);
