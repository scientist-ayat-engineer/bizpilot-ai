## 🚀 BizPilot AI v1.0.0: First Public Release

**Know your shop's profit in 60 seconds.** BizPilot AI turns a small shop's monthly sales and expenses into a clear, plain-language profit report, written by a team of three AI agents.

🔗 **Live demo:** https://bizpilot-ai-794a0.web.app
📡 **API docs:** https://bizpilot-ai-rho.vercel.app/docs

---

### ✨ Highlights

- 🤖 **Three-agent analysis** with AutoGen: Business Manager, Data Analyst and Executive Agent discuss your numbers and write the report.
- 📡 **Live agent room:** agent messages stream to the browser as they are written.
- 📊 **KPI dashboard** with sales, expenses, profit, margin and best month, plus charts.
- 🛡️ **Mistake catcher:** unusual expenses (for example an extra zero) are flagged with a suggested fix.
- 🔮 **Forecast and what-if simulator** for the next 3 months.
- 💬 **Assistant bot** that answers in English or Roman Urdu.
- 📄 **Executive reports** with PDF export and saved history.
- 🔐 **Firebase login** and an **admin page** to approve payments.
- 💳 **Plans:** Free (3 reports a month), Pro (30) and Business (unlimited), with a JazzCash, Easypaisa and bank transfer payment flow.

### 🧱 What's included

| Part | Details |
|---|---|
| **Backend** | FastAPI, AutoGen on Groq (`openai/gpt-oss-120b`), Firebase Auth, Firestore |
| **Frontend** | HTML, CSS and JavaScript with a dark futuristic design, no build step |
| **Hosting** | Backend on Vercel, frontend on Firebase Hosting |
| **Docs** | Presentation, project report, setup guide in the README |

### 🔧 Improvements over the class code

- Agent names now use valid Python identifiers (`Business_Manager`, and so on).
- Correct Groq `base_url` and model id.
- Termination condition fixed so the Executive Agent can speak.
- Totals, margins and forecasts are calculated in Python, and the agents only explain them.
- Data mistakes are detected by code instead of silently ruining the report.

### ▶️ Quick start

See the [README](../../blob/main/README.md) for full instructions. In short: clone the repo, add your Groq key and Firebase settings, run the backend with `uvicorn app.main:app --reload --port 8000`, and open `frontend/index.html` with Live Server.

### ⚠️ Known limitations

- Payments are verified manually by an admin.
- The forecast is a simple straight-line trend and does not model seasons.
- No team workspaces yet.

### 🗺️ Coming next

Google Sheets import, weekly email and WhatsApp reports, an Urdu interface, team workspaces and more agents (Marketing, Risk).

### 📎 Attached files

- `BizPilot_AI_Presentation.pptx`: project presentation
- Project report (PDF)

---

Built by **Anushay Ayat**, AI and Data Science student at SMIT. If you find this useful, please give the repo a ⭐
