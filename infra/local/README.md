# Local Runtime

Pacta runs locally with PostgreSQL, the NestJS API, the Next.js frontend, and the deployed StudioNet contract address.

```bash
python scripts/run_local_stack.py --start
```

The script creates `.env` from `.env.example` when missing, checks Supabase/local runtime readiness, and launches the backend and frontend with logs under `.local/logs/`. Pacta database setup now happens through SQL files in `supabase/migrations`.

Local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- API docs: `http://localhost:4000/docs`

Backend hosting is still intentionally unselected. Do not deploy backend infrastructure until the provider is explicitly approved.
