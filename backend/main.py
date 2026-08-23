"""
FastAPI entrypoint. All routers are mounted here.
Run: uvicorn main:app --reload
"""
import os
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from database import Base, engine
from routers import jobs, resume, chat, auth, saved_jobs

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Job Board API")

origins = [os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Without this, an unhandled exception can abort the connection before
    # any response -- CORS headers included -- gets sent, which shows up
    # in the browser as a misleading "blocked by CORS policy" error
    # instead of the real 500. This guarantees a real (CORS-safe) JSON
    # response every time, and prints the actual traceback here in the
    # backend terminal so the real cause is visible.
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on the server. Check the backend terminal for details."},
    )


app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(resume.router)
app.include_router(chat.router)
app.include_router(saved_jobs.router)


@app.get("/")
def health():
    return {"status": "ok", "service": "ai-job-board-backend"}
