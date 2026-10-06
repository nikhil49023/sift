# Groq, TypeSafe Jev, and Laya in SIFT

Jev is TypeSafe AI's decision model. It is not an acronym for SIFT's rubric and is not a model supplied by Groq. Earlier project terminology confused these two layers; the application now labels the rubric as SIFT's own. The `backend/src/jev/` directory keeps its existing path for the team's handoff.

## Implemented provider selection

The default is `DECISION_PROVIDER=none`. Groq proposes rubric levels, explanations and citations; SIFT mechanically checks those citations. TypeSafe is not called, even if `TYPESAFE_API_KEY` is present. These results are labelled as Groq assessments without Jev review.

To request TypeSafe's separate verification API:

```env
DECISION_PROVIDER=typesafe
TYPESAFE_API_KEY=configure_in_ignored_env_or_server_secrets
TYPESAFE_MODEL=jev-latest
JEV_SUPPORT_THRESHOLD=0.8
JEV_MAX_REQUEST_CHARS=64000
```

Jev receives captured cited sources, coverage and atomic Noul questions. For each scored dimension it separately checks factual support and whether the proposed level matches its rubric anchor. Summary support and optional role fit have their own questions. Noul returns the probability of yes; it is not the separate confidence field used by Choice and Score. [TypeSafe primitives](https://docs.typesafe.ai/primitives/noul).

A low support probability withholds the affected level. An unsupported summary withholds engineering scores. Unsupported role fit is removed independently from the engineering score. The default 0.8 threshold is provisional; Harika owns human-labelled calibration and both owners must approve ranking rollout. Model probabilities and typed outputs do not prove factual correctness. Reviewers still make hiring and jury decisions.

The worker saves the validated Groq proposal before calling Jev. Transient Jev retries reuse it. Missing keys, invalid credentials, exhausted credit, or exhausted retries produce an unscored partial audit with retained proposal citations. Requests have character and question limits, and response validation rejects missing answers or probabilities outside 0–1. Actual resolved model names and support probabilities are retained in the assessment and PDF.

TypeSafe requires a separate account key and credit balance. Promotional credits are discretionary. Its published launch price is $0.042 per million input tokens; output tokens are currently free. Confirm the price and balance in your account before enabling it. [Credit terms](https://typesafe.ai/legal/mca), [published pricing](https://typesafe.ai/blog/introducing-system-one-models-and-jev).

## Laya option

Laya is Convai Innovations' Apache-2.0 decision model with open weights. It supports choice, score and yes/no decisions and can serve a Jev-compatible `/v1/systemone` endpoint. Self-hosting does not require TypeSafe credits, but compute and operation still have a cost. [Laya repository](https://github.com/NandhaKishorM/laya).

The standard English checkpoint has a 512-token context, the typed-decisions checkpoint 1,024, and the multilingual checkpoint 1,024 with a documented extension up to 8k. These are checkpoint-specific limits, not a reason to feed a full repository into it. [Model card](https://huggingface.co/convaiinnovations/laya).

The CPU Docker quickstart asks for 8 GB RAM and 10 GB disk. That does not fit the current 2 GB Render worker as configured. Use a separate inference service or a local experiment; measure your selected checkpoint and workload before sizing production. [Docker guide](https://github.com/NandhaKishorM/laya/blob/main/docs/docker.md).

Laya is researched, but it is not installed or connected to SIFT. A useful first experiment would judge one compact evidence claim at a time using exact tokenizer limits, compare it with human-labelled code-forensics cases, and report truncation and disagreement rates. Only then should it become an optional verifier. Do not treat a compatible API as proof that Jev and Laya produce equivalent judgments.

## Deployment recommendation

Use Groq first for the hosted demo. Keep Jev opt-in while account credits and calibration are pending. Evaluate Laya separately if avoiding recurring decision API charges or specialising on SIFT's labelled evidence is the priority. No complete backend rewrite is needed: ingestion, forensics, tenant isolation, durable jobs and report storage are independent of the decision provider.

Rankings remain off. When enabling TypeSafe rankings, use a pinned model name returned by `/v1/models`, not the moving `jev-latest` alias. Ranking eligibility compares actual generator and verifier models, rubric, prompt, verification version, threshold and provider mode; older Groq-only assessments are not mixed with Jev-reviewed assessments.
