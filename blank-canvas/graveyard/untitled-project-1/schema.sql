-- the database. all of it.
CREATE TABLE tasks (
  id      SERIAL PRIMARY KEY,
  title   TEXT NOT NULL,
  column  TEXT NOT NULL DEFAULT 'todo'   -- todo | doing | done | revolutionised
);
