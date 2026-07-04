# Local Runtime

Pacta runs locally with the Next.js frontend/API, Supabase, and the deployed StudioNet contract address.

```bash
python scripts/run_local_stack.py --start
```

The script creates `.env` from `.env.example` when missing, checks Supabase readiness, and launches the Next.js app with logs under `.local/logs/`. Pacta database setup happens through SQL files in `supabase/migrations`.

Local URLs:

- Frontend: `http://localhost:3000`
- API health: `http://localhost:3000/api/health`
