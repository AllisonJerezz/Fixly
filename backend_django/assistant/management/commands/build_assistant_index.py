import json
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
import os

try:
    import requests as _requests
except Exception:  # pragma: no cover
    _requests = None
    import urllib.request as _urlreq
    import urllib.error as _urlerr


def _read_text_files(root: Path):
    exts = {'.md', '.txt'}
    for p in sorted(root.rglob('*')):
        if p.suffix.lower() in exts and p.is_file():
            try:
                yield p, p.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue


def _chunk(text: str, max_chars: int = 1200, overlap: int = 150):
    text = text.replace('\r\n', '\n')
    parts = []
    i = 0
    n = len(text)
    while i < n:
        j = min(n, i + max_chars)
        chunk = text[i:j]
        parts.append(chunk.strip())
        if j >= n:
            break
        i = j - overlap
        if i < 0:
            i = 0
    return [c for c in parts if c]


def _embed_ollama(input_text: str, base_url: str, model: str):
    payload = {'model': model, 'input': input_text}
    url = f"{base_url.rstrip('/')}/api/embeddings"
    data = json.dumps(payload).encode('utf-8')
    headers = {'Content-Type': 'application/json'}
    if _requests is not None:
        r = _requests.post(url, json=payload, timeout=120)
        r.raise_for_status()
        return r.json().get('embedding', [])
    req = _urlreq.Request(url, data=data, headers=headers)
    with _urlreq.urlopen(req, timeout=120) as resp:
        js = json.loads(resp.read().decode('utf-8'))
        return js.get('embedding', [])


class Command(BaseCommand):
    help = 'Construye el índice local (embeddings) para el asistente RAG usando Ollama.'

    def add_arguments(self, parser):
        parser.add_argument('--base-url', default=os.getenv('OLLAMA_BASE_URL', 'http://127.0.0.1:11434'))
        parser.add_argument('--embed-model', default=os.getenv('OLLAMA_EMBED_MODEL', 'nomic-embed-text'))

    def handle(self, *args, **opts):
        base_dir = getattr(settings, 'BASE_DIR', Path(__file__).resolve().parents[4])
        docs_dir = Path(base_dir) / 'assistant' / 'docs'
        out_path = Path(base_dir) / 'assistant' / 'index.json'
        out_path.parent.mkdir(parents=True, exist_ok=True)

        base_url = opts['base_url']
        model = opts['embed_model']

        if not docs_dir.exists():
            self.stderr.write(self.style.WARNING(f'No existe carpeta de docs: {docs_dir}'))
            return

        self.stdout.write(self.style.NOTICE(f'Leyendo documentos desde {docs_dir}'))
        rows = []
        total_chunks = 0
        for p, txt in _read_text_files(docs_dir):
            chunks = _chunk(txt)
            for idx, ch in enumerate(chunks):
                emb = _embed_ollama(ch, base_url, model)
                rows.append({
                    'id': f'{p.name}:{idx}',
                    'path': str(p.relative_to(docs_dir)),
                    'chunk': idx,
                    'text': ch,
                    'vector': emb,
                })
                total_chunks += 1
        with out_path.open('w', encoding='utf-8') as f:
            json.dump({'model': model, 'count': total_chunks, 'items': rows}, f, ensure_ascii=False)

        self.stdout.write(self.style.SUCCESS(f'Índice guardado en {out_path} ({total_chunks} chunks)'))

