Frontend Angular

Setup:
- From `frontend/` run `npm install` then `npm start` (requires Angular CLI).
- The frontend expects backend API proxy at `/api` (configure proxy or run frontend and backend on same host with reverse proxy).

Auth & Persistence:
- Recommended: use Supabase for auth and optional DB hosting. Add `@supabase/supabase-js` to authenticate users and obtain `createdBy` for invoice actions.

UX:
- Implement components: Dashboard, Cuts, Suppliers, Invoicing, History, Monthly/Annual reports.
- Use Brazilian currency formatting via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
