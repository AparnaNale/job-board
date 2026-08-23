# DATASET_UPDATE.md — Real dataset सोबत कसं वापरायचं (मराठीत)

तुम्ही पाठवलेला sample (SerpApi / Google-Jobs style — `job_id`, `apply_options`,
`company_name`, `via`, `skills`, `domain`, `roles`, `minExperienceRequired`
वगैरे fields असलेला) बघितला. एक चांगली गोष्ट: `backend/scripts/seed_data.py`
हा script आधीच याच shape साठी लिहिलेला होता — त्यामुळे मोठी rewrite करावी
लागली नाही. पण तुमच्या actual data मध्ये काही गोष्टी होत्या ज्यासाठी काही
targeted fixes केले.

## काय बदललं आणि का

### 1. Source detection आता स्वच्छ raहतो ("recruit_net", "simplyhired" असे भरमसाठ values तयार होत नाहीत)

तुमच्या data मध्ये `via` field मध्ये कधी "LinkedIn" येतं, तर कधी "Recruit.net",
"SimplyHired", "Bayt.com", "Jobrapido.com" असे बरेच वेगळे aggregators येतात —
कारण हा dataset मूळचा Google Jobs सारख्या aggregator मधून आलाय, नुसता 4
platforms मधून नाही.

**आधी:** न ओळखलेला platform असेल तर त्याचं नाव slugify करून तसंच ठेवलं
जायचं (उदा. `recruit_net`) — म्हणजे dropdown मध्ये dozen-भर वेगवेगळे values
येऊ शकले असते.

**आता:** LinkedIn / Naukri / Indeed / Internshala याच 4 पैकी काही match
झालं तरच तेच नाव वापरतो; बाकी सगळं एकाच स्वच्छ `"other"` category मध्ये
जातं. मूळ raw value मात्र data-loss टाळण्यासाठी एका नवीन `source_raw` column
मध्ये वेगळी साठवली जाते (हवं तर पुढे कधी वापरता येईल).

📍 `backend/models.py` → `Job.source_raw` नवीन column
📍 `backend/scripts/seed_data.py` → `detect_source_platform()` rewrite

### 2. Apply link आता बरोबर platform शी match होतो

तुमच्या data मध्ये एका job ला अनेक `apply_options` असतात (LinkedIn,
SimplyHired, Bayt.com, Jobrapido — सगळे एकाच jobसाठी वेगवेगळे redirect
links). आधी कोड नेहमी **पहिला** option घ्यायचा, तो योग्य platform चाच
असेल याची खात्री नव्हती.

**आता:** आधी detect झालेल्या platform शी जुळणारा apply option शोधून तोच
link वापरतो; match नाही सापडला तरच पहिला option fallback म्हणून वापरतो.

📍 `backend/scripts/seed_data.py` → `extract_apply_link()`

### 3. "Recent jobs" आता खरंच recent order मध्ये दिसतात

PDF ची पहिलीच ओळ आहे — "aggregates **recent** job opportunities". तुमच्या
data मध्ये `posted_at` field आहे (`"2025/7/14, 23:30"` अशा format मध्ये),
पण आधी तो कुठेच वापरला जात नव्हता.

**आता:**
- नवीन `posted_at` column (DateTime) — dataset ची date parse करून साठवतो
- Job listing आता `posted_at` नुसार (नवीन आधी) sort होते

📍 `backend/models.py` → `Job.posted_at`
📍 `backend/scripts/seed_data.py` → `parse_posted_at()`
📍 `backend/routers/jobs.py` → `order_by(Job.posted_at.desc()...)`

### 4. Skills/tags आता dataset चा `roles` field पण वापरतात

तुमच्या data मध्ये `roles` (उदा. "Data Scientist, Machine Learning
Engineer...") हा वेगळा उपयोगी field आहे, जो आधी वापरलाच जात नव्हता. आता तोही
tags मध्ये merge होतो — AI tagging च्या आधीच काही चांगले signals मिळतात.

📍 `backend/scripts/seed_data.py` → `extract_dataset_tags()`

### 5. Employment type आणि dataset चा मूळ job_id पण आता साठवला जातो

`employmentType` (Full-time/Internship) आणि dataset चा `job_id`
(traceability साठी) आता जॉब कार्ड वर आणि DB मध्ये दिसतात.

📍 `backend/models.py` → `Job.employment_type`, `Job.external_id`
📍 `frontend/components/JobCard.js` → employment type + posted date दाखवतो

### 6. नवीन endpoint — `/api/jobs/meta/sources`

DB मध्ये सध्या प्रत्यक्ष कुठले sources आहेत ते बघण्यासाठी. सध्याचा
frontend (`app/page.js`) आधीच सगळे jobs client-side वर आणून त्यातून
dynamically sources काढतो, त्यामुळे हा नवीन endpoint compulsory नाही, पण
मोठ्या dataset (हजारो jobs) साठी उपयोगी पडेल.

## ⚠️ महत्त्वाचं — आधीच DB बनवलेली असेल तर

जर तुम्ही आधीच `seed_data.py` एकदा चालवून jobs table बनवलेली असेल, तर नवीन
columns (`source_raw`, `posted_at`, `employment_type`, `external_id`)
आपोआप त्यात add होणार **नाहीत** — कारण `Base.metadata.create_all()` फक्त
नवीन table बनवतो, existing table update करत नाही.

**सोपा उपाय (development साठी):** Supabase SQL editor मध्ये जाऊन जुनी टेबल
drop करा आणि script पुन्हा चालवा:
```sql
DROP TABLE IF EXISTS jobs;
```
मग:
```bash
python scripts/seed_data.py --file path/to/real_dataset.json --api-key YOUR_GEMINI_KEY
```

## पुढे काय करायचं

1. तुमचा पूर्ण real dataset JSON file म्हणून डाउनलोड करा (drive link वरून)
2. वरचं `DROP TABLE` करा (जर आधी टेबल बनवली असेल)
3. `python scripts/seed_data.py --file <तुमची file> --api-key <तुमची Gemini key>` चालवा
4. Terminal मध्ये शेवटी दिसणारा `Inserted / Skipped duplicates / Skipped
   incomplete` count बघा — हे evaluator ला explain करण्यासाठी उपयोगी आहे
5. Frontend चालू करून dropdown मध्ये platforms + "other" व्यवस्थित दिसतायत
   का, आणि jobs latest-first दिसतायत का ते तपासा
