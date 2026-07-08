# Pacta Submission Notes

## Recommended Demo Scope

Submit Pacta as a bonded mentorship covenant verifier, not as a broad promise registry. The app remains extensible, but this focused path is the strongest GenLayer demonstration.

## One-Line Pitch

Pacta is a bonded mentorship covenant verifier powered by GenLayer web evidence fetching, LLM assessment, and validator consensus.

## Live Links

- Production app: https://pacta-protocol.vercel.app
- Reviewer page: https://pacta-protocol.vercel.app/submission
- GitHub: https://github.com/Hilda26/Pacta
- StudioNet contract: `0xeBb262198DE067bf73cdAdF6d1C9f211cb1AF1a2`
- Live config endpoint: https://pacta-protocol.vercel.app/api/genlayer/config

## Demo Covenant

Use this covenant for review:

- Title: `Manual Test - Mentorship Covenant`
- Promise: `I will mentor five students over the next 90 days by holding weekly online mentoring sessions and reviewing their learning progress.`
- Success criteria: `At least five students receive mentoring, each student attends at least three sessions, and each student submits feedback confirming the mentoring was useful.`
- Evidence requirements: `Submit public project links, public session summaries, student attestations, repository activity, and validator notes.`
- Privacy: `PUBLIC`
- Required bond: `10` GEN or the smallest amount StudioNet allows for your wallet.

## Evidence Examples

Use public URLs whenever possible because the Intelligent Contract fetches `http/https` evidence links during evaluation.

Recommended evidence package:

1. Public GitHub repository or pull request showing mentorship-related work.
2. Public project page, published notes, or session recap.
3. Public student testimonial or signed attestation.
4. Public artifact showing student progress after mentorship.

For each evidence item, add a short validator note explaining which success criterion it supports.

## Manual Test Path

1. Visit https://pacta-protocol.vercel.app/submission and confirm the contract address is `0xeBb262198DE067bf73cdAdF6d1C9f211cb1AF1a2`.
2. Sign in with one EVM wallet extension active.
3. Create the demo mentorship covenant.
4. Click `Create on StudioNet` and confirm the wallet transaction.
5. Bond GEN as the creator.
6. Submit at least two public evidence URLs.
7. Request evaluation.
8. Refresh StudioNet state and look for `fetched_url_count`, `independent_sources_count`, `cross_check_summary`, `risk_flags`, and `source_checks`.

## Why This Uses GenLayer

Pacta uses GenLayer for the part ordinary smart contracts cannot handle well: evaluating ambiguous real-world evidence. The contract performs nondeterministic web reads and LLM analysis inside `request_evaluation`, then stores deterministic settlement only after consensus returns.

## Reviewer Concern Response

If a reviewer says the use case is too broad, frame the submission around mentorship delivery guarantees. The general registry remains extensible, but the demo path is specific.

If a reviewer says evidence links are not fetched in the contract, point to `contracts/pacta_covenant_registry.py`: `request_evaluation` extracts public evidence URLs and fetches them with `gl.nondet.web.get()` inside the nondeterministic block.

If a reviewer says consensus is shallow, point to the upgraded validator path: validators independently rerun the fetch-and-assess workflow and compare status, confidence, and bond distribution before accepting the leader assessment.

## Screenshots To Capture Before Submission

- `/submission` reviewer page showing the live contract address.
- Covenant detail page after `Create on StudioNet` shows a transaction hash.
- Evidence section showing public evidence URLs.
- StudioNet state showing `source_checks` and `cross_check_summary` after evaluation.
- GenLayer portal or Studio transaction page for the latest transaction hash.
