# Cabeçalhos HTTP que a hospedagem do app precisa enviar

Para: quem configurar a hospedagem do `web/` (Dozo). O app é uma SPA estática (`npm run build` → `dist/`). Estes cabeçalhos valem para todas as respostas do domínio do app, salvo onde indicado.

O `dist/index.html` já traz a Content-Security-Policy numa `<meta>`, gerada em `vite.config.ts`. A `<meta>` protege mesmo sem configuração na hospedagem, mas não aceita algumas diretivas (`frame-ancestors`, `report-to`). Por isso a política precisa ir também no cabeçalho. Quando as duas existem, o navegador aplica as duas, e a mais restrita vence: mantenha as listas iguais.

## Todas as respostas

| Cabeçalho | Valor | Por quê |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests` | Só código e dados do próprio domínio (PRD, seção 9). `frame-ancestors 'none'` impede que o app seja aberto dentro de um `<iframe>` de outro site (clickjacking). `data:`/`blob:` em imagens: QR code e prévia do documento antes do envio. `'unsafe-inline'` só em estilos: os diálogos travam a rolagem da página com um `<style>` gerado na hora (Radix); scripts continuam só do próprio domínio. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Só HTTPS, por dois anos, também nos subdomínios. Ative `preload` só depois de confirmar que todos os subdomínios servem HTTPS. |
| `X-Content-Type-Options` | `nosniff` | O navegador não adivinha tipos de arquivo. |
| `X-Frame-Options` | `DENY` | O mesmo que `frame-ancestors`, para navegadores antigos. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Ao sair para outro site (portal da Interactive Brokers, e-mail de suporte), só o domínio é enviado, nunca o caminho. O app não põe dado pessoal em URL, mas o caminho de um aporte não precisa sair. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` | O app não usa nenhuma dessas APIs. A foto do documento na T3 usa o seletor de arquivos do sistema (`capture`), que não depende de `camera`. Rever quando o SDK de verificação de identidade entrar: ele pode precisar de `camera=(self "<origem do SDK>")`. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isola a aba de janelas abertas por outros sites. |
| `Cross-Origin-Resource-Policy` | `same-origin` | Outros sites não carregam os arquivos do app. |

## Cache

| Caminho | `Cache-Control` | Por quê |
|---|---|---|
| `/index.html` e as rotas da SPA | `no-cache` | Sempre a versão publicada; o navegador revalida a cada visita. |
| `/assets/*` | `public, max-age=31536000, immutable` | Nomes com hash do conteúdo: um arquivo novo tem outro nome. |

## Rotas da SPA

Qualquer caminho que não seja um arquivo de `dist/` responde `200` com o `index.html` (ex.: `/inicio`, `/aportar/dep-123`). O app mostra a própria página de "não encontrado".

## API

O app chama `/api/v1` na mesma origem; por isso `connect-src 'self'`. Se a API ficar em outro domínio, acrescente esse domínio a `connect-src` no cabeçalho e em `vite.config.ts`, e configure CORS na API só para a origem do app, com `Authorization` permitido.

## Em aberto

- **SDK de verificação de identidade e analytics:** quando forem escolhidos, as origens deles entram em `script-src`, `connect-src` e, se o SDK usar `<iframe>`, `frame-src`. Está marcado com `TODO(decisão)` em `vite.config.ts`.
- **Relatórios de violação:** com um serviço de monitoramento escolhido (`src/lib/report.ts`), acrescente `report-to` ao cabeçalho.
