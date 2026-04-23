"""
Step 3 — Embedding.
Reads data/chunks/chunks.jsonl, embeds with nomic-embed-text-v1.5 via transformers
(no sentence-transformers / datasets / pyarrow dependency), writes FAISS index.
"""

import json, pathlib, sys
import numpy as np

# ── config ────────────────────────────────────────────────────────────────────
CHUNKS_FILE = pathlib.Path(__file__).parent / "data/chunks/chunks.jsonl"
OUT_DIR     = pathlib.Path(__file__).parent / "data/embeddings"
OUT_DIR.mkdir(parents=True, exist_ok=True)
INDEX_FILE  = OUT_DIR / "index.faiss"
META_FILE   = OUT_DIR / "metadata.jsonl"

MODEL_NAME  = "nomic-ai/nomic-embed-text-v1.5"
BATCH_SIZE  = 64
DOC_PREFIX  = "search_document: "


def mean_pool(token_embeddings, attention_mask):
    mask = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return (token_embeddings * mask).sum(1) / mask.sum(1).clamp(min=1e-9)


def encode_batch(model, tokenizer, texts, device):
    import torch
    import torch.nn.functional as F
    enc = tokenizer(texts, padding=True, truncation=True,
                    max_length=512, return_tensors="pt").to(device)
    with torch.no_grad():
        out = model(**enc)
    vecs = mean_pool(out.last_hidden_state, enc["attention_mask"])
    return F.normalize(vecs, p=2, dim=1).cpu().numpy().astype(np.float32)


def main():
    try:
        import torch
        from transformers import AutoTokenizer, AutoModel
        import faiss
    except ImportError:
        print("Missing deps. Run:  pip install torch transformers faiss-cpu")
        sys.exit(1)

    # ── device ──
    if torch.backends.mps.is_available():
        device = "mps"
    elif torch.cuda.is_available():
        device = "cuda"
    else:
        device = "cpu"
    print(f"Device: {device}\n")

    # ── load chunks ──
    if not CHUNKS_FILE.exists():
        print(f"✗ {CHUNKS_FILE} not found — run 05_chunk.py first")
        sys.exit(1)

    print("Loading chunks...", flush=True)
    chunks = []
    with open(CHUNKS_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))
    n = len(chunks)
    print(f"✓ {n} chunks\n", flush=True)

    # ── load model ──
    print(f"Loading {MODEL_NAME}...", flush=True)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
    model     = AutoModel.from_pretrained(MODEL_NAME, trust_remote_code=True).to(device)
    model.eval()
    print("✓ Model loaded\n", flush=True)

    # ── embed ──
    texts = [DOC_PREFIX + c["text"] for c in chunks]
    all_vecs = []
    total_batches = (n + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, n, BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        vecs  = encode_batch(model, tokenizer, batch, device)
        all_vecs.append(vecs)
        done = min(i + BATCH_SIZE, n)
        pct  = int(done / n * 100)
        print(f"  [{done:>{len(str(n))}}/{n}] {pct:>3}%", flush=True)

    embeddings = np.vstack(all_vecs)

    # ── FAISS index ──
    dim   = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)  # cosine sim (vecs are L2-normalised)
    index.add(embeddings)
    faiss.write_index(index, str(INDEX_FILE))
    print(f"\n✓ FAISS index  → {INDEX_FILE}  ({dim}-dim, {index.ntotal} vectors)")

    # ── metadata ──
    with open(META_FILE, "w", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")
    print(f"✓ Metadata     → {META_FILE}")
    print(f"\nTo query: embed with prefix 'search_query: ', then index.search(vec, k)")


if __name__ == "__main__":
    main()
