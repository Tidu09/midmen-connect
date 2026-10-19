# midmen-connect

The static "Allow" page of the MIDMEN sign-in for Claude chat and Cowork (OAuth). It holds no secrets: only the public Supabase URL and anon key (the same ones the Excel add-in carries).

Built from `connect-page/` in the private `Tidu09/midmen` repo with `node scripts/build-connect-page.mjs`. Do not edit here: change it in `midmen` and republish.

`procurement/` is the same page for the separate MIDMEN procurement hub (built from `connect-page/` in `Tidu09/midmen-public-procurement` with its own public Supabase URL and anon key). The main page above is not affected by it.
