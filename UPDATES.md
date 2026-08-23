# UPDATES.md — काय बदललं आणि का (मराठीत)

हा document मागच्या review मध्ये सापडलेल्या सगळ्या issues च्या fixes explain करतो. प्रत्येक fix कुठल्या file मध्ये आहे आणि का गरजेचं होतं ते खाली दिलंय.

---

## 🔴 Fix 1 — Security: leaked database password

**Problem:** `backend/.env` मध्ये तुमचा खरा Supabase database password plain text मध्ये committed होता, आणि संपूर्ण project मध्ये `.gitignore` फाईलच नव्हती. म्हणजे GitHub वर push केल्यावर तो password सगळ्यांना दिसला असता — PDF च्या "Security Requirement" चं थेट उल्लंघन (page 6).

**काय केलं:**
- Root ला `.gitignore` फाईल बनवली — यात `backend/.env`, `__pycache__/`, `node_modules/`, `.next/` सगळं ignore केलंय
- `backend/.env` मधला खरा password काढून टाकून placeholder टाकला
- आधीच commit झालेल्या `__pycache__/*.pyc` फाईल्स delete केल्या

**⚠️ तुम्हाला स्वतः करावं लागेल (मी करू शकत नाही):**
Supabase dashboard मध्ये जाऊन (**Project Settings → Database**) हा password **आत्ताच rotate/reset करा** — जुना password आता compromised समजा, कारण तो या conversation मध्ये उघड झालाय. Reset केल्यावर नवीन password फक्त तुमच्या local `.env` फाईलमध्ये टाका (जी आता git-ignored आहे, त्यामुळे सुरक्षित राहील).

---

## 🟠 Fix 2 — Resume upload खरंच AI (Gemini) वापरत नव्हता

**Problem:** `frontend/lib/api.js` मधलं `uploadResume(file)` फक्त resume file पाठवत होतं, `apiKey` कधीच पाठवत नव्हतं. Backend ला AI-based profile extraction साठी `gemini_api_key` लागतो — तो न मिळाल्याने प्रत्येक upload फक्त 28 hardcoded skills च्या साध्या keyword-list वर चालत होता. म्हणजे PDF ची "AI/LLM-based resume analysis" requirement (page 5) प्रत्यक्षात कधीच trigger होत नव्हती.

**काय बदललं:**
- `frontend/lib/api.js` → `uploadResume(file, apiKey)` — आता दुसरा parameter म्हणून apiKey घेतो आणि `gemini_api_key` field मध्ये backend ला पाठवतो
- `frontend/components/ResumeUpload.js` → एक नवीन input field add केलं जिथे user त्याची Gemini API key टाकू शकतो, आणि ती upload सोबत पाठवली जाते

आता Resume page वर key टाकून upload केल्यास खरा Gemini call होईल; key रिकामी ठेवली तर आधीसारखा graceful fallback (keyword-matching) चालेल — crash होणार नाही.

---

## 🟠 Fix 3 — एकाच dataset मधले duplicate jobs पकडले जात नव्हते

**Problem:** `backend/database.py` मधला DB session `autoflush=False` वर आहे. `scripts/seed_data.py` मध्ये संपूर्ण loop नंतर एकदाच `db.commit()` होत होता — म्हणजे loop च्या आत duplicate-check करणारी query आधीच्या (त्याच run मधल्या, अजून uncommitted) records बघूच शकत नव्हती. निकाल: **एकाच dataset मध्ये असलेले duplicates dedupe होतच नव्हते** — फक्त मागच्या run मधले जुने duplicates पकडले जात होते.

**काय बदललं:**
`backend/scripts/seed_data.py` मध्ये प्रत्येक job insert केल्यावर `db.flush()` add केलं — यामुळे तो record लगेच (commit न करता) DB ला दिसतो, आणि पुढच्या iteration मधली duplicate-check ती बरोबर ओळखते.

```python
db.add(job)
db.flush()   # <-- नवीन line: लगेच DB ला flush कर, जेणेकरून पुढचा duplicate check बरोबर चालेल
inserted += 1
```

---

## 🟡 Fix 4 — Test dataset (`sample_jobs.json`) ची shape script शी जुळत नव्हती

**Problem:** `seed_data.py` actual dataset मध्ये `via`, `apply_options`, `company_name`, `minExperienceRequired` अशी fields गृहीत धरतो. पण जुनी `sample_jobs.json` वेगळ्याच shape मध्ये होती (`source`, `link`, `company`). यामुळे या sample file ने test केलं असतं तर **सगळे jobs चुकीने "other" platform मध्ये गेले असते आणि apply link रिकामा राहिला असता** — LinkedIn/Naukri/Indeed/Internshala dropdown रिकामाच दिसला असता.

**काय बदललं:**
`backend/scripts/sample_jobs.json` पूर्ण रीलिहिली — आता ती `seed_data.py` ला हवी तीच shape (`via`, `apply_options` JSON-string, `company_name`, `skills`, `domain`, `minExperienceRequired`) वापरते, आणि एक intentional duplicate entry पण add केलीये जेणेकरून तुम्ही dedup logic लगेच टेस्ट करू शकाल.

---

## ✅ पुढे काय करायचं (submit करण्याआधी checklist)

1. Supabase DB password rotate करा (वर सांगितल्याप्रमाणे)
2. `python scripts/seed_data.py --file scripts/sample_jobs.json --api-key YOUR_KEY` चालवून बघा — आता 4 जॉब्स योग्य platform खाली दिसायला हवेत, आणि 5वा (duplicate) skip व्हायला हवा
3. खरा PDF मधला dataset डाउनलोड करून त्यावर seed script चालवा
4. Resume page वर Gemini key टाकून upload test करा — आता खरा AI profile यायला हवा
5. Backend (Render) + Frontend (Vercel) deploy करा, README मधले placeholder links भरा
6. शेवटी `git status` करून खात्री करा की `.env` कुठेही staged नाहीये
