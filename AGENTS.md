<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Client personal data (name, phone, email, company) lives only in `client_pii`, AES-GCM encrypted in server code (`src/lib/crypto.server.ts`); never store it in plaintext — 152-FZ compliance.
- All text sent to the AI goes through `maskPII`/`maskDeep` (`src/lib/pii.ts`) and real values are substituted with `fillDeep` only when serving the offer — PII must never reach the AI.
- Public brief/offer pages read data via token-checked server functions using the admin client; decrypted contacts are returned only via the secret offer token at display time (never stored in AI output) — tokens are the only access control.
- Every AI call passes `guardAI` (final `assertNoPII` check + masked-input record in `ai_audit`); a detected leak blocks the request.
- Admin access is checked via `has_role` on `user_roles`; first signed-up user becomes admin via trigger.
