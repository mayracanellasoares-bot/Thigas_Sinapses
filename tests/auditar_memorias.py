"""Auditoria estática reprodutível de formato e integridade; não fact-check externo."""
import json,unicodedata,collections,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
payload=json.loads((root/'memorias/1127_memorias.json').read_text(encoding='utf-8'))
assert payload['format']=='thigas-synapse-memories'
memories=payload['memories']
assert len(memories)==1127,len(memories)
name=lambda x:''.join(c for c in unicodedata.normalize('NFD',x.casefold().strip()) if not unicodedata.combining(c))
subjects=set();facts=set()
for i,m in enumerate(memories):
 assert isinstance(m,dict) and isinstance(m.get('subject'),str) and 0<len(m['subject'])<=256,(i,'subject')
 assert isinstance(m.get('fact'),str) and 20<=len(m['fact'])<=4000,(i,'fact')
 assert isinstance(m.get('aliases'),list) and all(isinstance(v,str) for v in m['aliases']),(i,'aliases')
 assert isinstance(m.get('tags'),list) and all(isinstance(v,str) for v in m['tags']),(i,'tags')
 assert m.get('approved') is True and 0<float(m['confidence'])<=1,(i,'confidence')
 subject=name(m['subject']);fact=name(m['fact']);assert subject not in subjects,(i,'duplicate subject');assert fact not in facts,(i,'duplicate fact')
 subjects.add(subject);facts.add(fact)
 assert not re.search(r'<script\b|javascript:|ignore previous instructions',m['fact'],flags=re.I),(i,'untrusted script')
counts=collections.Counter('base127' if m['source'].startswith('base:') else m['source'].split(':')[-1] for m in memories)
print('PASS: JSON schema, 1.127 assuntos, 1.127 explicações distintas, aliases/tags, sem instruções de script ou títulos duplicados.')
for k,v in sorted(counts.items()):print(k,v)
