# AGENTS.md — Softpro Innovation

Rules for agents in this repo. Context: `CLAUDE.md`. Hosting/deploy: `HOSTING.md` and
`DEPLOYMENT.md`. Workspace rules: `../AGENTS.md`.

---

## What this checkout is

The **dev** copy, currently not running. Production (`innovation.softproindia.in`) runs
under `ubuntu` at `/home/ubuntu/rohit-projects/SoftproInnovation` — unreadable from here.
**You open and merge PRs; the release runs against the `ubuntu`-side tree.**

---

## Hard rules

1. **Trunk is `deploy/vm-setup-and-fixes`**, not `main`. Branch off it and target it in
   PRs. Don't "clean this up" by switching trunks without asking — prod tracks this
   branch.
2. **Never touch `server/uploads/`** as if it were code. It's production runtime data
   (product images), not in git by design, and lost data is lost for good.
3. **Never connect to production Mongo** (`127.0.0.1:27017`). The dev instance is
   `:27018`.
4. **Don't "fix" the `JWT_SECRET` / `jWT_SECRET` pair** without auditing every read site —
   the duplicate is intentional typo-compat and dropping one will log everybody out.
5. **Don't enable live payments.** Razorpay keys are placeholders; wiring real ones is a
   founder decision.
6. Keep the client's API calls **relative** (`/api/...`) so the same build works behind
   nginx.

---

## Verifying

There are no tests (`server`'s `test` script just runs `dev`), and **no CI workflow** —
nothing catches a mistake for you. So verification is manual and mandatory:

```bash
cd client && npm run build && npm run lint     # must both pass
# then run the dev instance (HOSTING.md §2) and drive:
#   - catalogue loads (GET /api/product/products — nested path)
#   - admin login + a product create/edit
#   - an image upload (multer + nginx body-size behaviour differs from dev)
```

State what you ran in the PR body, including the fact that CI doesn't cover this repo.

---

## Escalate

- Any schema/Mongoose model change against production data.
- Anything touching uploads, payments, or auth secrets.
- Adding a CI workflow or changing the deploy branch.
- nginx / TLS / DNS changes (root-owned).
