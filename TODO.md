# TODO

- [ ] Fix payment failure: make frontend send the fields backend expects (`card_last4`, `card_holder`) or adjust backend to match frontend.
- [ ] Improve frontend error handling to display backend error message (from `error.response.data.error`).
- [ ] Add server-side logging around `/api/bills/pay` to expose the real failing reason on Render.
- [ ] Rebuild and redeploy frontend + backend, then verify payment flow end-to-end.

