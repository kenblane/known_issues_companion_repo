-- schema.sql
--
-- Three tables. Existed "mostly" by day three, after two days spent
-- choosing a font for the dashboard (the font is the same font it would
-- have been after thirty seconds).

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  merchant      TEXT NOT NULL,        -- after cleanTxn
  amount_cents  INTEGER NOT NULL,
  label         TEXT NOT NULL DEFAULT 'possible subscription',
  cancelled     BOOLEAN NOT NULL DEFAULT false
);

-- The firehose. Every line item from every bank statement a user connects.
-- Most of it meaningless, some of it deeply personal, all of it written by
-- banks in a dialect apparently designed to resist comprehension.
CREATE TABLE transactions_raw (
  id            BIGSERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  bank          TEXT NOT NULL,
  description   TEXT NOT NULL,        -- e.g. 'SQ *THE DAILY GR N'
  amount_cents  INTEGER NOT NULL,
  posted_at     BIGINT NOT NULL
);

-- Not built:
--   CREATE TABLE leaderboard (...);       -- boring, or deeply upsetting
--   CREATE TABLE health_scores (...);     -- invented at 10:40 p.m.
--   CREATE TABLE ai_insights (...);       -- what would they even say
--   CREATE TABLE onchain_cancellations;   -- no
