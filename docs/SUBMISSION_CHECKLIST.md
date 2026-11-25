# Submission checklist

## Before you submit
- [ ] Backend runs locally: `uvicorn app.main:app --reload --port 8000`, then open http://localhost:8000/docs
- [ ] `python -m pytest` passes in `backend/`
- [ ] Add your real values in `backend/.env` (never upload this file)
- [ ] Firebase project created: Authentication (Email/Password) and Firestore turned on
- [ ] Backend deployed on Vercel, `AUTH_DISABLED=false`, `ALLOWED_ORIGINS` includes your Firebase address
- [ ] `frontend/js/config.js` filled in, then `firebase deploy --only hosting,firestore:rules`
- [ ] Your email is in `ADMIN_EMAILS`, and the Admin page opens after login
- [ ] One full test: sign up, upload CSV, run the agents, submit a payment, approve it as admin

## Screenshots to take (for the report, PPT and GitHub README)
1. Landing page and pricing
2. Login page
3. Dashboard with KPIs and charts
4. Mistake warning (March expenses)
5. Agent room with the three agents
6. Report page
7. Insights (forecast and what-if)
8. Assistant bot answering in Roman Urdu
9. Billing page and the payment window
10. Admin payments page
11. Postman or /docs page showing the API

## Files to hand in
- GitHub repository link (the whole `bizpilot-ai` folder, without `.env`)
- Live website link and live API link
- `docs/BizPilot_AI_Presentation.pptx`
- Report as Word or PDF (export from the report document)
- Short demo video (optional but helpful)

## Before presenting
- Replace the placeholder JazzCash and Easypaisa numbers in `frontend/index.html` (search for `03XX`)
- Update the Testing section of the report with your end-to-end test result
- Decide your final prices in `backend/app/plans.py`, the PPT and the report so all three match
