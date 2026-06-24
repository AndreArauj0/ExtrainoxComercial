# Prototipo local de orcamentos

Aplicativo local em HTML, CSS e JavaScript para substituir a planilha atual de orcamentos e evoluir depois para integracao com o sistema Nomus.

## Como abrir

Abra o arquivo:

`outputs/orcamentos-app-local.html`

Ele ja contem HTML, CSS, JavaScript e regras fiscais empacotados em um unico arquivo.

## Arquivos principais

- `app/index.html`: estrutura das telas.
- `app/styles.css`: visual do aplicativo.
- `app/app.js`: regras de interacao, calculos e dados locais.
- `app/tax-rules.js`: regras fiscais extraidas da planilha.
- `work/build_single_file.py`: gera o arquivo unico em `outputs/`.

## Como gerar o arquivo final

Depois de alterar arquivos dentro de `app/`, rode:

```powershell
python work\build_single_file.py
```

O resultado sera atualizado em:

`outputs/orcamentos-app-local.html`

## Estado atual

- Modulo Comercial.
- Tela de propostas cadastradas.
- Tela de proposta individual.
- Tela de propostas em lista, espelhando a planilha.
- Calculos de preco liquido, ICMS, IPI, PIS/COFINS e total proposto.
- Numeracao de orcamento no formato `1776.26`.
- Codigos de item no formato `1776.1`, `1776.2`.

