-- Seed the three package types from the spec
-- Prices in cents (AUD)

INSERT INTO packages (type, sessions_total, price_in_person, price_online) VALUES
  ('single',  1,  10500, 7900),  -- $105 / $79
  ('starter', 5,  44500, 34500), -- $89/session x5 = $445 / $69 x5 = $345
  ('term',    10, 89000, 69000); -- $89/session x10 = $890 / $69 x10 = $690
