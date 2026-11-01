CREATE TABLE settings (
  user_id uuid PRIMARY KEY,
  daily_new integer NOT NULL,
  reminder_time text,
  theme text NOT NULL,
  voice text NOT NULL,
  active_list_id text NOT NULL,
  placement_done boolean NOT NULL,
  updated_at text NOT NULL,
  synced_at text NOT NULL
);

CREATE TABLE user_words (
  user_id uuid NOT NULL,
  word_id text NOT NULL,
  status text NOT NULL,
  assumed boolean NOT NULL,
  ease double precision NOT NULL,
  "interval" integer NOT NULL,
  reps integer NOT NULL,
  lapses integer NOT NULL,
  due text,
  first_seen_at text,
  updated_at text NOT NULL,
  synced_at text NOT NULL,
  PRIMARY KEY (user_id, word_id)
);

CREATE TABLE review_logs (
  user_id uuid NOT NULL,
  id text NOT NULL,
  word_id text NOT NULL,
  at text NOT NULL,
  mode text NOT NULL,
  grade text NOT NULL,
  ms_taken integer,
  received_at text NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE day_stats (
  user_id uuid NOT NULL,
  date text NOT NULL,
  new_learned integer NOT NULL,
  reviewed integer NOT NULL,
  goal_met boolean NOT NULL,
  updated_at text NOT NULL,
  PRIMARY KEY (user_id, date)
);
