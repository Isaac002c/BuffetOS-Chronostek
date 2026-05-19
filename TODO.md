# Task: Implement Fines in ClientDetail (3 steps)

## Steps:
- [ ] 1. Create saas-multitenant/app/lib/db.js (pg pool from env)
- [ ] 2. Update saas-multitenant/app/lib/finesAPI.js (add pool-based getFinesByClient with JOIN query)
- [ ] 3. Update saas-multitenant/app/multas/clients/[id]/page.jsx (import finesAPI, replace loadAll with fines transform)
- [ ] 4. cd saas-multitenant &amp;&amp; npm i pg
- [ ] 5. Test: cd saas-multitenant &amp;&amp; npm run dev, navigate to /multas/clients/[id]
- [ ] 6. Mark complete
