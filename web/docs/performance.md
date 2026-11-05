# Performance

Gerado por `npm run perf` (2026-11-04). Lighthouse 12, mobile 375 px, 3G lento simulado (RTT 400 ms, 400 kbps, CPU 4x). Meta do PRD (seção 9): Performance ≥ 90, Acessibilidade 100.

A T1 é medida no build de produção (`dist/`). As telas com sessão, no build de medição (`dist-measure/`, `npm run build:measure`): o mesmo build de produção com o mock na página e a sessão já aberta, para o Lighthouse abrir cada rota direto. Esse build nunca é publicado; `scripts/check-build.mjs` falha se o `dist/` tiver qualquer parte dele.

| Tela | Rota | Performance (3G lento) | Acessibilidade | FCP | LCP | TBT | CLS | Performance (4G lento) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T1 Entrada | `/` | 49 | 100 | 11.2 s | 17.9 s | 314 ms | 0.000 | 65 |
| T4 Início | `/inicio` | 35 | 100 | 11.1 s | 29.9 s | 909 ms | 0.039 | 47 |
| T9 Carteira | `/cartera` | 39 | 100 | 10.9 s | 29.9 s | 671 ms | 0.000 | 52 |
| T6 Aportar | `/aportar` | 37 | 100 | 11.1 s | 14.5 s | 770 ms | 0.000 | 66 |
| T6 Novo aporte | `/aportar/nuevo` | 38 | 100 | 11.0 s | 31.4 s | 740 ms | 0.000 | 50 |
| T5 Plano | `/plan` | 38 | 100 | 11.0 s | 31.9 s | 733 ms | 0.000 | 48 |
| T11 Pendências | `/pendientes` | 41 | 100 | 11.0 s | 29.8 s | 592 ms | 0.000 | 53 |
| T12 Perfil | `/perfil` | 32 | 100 | 11.1 s | 30.7 s | 1164 ms | 0.042 | 46 |
| T3 Status da conta | `/cuenta?scenario=action_required` | 39 | 100 | 12.8 s | 29.4 s | 657 ms | 0.000 | 53 |

Relatórios completos: `lighthouse-reports/` (fora do git).
