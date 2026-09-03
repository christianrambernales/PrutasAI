-- Coarse location, rounded to 2 decimal places (~1 km) before it ever leaves
-- the device, and rounded again server-side so a modified client cannot store
-- a precise fix. Nullable: a scan taken before the user set a place has none.
alter table scan add column if not exists lat real;
alter table scan add column if not exists lon real;

alter table scan add constraint scan_lat_range check (lat is null or (lat between -90 and 90));
alter table scan add constraint scan_lon_range check (lon is null or (lon between -180 and 180));
