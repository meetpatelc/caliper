-- A saved check recorded what was entered and what came out, but not which
-- version of the model produced it, nor the assumptions and boundary that make
-- the number mean anything. Reopened a year later — or after the model is
-- corrected — the row could not say whether it still stood.
--
-- Nullable on purpose: rows written before this existed genuinely do not know
-- their provenance, and inventing a default would assert something false about
-- them. An empty stamp means "unknown", not "current".
alter table desk_calculations add column if not exists formula_version text;
alter table desk_calculations add column if not exists app_version text;
alter table desk_calculations add column if not exists assumptions_json text;
alter table desk_calculations add column if not exists boundary text;
