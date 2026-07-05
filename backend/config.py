import os

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
SIMILARITY_THRESHOLD = float(os.environ.get("SIMILARITY_THRESHOLD", "0.82"))
GEMINI_TIMEOUT_S = 10
EMBED_MODEL = "gemini-embedding-001"
FLASH_MODEL = "gemini-flash-latest"
DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./janvikas.db")

# BACKUP generation provider — any OpenAI-compatible chat API. Defaults to Groq
# serving Llama 3.3 70B. Only used when a Gemini generation call fails AND
# LLM_API_KEY is set. Chat-only (no embeddings), so it backs up labels /
# relations / outbox text, never the embedding+clustering step.
# LLM_MODEL may carry a LiteLLM-style "provider/" prefix (e.g.
# "openai/llama-3.3-70b-versatile"); it is stripped before the raw API call.
LLM_API_KEY = os.environ.get("LLM_API_KEY") or os.environ.get("GROQ_API_KEY", "")
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "https://api.groq.com/openai/v1")
LLM_MODEL = os.environ.get("LLM_MODEL", "llama-3.3-70b-versatile")
