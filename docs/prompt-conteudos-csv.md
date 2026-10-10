Gere o arquivo conteudos.csv com TODOS os FOs do ano, num único arquivo.

FORMATO
- UTF-8 sem BOM, separador vírgula, TODOS os campos entre aspas duplas
  (aspas dentro de um campo viram ""), uma linha por registro.
- Cabeçalho exato, nesta ordem: "data","curso","uc","turma","capacidade","chave"
- data: AAAA-MM-DD, data real (ex.: 2026-10-07).
- curso, uc, capacidade: copie o texto do FO exatamente como está
  (maiúsculas, acentos, pontuação final). Não corrija nem padronize.
  Use sempre a mesma grafia para a mesma UC em todas as linhas.
- turma: exatamente "2º JD" (Jogos Digitais) ou "2º DS" (Desenvolvimento
  de Sistemas). O "º" é o indicador ordinal (U+00BA), NÃO o símbolo de
  grau "°" (U+00B0). Um espaço entre "2º" e as letras.
- Nenhum campo vazio. Sem espaços sobrando no início/fim dos campos.
- Nunca duas linhas com a mesma combinação (data, uc, turma).
  Duas UCs diferentes no mesmo dia e na mesma turma podem existir, cada uma
  na sua linha.

CHAVE
chave = 16 primeiros caracteres hex do SHA-256 (UTF-8) de
data + "|" + uc + "|" + turma + "|" + capacidade, usando o texto exato
gravado no CSV (sem strip/trim). Em Python:

```python
import csv, hashlib

def chave(d, uc, t, cap):
    return hashlib.sha256(f"{d}|{uc}|{t}|{cap}".encode("utf-8")).hexdigest()[:16]

with open("conteudos.csv", "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, quoting=csv.QUOTE_ALL)
    w.writerow(["data", "curso", "uc", "turma", "capacidade", "chave"])
    for r in linhas:  # cada r: data, curso, uc, turma, capacidade
        w.writerow([r["data"], r["curso"], r["uc"], r["turma"], r["capacidade"],
                    chave(r["data"], r["uc"], r["turma"], r["capacidade"])])
```

Calcule a chave sobre os MESMOS valores que vão para o arquivo. Se mudar
qualquer texto depois, recalcule a chave daquela linha.

ANTES DE ENTREGAR, confira com este script (precisa imprimir "OK"):

```python
import csv, hashlib, datetime

rows = list(csv.reader(open("conteudos.csv", encoding="utf-8", newline="")))
assert rows[0] == ["data", "curso", "uc", "turma", "capacidade", "chave"], "cabeçalho"
vistos = set()
for n, r in enumerate(rows[1:], start=2):
    assert len(r) == 6, f"linha {n}: colunas"
    d, curso, uc, t, cap, k = r
    assert all(x.strip() for x in r), f"linha {n}: campo vazio"
    datetime.date.fromisoformat(d)
    assert t in ("2º JD", "2º DS"), f"linha {n}: turma {t!r}"
    assert (d, uc, t) not in vistos, f"linha {n}: duplicada"
    vistos.add((d, uc, t))
    assert hashlib.sha256(f"{d}|{uc}|{t}|{cap}".encode()).hexdigest()[:16] == k, f"linha {n}: chave"
print("OK", len(rows) - 1, "linhas")
```
