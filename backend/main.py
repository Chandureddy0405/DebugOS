
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any

from ai_engine import analyze_code

app = FastAPI(
    title="AI Code Debugging Playground",
    description="Simple API for analyzing   and debugging code with AI.",
    version="1.0.0"
)


# Allow frontend (running from file or localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # For development; you can restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DebugRequest(BaseModel):
    language: str
    code: str


@app.get("/")
def root():
    return {"status": "ok", "message": "AI Code Debugging Playground API"}


@app.post("/api/debug")
def debug_code(payload: DebugRequest) -> Dict[str, Any]:
    """
    Accepts code + language, returns AI analysis.
    """
    result = analyze_code(payload.language, payload.code)
    return result
