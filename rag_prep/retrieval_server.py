"""
FastAPI retrieval server — loads the FAISS index and nomic-embed-text-v1.5 once,
then serves semantic chunk lookups at POST /retrieve.

Start:  uvicorn rag_prep.retrieval_server:app --port 8000 --reload
    or: python rag_prep/retrieval_server.py
"""

import json
import pathlib
import sys

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── paths ─────────────────────────────────────────────────────────────────────
BASE        = pathlib.Path(__file__).parent
INDEX_FILE  = BASE / "data/embeddings/index.faiss"
META_FILE   = BASE / "data/embeddings/metadata.jsonl"

MODEL_NAME  = "nomic-ai/nomic-embed-text-v1.5"
QUERY_PREFIX = "search_query: "

# ── load deps ─────────────────────────────────────────────────────────────────
try:
    import torch
    import torch.nn.functional as F
    from transformers import AutoTokenizer, AutoModel
    import faiss
except ImportError:
    print("Missing deps. Run:  pip install torch transformers faiss-cpu fastapi uvicorn")
    sys.exit(1)

# ── device ────────────────────────────────────────────────────────────────────
if torch.backends.mps.is_available():
    DEVICE = "mps"
elif torch.cuda.is_available():
    DEVICE = "cuda"
else:
    DEVICE = "cpu"

# ── load model (once at import) ───────────────────────────────────────────────
print(f"Loading {MODEL_NAME} on {DEVICE}…", flush=True)
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
model     = AutoModel.from_pretrained(MODEL_NAME, trust_remote_code=True).to(DEVICE)
model.eval()
print("✓ Model ready", flush=True)

# ── load FAISS index ──────────────────────────────────────────────────────────
if not INDEX_FILE.exists():
    print(f"✗ {INDEX_FILE} not found — run 07_embed.py first", flush=True)
    sys.exit(1)

index = faiss.read_index(str(INDEX_FILE))
print(f"✓ FAISS index  — {index.ntotal} vectors, dim {index.d}", flush=True)

# ── load metadata ─────────────────────────────────────────────────────────────
if not META_FILE.exists():
    print(f"✗ {META_FILE} not found — run 07_embed.py first", flush=True)
    sys.exit(1)

metadata: list[dict] = []
with open(META_FILE, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            metadata.append(json.loads(line))
print(f"✓ Metadata     — {len(metadata)} chunks\n", flush=True)

# ── helpers ───────────────────────────────────────────────────────────────────
def embed_query(text: str) -> np.ndarray:
    enc = tokenizer(
        QUERY_PREFIX + text,
        padding=True,
        truncation=True,
        max_length=512,
        return_tensors="pt",
    ).to(DEVICE)
    with torch.no_grad():
        out = model(**enc)
    mask = enc["attention_mask"].unsqueeze(-1).expand(out.last_hidden_state.size()).float()
    vec  = (out.last_hidden_state * mask).sum(1) / mask.sum(1).clamp(min=1e-9)
    vec  = F.normalize(vec, p=2, dim=1)
    return vec.cpu().numpy().astype(np.float32)

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="REEtrieve Retrieval Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

class RetrieveRequest(BaseModel):
    query: str
    k:     int = 7

class Chunk(BaseModel):
    source:      str | None
    source_type: str | None
    year:        int | None
    url:         str | None
    page:        int | None
    text:        str
    score:       float

@app.post("/retrieve", response_model=list[Chunk])
def retrieve(req: RetrieveRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")

    k   = max(1, min(req.k, index.ntotal))
    vec = embed_query(req.query)

    scores, indices = index.search(vec, k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(metadata):
            continue
        chunk = metadata[idx]
        results.append(Chunk(
            source      = chunk.get("source"),
            source_type = chunk.get("source_type"),
            year        = chunk.get("year"),
            url         = chunk.get("url"),
            page        = chunk.get("page"),
            text        = chunk.get("text", ""),
            score       = float(score),
        ))

    return results

@app.get("/health")
def health():
    return {"status": "ok", "vectors": index.ntotal, "chunks": len(metadata)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("retrieval_server:app", host="0.0.0.0", port=8000, reload=False)
