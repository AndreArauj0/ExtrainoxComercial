# Prototipo local de orcamentos

Aplicativo local em HTML, CSS e JavaScript para substituir a planilha atual de orcamentos e evoluir depois para integracao com o sistema Nomus.

## Como abrir

Abra o arquivo:

`outputs/orcamentos-app-local.html`

Ele ja contem HTML, CSS, JavaScript e regras fiscais empacotados em um unico arquivo.

## Arquivos principais

- `index.html`: estrutura das telas.
- `styles.css`: visual do aplicativo.
- `app.js`: regras de interacao, calculos e dados locais.
- `tax-rules.js`: tabela fiscal padrao extraida da planilha.
- `build_single_file.py`: gera o arquivo unico.

## Regra Fiscal

O submodulo `Regra Fiscal` permite filtrar, editar, criar, remover, importar,
exportar e restaurar regras fiscais por empresa, UF e NCM. As alteracoes ficam
salvas localmente no navegador e sao reaplicadas nas propostas automaticamente.

## Empresas

O submodulo `Empresas` centraliza os dados cadastrais usados nas propostas:
regime tributario, CNPJ, IE, endereco, telefone, e-mail, dados bancarios e
logotipo. A Extrainox inicia como `Lucro Presumido` e a Extrafrio como
`Simples Nacional`.

## Representantes

O submodulo `Representantes` centraliza nome, CNPJ/CPF, telefone, e-mail,
clientes representados, percentual de comissao e dados bancarios para pagamento.
Na proposta, o campo `Tem representante?` mostra ou oculta a selecao de um
representante cadastrado.

## Frete

O submodulo `Frete` centraliza regras e opcoes de frete, incluindo tipo CIF/FOB,
transportadora, UF de origem/destino, prazo, valor minimo, percentual e
observacoes. Na tela da proposta, o simulador calcula valor da NF, frete base,
UF destino, seguro, tarifa operacional, ICMS por UF, total do frete e percentual
do pedido, permitindo aplicar o resultado diretamente na proposta.

## Comissoes

O submodulo `Comissoes` lista automaticamente propostas que possuem
representante, calcula o valor pela porcentagem cadastrada e permite controlar
status `A pagar` ou `Pago`, data de pagamento e observacoes. O relatorio pode
ser filtrado por todas, pagas ou a pagar. Tambem permite lancar comissoes
manualmente para testes ou ajustes avulsos, com cliente, representante, base,
percentual, valor, status e observacoes.

## PDF da proposta

O botao `Previa PDF` mostra a proposta em A4 paisagem antes da impressao. O
botao `Salvar PDF` monta a versao inspirada no modelo Nomus, com cabecalho da
empresa selecionada, dados do cliente, totais, tributos, itens, dados bancarios,
condicoes comerciais, observacoes e rodape. No navegador, use a opcao de
impressao `Salvar como PDF`.

## Busca de CNPJ

Na tela da proposta, o botao `Buscar CNPJ` consulta a BrasilAPI e atualiza
automaticamente razao social, nome fantasia, telefone, e-mail, endereco, numero,
bairro, cidade, UF e CEP quando o cadastro e encontrado.

## Descricao dos itens

Na edicao da proposta, a tabela mostra uma descricao resumida/sistemica do item.
O botao `Descricao` abre um editor maior para a descricao comercial completa,
que e usada na proposta/PDF quando estiver preenchida.

## Como gerar o arquivo final

Depois de alterar os arquivos separados, rode:

```powershell
python build_single_file.py
```

O resultado sera atualizado em:

`orcamentos-app-local.html`

## Estado atual

- Modulo Comercial.
- Tela de propostas cadastradas.
- Tela de proposta individual.
- Tela de propostas em lista, espelhando a planilha.
- Calculos de preco liquido, ICMS, IPI, PIS/COFINS e total proposto.
- Numeracao de orcamento no formato `1776.26`.
- Codigos de item no formato `1776.1`, `1776.2`.
