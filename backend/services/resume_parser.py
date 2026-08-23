"""
Resume text extraction (PDF / DOCX) + profile extraction.

Two extraction paths:
1. AI-based (extract_profile_ai) -- if the user supplies a Gemini API key,
   the resume text is sent to Gemini and a richer profile (skills,
   experience_summary, experience_level) is returned. This satisfies the
   PDF's "AI/LLM-based resume analysis" expectation (page 5).
2. Rule-based (extract_profile) -- deterministic keyword/synonym matching,
   used automatically when no key is provided or the AI call fails for any
   reason (invalid key, quota, network error, bad JSON). This keeps the
   feature usable and crash-proof even without an API key.

Whichever path runs, the *scoring* against jobs (services/recommender.py)
stays deterministic overlap-scoring -- that part is intentionally kept
explainable per the assignment's requirement, only the *skill extraction*
step gets an AI option.
"""
import io
import json
import re
import pdfplumber
import docx

from services.gemini_client import call_gemini

RESUME_PROMPT = """You are extracting a structured candidate profile from a resume.
Return ONLY valid JSON, no markdown, no extra text, in this exact shape:
{{
  "skills": ["Python", "SQL", ...],
  "experience_summary": "one or two sentence summary of the candidate's background",
  "experience_level": "fresher" | "junior" | "mid" | "senior"
}}

Resume text:
\"\"\"{resume_text}\"\"\"
"""


def extract_text(filename: str, file_bytes: bytes) -> str:
    if filename.lower().endswith(".pdf"):
        text = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                text.append(page.extract_text() or "")
        return "\n".join(text)

    if filename.lower().endswith((".docx", ".doc")):
        document = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in document.paragraphs)

    raise ValueError("Unsupported file type. Please upload a PDF or DOCX file.")


def normalize_skill(skill: str) -> str:
    """
    Strips casing/punctuation/spacing differences down to a canonical
    lowercase key, so 'Node.js' == 'nodejs' == 'Node JS'. Used by both
    extraction (here) and scoring (recommender.py) so the two stay
    consistent.
    """
    return re.sub(r"[^a-z0-9+]+", "", skill.lower())


# Canonical skill name -> known variant spellings/synonyms seen in resumes
# and job descriptions. Both extraction and scoring normalize against this
# table, so 'ML' in a resume matches 'Machine Learning' in a job tag.
SKILL_SYNONYMS = {
    "Python": ["python", "python3"],
    "SQL": ["sql", "mysql", "postgresql", "postgres", "plsql", "t-sql"],
    "Java": ["java"],
    "JavaScript": ["javascript", "js", "es6"],
    "TypeScript": ["typescript", "ts"],
    "React": ["react", "reactjs", "react.js"],
    "Next.js": ["next.js", "nextjs", "next js"],
    "Node.js": ["node.js", "nodejs", "node js", "node"],
    "FastAPI": ["fastapi", "fast api"],
    "Django": ["django"],
    "Flask": ["flask"],
    "Machine Learning": ["machine learning", "ml"],
    "Deep Learning": ["deep learning", "dl"],
    "Generative AI": ["generative ai", "genai", "gen ai"],
    "LLM": ["llm", "llms", "large language model", "large language models"],
    "RAG": ["rag", "retrieval augmented generation"],
    "Agentic AI": ["agentic ai", "ai agents", "ai agent"],
    "AWS": ["aws", "amazon web services"],
    "Docker": ["docker"],
    "Kubernetes": ["kubernetes", "k8s"],
    "Excel": ["excel", "ms excel", "microsoft excel"],
    "Power BI": ["power bi", "powerbi"],
    "Tableau": ["tableau"],
    "HTML": ["html", "html5"],
    "CSS": ["css", "css3"],
    "MongoDB": ["mongodb", "mongo"],
    "Data Analysis": ["data analysis", "data analytics"],
    "NLP": ["nlp", "natural language processing"],
    "C++": ["c++", "cpp"],
    "C#": ["c#", "csharp"],
    "Git": ["git", "github", "gitlab"],
    "REST API": ["rest api", "restful api", "rest apis"],
    "Data Structures": ["data structures", "dsa"],
    "Pandas": ["pandas"],
    "NumPy": ["numpy"],
    "TensorFlow": ["tensorflow"],
    "PyTorch": ["pytorch"],
    "Vector Databases": ["vector database", "vector databases", "vector db", "pinecone", "faiss", "chromadb"],
    "Communication": ["communication skills", "communication"],
    "Leadership": ["leadership"],
}

# Fast reverse lookup: normalized variant -> canonical skill name.
_VARIANT_TO_CANONICAL = {
    normalize_skill(variant): canonical
    for canonical, variants in SKILL_SYNONYMS.items()
    for variant in variants + [canonical]
}


def extract_skills_from_text(text: str) -> list:
    """
    Extracts canonical skill names from resume/job-description text using
    word-boundary + synonym-aware matching (regex-escaped, so special
    characters like 'C++' are handled safely).
    """
    found = []
    for canonical, variants in SKILL_SYNONYMS.items():
        for variant in variants:
            pattern = r"(?<![a-zA-Z0-9])" + re.escape(variant) + r"(?![a-zA-Z0-9])"
            if re.search(pattern, text, re.IGNORECASE):
                found.append(canonical)
                break
    return found


def guess_experience_level(text: str) -> str:
    lowered = text.lower()
    if re.search(r"\bfresher\b|\bno experience\b|\bentry[- ]level\b", lowered):
        return "fresher"
    years = re.findall(r"(\d+)\+?\s*(?:years|yrs)\s*(?:of)?\s*experience", lowered)
    if years:
        max_years = max(int(y) for y in years)
        if max_years == 0:
            return "fresher"
        if max_years <= 2:
            return "junior"
        if max_years <= 5:
            return "mid"
        return "senior"
    return "unspecified"


def extract_profile(resume_text: str) -> dict:
    """
    Rule-based path -- no API key needed. Fully deterministic, so the same
    resume always produces the same result. Used as the fallback when no
    Gemini key is supplied, or when the AI call fails for any reason.
    """
    skills = extract_skills_from_text(resume_text)
    return {
        "skills": skills,
        "experience_summary": "",
        "experience_level": guess_experience_level(resume_text),
    }


def _extract_json(raw: str) -> dict:
    """Gemini sometimes wraps the response in ```json fences -- strip those before parsing."""
    cleaned = re.sub(r"```json|```", "", raw).strip()
    return json.loads(cleaned)


async def extract_profile_ai(resume_text: str, api_key: str) -> dict:
    """
    AI-based path -- sends the resume text to Gemini and asks for a
    structured profile. Skills are normalized against the same
    SKILL_SYNONYMS table used by the rule-based extractor and the
    recommender, so scoring stays consistent regardless of which
    extraction path produced the skill list.

    Any failure here (bad JSON, network error, invalid key) should be
    caught by the caller (routers/resume.py), which falls back to
    extract_profile() -- this function does not swallow errors itself.
    """
    prompt = RESUME_PROMPT.format(resume_text=resume_text[:6000])
    raw = await call_gemini(prompt, api_key)
    parsed = _extract_json(raw)

    raw_skills = parsed.get("skills", []) or []
    canonical_skills = []
    for skill in raw_skills:
        canonical = _VARIANT_TO_CANONICAL.get(normalize_skill(skill))
        canonical_skills.append(canonical or skill)

    return {
        "skills": list(dict.fromkeys(canonical_skills)),  # dedupe, keep order
        "experience_summary": parsed.get("experience_summary", ""),
        "experience_level": parsed.get("experience_level", "unspecified"),
    }