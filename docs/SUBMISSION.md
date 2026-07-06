# Pacta Submission Notes

## Recommended Demo Scope

Use the mentorship covenant scenario for submission:

- Promise: mentor five students over 90 days.
- Bond: creator stakes StudioNet GEN.
- Evidence: public repository links, public calendar/session links where available, signed student attestations, and summary notes.
- Evaluation: GenLayer validators fetch public URLs, interpret ambiguous evidence with LLMs, and settle the covenant through consensus.

## Why This Uses GenLayer

Pacta uses GenLayer for the part ordinary smart contracts cannot handle well: evaluating ambiguous real-world evidence. The contract performs nondeterministic web reads and LLM analysis inside `request_evaluation`, then stores deterministic settlement only after consensus returns.

## Reviewer Concern Response

If a reviewer says the use case is too broad, frame the submission around mentorship delivery guarantees. The general registry remains extensible, but the demo path is specific.

If a reviewer says evidence links are not fetched in the contract, point to `contracts/pacta_covenant_registry.py`: `request_evaluation` extracts public evidence URLs and fetches them with `gl.nondet.web.get()` inside the nondeterministic block.

If a reviewer says consensus is shallow, point to the upgraded validator path: validators independently rerun the fetch-and-assess workflow and compare status, confidence, and bond distribution before accepting the leader assessment.

## Remaining Operational Step

After this contract source is deployed in GenLayer Studio, update the frontend environment variables with the new contract address and redeploy Vercel. The currently deployed address still points to the previous contract until that redeploy happens.
