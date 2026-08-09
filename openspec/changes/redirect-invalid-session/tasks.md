## 1. Add session existence check

- [x] 1.1 In `app/(app)/session/[id]/page.tsx`: import `useSession`, `useRouter`, and `useEffect` (already imported). Call `useSession(params.id as string)`.
- [x] 1.2 Add useEffect: if `isError` is true, call `router.replace("/")`
- [x] 1.3 Return `null` while `isLoading` is true

## 2. Verification

- [x] 2.1 Run `npx prettier --check` on the modified file
- [ ] 2.2 Manual test: navigate to `/session/fake-id`, confirm redirect to `/`
- [ ] 2.3 Manual test: navigate to a real session, confirm it loads normally
