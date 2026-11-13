CREATE TABLE IF NOT EXISTS climate_history_cache (
  latitude_key TEXT NOT NULL,
  longitude_key TEXT NOT NULL,
  from_year INTEGER NOT NULL,
  to_year INTEGER NOT NULL,
  source_model TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  monthly_rain_mm TEXT NOT NULL,
  annual_rain_mm REAL NOT NULL,
  mean_temperature_c REAL NOT NULL,
  elevation_m REAL,
  PRIMARY KEY (latitude_key, longitude_key, from_year, to_year, source_model),
  CHECK (from_year > 0 AND to_year >= from_year),
  CHECK (annual_rain_mm >= 0),
  CHECK (elevation_m IS NULL OR elevation_m >= 0)
);
