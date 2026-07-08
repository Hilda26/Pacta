# Pacta Demo Runbook

## Goal

Produce one complete public demo covenant that proves Pacta can create a bonded mentorship promise, record evidence, and request GenLayer validator evaluation.

## Preflight

- Use Chrome with only one EVM wallet extension enabled.
- Use the same wallet for Pacta login and StudioNet transactions.
- Confirm the live config endpoint returns `0xeBb262198DE067bf73cdAdF6d1C9f211cb1AF1a2`.
- Keep the GenLayer portal open for transaction checks.

## Demo Inputs

Title:
`Manual Test - Mentorship Covenant`

Promise:
`I will mentor five students over the next 90 days by holding weekly online mentoring sessions and reviewing their learning progress.`

Success criteria:
`At least five students receive mentoring, each student attends at least three sessions, and each student submits feedback confirming the mentoring was useful.`

Evidence requirements:
`Submit public project links, public session summaries, student attestations, repository activity, and validator notes.`

Evidence URL examples:

- `https://github.com/Hilda26/Pacta`
- A public GitHub issue, PR, repository, or project page relevant to the mentorship scenario.
- A public published note or testimonial page.

## Success Checklist

- Covenant exists in Supabase and StudioNet.
- At least one `create_covenant` transaction hash is visible.
- A GEN bond transaction is visible.
- At least two evidence records are visible in Pacta.
- `request_evaluation` is submitted.
- StudioNet state shows consensus fields after evaluation.

## Fallback Evidence For Review

If StudioNet is slow, submit screenshots of:

- the deployed contract address;
- the live config endpoint;
- the covenant page showing submitted evidence;
- any transaction hash that was returned;
- the contract source showing `gl.nondet.web.get`, `gl.nondet.exec_prompt`, and `_assessments_agree`.
