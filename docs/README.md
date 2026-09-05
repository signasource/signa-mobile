# signa-mobile knowledge base

> Responsibility: retrieval map — which doc answers which question.
> Update when: a doc is added, renamed, or moved.
> Sources: this docs/ tree

Detailed implementation docs for `signa-mobile`. Entry point and mandatory rules: [`../CLAUDE.md`](../CLAUDE.md).

## Map

| Question | Doc |
|---|---|
| How is the code organized? How does the app boot? | [architecture.md](./architecture.md) |
| What are the routes/navigators? How do I add a screen? | [navigation.md](./navigation.md) |
| How does the HTTP client behave? How is env configured? | [api/http-client.md](./api/http-client.md) |
| What endpoints exist? | [api/endpoints.md](./api/endpoints.md) |
| What are the DTO shapes? | [api/types.md](./api/types.md) |
| Where are tokens / identity / profile stored? | [api/session-persistence.md](./api/session-persistence.md) |
| What is the `useAuth()` contract and session lifecycle? | [authentication/auth-context.md](./authentication/auth-context.md) |
| What does each auth screen do? | [authentication/screens.md](./authentication/screens.md) |
| What are the validation rules? | [authentication/validation.md](./authentication/validation.md) |
| What color tokens exist? | [design-system/colors.md](./design-system/colors.md) |
| What fonts / sizes exist? | [design-system/typography.md](./design-system/typography.md) |
| What UI primitives exist? | [design-system/components.md](./design-system/components.md) |
| State of onboarding / courses / social / ml? | [features/onboarding.md](./features/onboarding.md) · [features/courses.md](./features/courses.md) · [features/social.md](./features/social.md) · [features/ml.md](./features/ml.md) |
| What is real vs stub? What is the tech debt? | [status.md](./status.md) |

## Rules for these docs

- **Docs are code:** update the relevant doc in the **same commit** as the code change. Change→doc router: [`../CLAUDE.md`](../CLAUDE.md).
- **One responsibility per doc.** Each doc opens with a `Responsibility / Update when / Sources` header.
- **Split by update trigger, not by size.** Concerns that change on different triggers live in different files (`api/` is split; `navigation.md` stays whole because its parts change together).
- **Single source of truth.** Do not duplicate a fact across docs — link to its canonical doc. If a doc contradicts the code, **the code wins**: fix the doc. `Sources` names the files to re-read.
- **Language:** English for docs and identifiers; Spanish for user-facing UI copy.
