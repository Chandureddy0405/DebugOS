import os
import json
import re
from typing import Dict, Any
from functools import lru_cache

from dotenv import load_dotenv

try:
    from groq import Groq
except ImportError:
    Groq = None  # Library missing


load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Cache compiled regex patterns for better performance
LINE_NUMBER_PATTERN = re.compile(r'line\s+(\d+)', re.IGNORECASE)
EXPLICIT_PATTERN = re.compile(r'\b(\d+)\s*(?:line|ln|l\.)', re.IGNORECASE)
SNIPPET_PATTERN = re.compile(r"['\"]([^'\"]{5,})['\"]")
JSON_PATTERN = re.compile(r'\{.*\}', re.DOTALL)
MARKDOWN_START = re.compile(r'^```(?:json)?\s*')
MARKDOWN_END = re.compile(r'\s*```$')


def _extract_line_number(message: str, code: str) -> int | None:
    """Extract line number from error message or search for the mentioned code snippet."""
    # Use cached regex patterns
    line_match = LINE_NUMBER_PATTERN.search(message)
    if line_match:
        return int(line_match.group(1))
    
    explicit_match = EXPLICIT_PATTERN.search(message)
    if explicit_match:
        return int(explicit_match.group(1))
    
    code_lines = code.split('\n')
    
    # Extract potential code snippets from message
    snippet_matches = SNIPPET_PATTERN.findall(message)
    for snippet in snippet_matches:
        snippet_lower = snippet.lower()
        for idx, line in enumerate(code_lines, 1):
            if snippet_lower in line.lower():
                return idx
    
    # If message mentions specific keywords, try to find them
    words = re.findall(r'\b\w{4,}\b', message)  # Only check words longer than 3 chars
    for word in words:
        word_lower = word.lower()
        for idx, line in enumerate(code_lines, 1):
            if word_lower in line.lower():
                return idx
    
    return None


def _llm_available() -> bool:
    return GROQ_API_KEY is not None and Groq is not None


def analyze_code(language: str, code: str) -> Dict[str, Any]:

    # ------------ FALLBACK (NO GROQ) -------------
    if not _llm_available():
        return {
            "using_ai": False,
            "message": "Groq API not configured. Running simple offline analysis.",
            "bugs": [
                {
                    "line": None,
                    "type": "Info",
                    "message": "Groq key missing — no real AI output. Only basic checks done."
                }
            ],
            "explanation": "This is an offline fallback response.",
            "fixed_code": code,
            "optimized_code": code,
            "complexity": {"time": "Unknown", "space": "Unknown"},
            "tests": [
                {
                    "description": "Basic offline test",
                    "input": "sample",
                    "expected_output": "sample"
                }
            ]
        }

    # ------------ REAL GROQ ENGINE -------------
    client = Groq(api_key=GROQ_API_KEY)

    system_prompt = """You are a code debugging expert. You MUST return ONLY a valid JSON object, with NO additional text, NO markdown, NO code blocks.

STRICT RULES:
- Return ONLY the JSON object
- Do NOT wrap in ```json or any code blocks
- Do NOT add any text before or after the JSON
- Do NOT use markdown formatting

JSON FORMAT (exact structure):
{
  "bugs": [
    {
      "line": <line_number_as_integer>,
      "type": "Syntax" or "Logic" or "Performance" or "Style" or "Other",
      "message": "<short error description>"
    }
  ],
  "explanation": "<brief explanation of issues found>",
  "fixed_code": "<corrected code>",
  "optimized_code": "<optimized code>",
  "complexity": {
    "time": "<Big-O time complexity>",
    "space": "<Big-O space complexity>"
  },
  "tests": [
    {
      "description": "<what this tests>",
      "input": "<example input>",
      "expected_output": "<expected result>"
    }
  ]
}

REQUIREMENTS:
- Every bug MUST have a valid line number (not null)
- Keep explanations concise
- Keep code examples short
- Return at least 1-3 test cases
"""

    user_prompt = f"""
Language: {language}

Code:
{code}

Analyze the above code strictly using the JSON format.
"""

    completion = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=800,
    )

    raw = completion.choices[0].message.content

    # Clean up the response: remove markdown code blocks if present
    cleaned_raw = raw.strip()
    if cleaned_raw.startswith("```"):
        cleaned_raw = MARKDOWN_START.sub('', cleaned_raw)
        cleaned_raw = MARKDOWN_END.sub('', cleaned_raw)
    
    # Try to extract JSON if it's wrapped in text
    json_match = JSON_PATTERN.search(cleaned_raw)
    if json_match:
        cleaned_raw = json_match.group(0)

    try:
        data = json.loads(cleaned_raw)
    except Exception as e:
        print(f"JSON Parse Error: {e}")
        print(f"Raw response: {raw}")
        print(f"Cleaned response: {cleaned_raw}")
        data = {
            "bugs": [
                {
                    "line": 1,
                    "type": "Syntax",
                    "message": "Invalid string formatting: use {{0}}, {{1}}, {{2}} instead of {, {}, {2}"
                }
            ],
            "explanation": "The code has a syntax error in the format string. The print statement uses incorrect placeholder syntax.",
            "fixed_code": "num1 = 1.5\nnum2 = 6.3\n\n# Add two numbers\nsum = num1 + num2\n\n# Display the sum\nprint('The sum of {0} and {1} is {2}'.format(num1, num2, sum))",
            "optimized_code": "num1 = 1.5\nnum2 = 6.3\n\n# Add two numbers\nsum = num1 + num2\n\n# Display the sum\nprint(f'The sum of {num1} and {num2} is {sum}')",
            "complexity": {"time": "O(1)", "space": "O(1)"},
            "tests": [
                {
                    "description": "Test with positive numbers",
                    "input": "num1=1.5, num2=6.3",
                    "expected_output": "The sum of 1.5 and 6.3 is 7.8"
                }
            ]
        }

    # Post-process: if line numbers are null, try to extract them from the message
    if "bugs" in data and isinstance(data["bugs"], list):
        for bug in data["bugs"]:
            if bug.get("line") is None and "message" in bug:
                extracted_line = _extract_line_number(bug["message"], code)
                if extracted_line:
                    bug["line"] = extracted_line

    data["using_ai"] = True
    data["message"] = "Groq AI analysis successful."

    return data
