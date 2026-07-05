# Extrainox Comercial

Aplicativo local em HTML, CSS e JavaScript para controle comercial de propostas,
orcamentos, empresas, representantes, fretes, comissoes e regras fiscais.

O projeto nasceu para substituir e evoluir a planilha de desenvolvimento de
orcamentos, mantendo a operacao simples: abrir no navegador, editar os dados,
gerar previa/PDF da proposta e manter tudo salvo localmente.

## Como abrir

Arquivo recomendado para uso local:

`orcamentos-app-local-atualizado.html`

Tambem existe o arquivo gerado:

`orcamentos-app-local.html`

Ambos podem ser abertos diretamente no navegador. O arquivo atualizado e o mais
usado para testes e validacao visual.

## Arquivos principais

- `index.html`: estrutura das telas do app.
- `styles.css`: visual, layout, impressao e PDF.
- `app.js`: regras de negocio, calculos, dados locais e interacoes.
- `tax-rules.js`: base inicial de regras fiscais.
- `build_single_file.py`: gera o HTML unico com CSS e JavaScript embutidos.
- `orcamentos-app-local.html`: arquivo unico gerado.
- `orcamentos-app-local-atualizado.html`: copia atualizada para abrir/testar.

## Como gerar o arquivo unico

Depois de alterar `index.html`, `styles.css` ou `app.js`, execute:

```powershell
python build_single_file.py
```

Depois copie o resultado para o arquivo atualizado, se necessario:

```powershell
Copy-Item .\orcamentos-app-local.html .\orcamentos-app-local-atualizado.html -Force
```

## Dados locais e backup

Os dados ficam salvos no armazenamento local do navegador (`localStorage`).
Isso permite trabalhar sem servidor, mas significa que cada navegador/perfil pode
ter uma base diferente.

Use os botoes de exportar/importar dados para backup ou transferencia entre
maquinas/navegadores.

## Modulo Comercial

O modulo principal possui:

- painel de propostas;
- lista geral de propostas;
- cadastro/edicao de proposta;
- revisoes por proposta (`Proposta 01`, `Proposta 02`, etc.);
- duplicacao de proposta para criar nova revisao;
- exclusao de proposta;
- status como rascunho, enviado, aprovado, reprovado e outros;
- busca por cliente, numero ou item.

## Estrutura da proposta

A proposta foi organizada em camadas:

- dados de identificacao;
- dados do cliente;
- propostas/revisoes do orcamento;
- condicoes comerciais;
- itens;
- anexos;
- simulador de frete;
- resumo do orcamento.

Alguns blocos possuem funcao de reduzir/expandir para facilitar propostas com
muitos itens ou muitos anexos.

## Itens

A tabela de itens permite editar:

- codigo;
- descricao resumida;
- descricao comercial completa;
- quantidade;
- NCM;
- preco liquido;
- base de ICMS;
- ICMS;
- IPI;
- valor unitario bruto;
- subtotal.

O campo de descricao resumida permite navegacao horizontal no texto. O botao de
adicional abre uma tela maior para preencher a descricao comercial completa.

## Anexos

A proposta possui bloco proprio de anexos, logo abaixo dos itens.

Recursos:

- anexar PDF ou imagem;
- classificar como ficha tecnica, catalogo, manual, desenho tecnico ou outro;
- vincular o anexo a proposta inteira ou a um item especifico;
- escolher se aparece ou nao no PDF;
- abrir/remover anexos;
- bloco recolhivel para nao poluir a tela.

Imagens podem aparecer visualmente na proposta/PDF. PDFs ficam listados como
anexos complementares para acompanhar o envio da proposta.

## Empresas

O submodulo `Empresas` centraliza:

- codigo;
- logo;
- nome;
- regime tributario;
- CNPJ;
- IE;
- endereco;
- telefone;
- e-mail;
- contas bancarias;
- contas de pagamento.

Empresas iniciais:

- Extrainox: Lucro Presumido.
- Extrafrio: Simples Nacional.

## Contas bancarias

Cada empresa pode ter mais de uma conta bancaria, com:

- logo do banco;
- banco;
- agencia;
- conta;
- PIX;
- conta principal.

A proposta permite selecionar qual conta sera usada e o PDF mostra os dados
bancarios escolhidos.

## Contas de pagamento e Cielo

Cada empresa pode cadastrar contas de pagamento para Link de Pagamento Cielo.

Dados previstos:

- logo da operadora;
- provedor;
- ambiente;
- estabelecimento;
- nome na fatura;
- status;
- tabela de taxas por bandeira e tipo de venda.

As tabelas de taxas sao separadas por empresa, pois Extrainox e Extrafrio podem
ter condicoes diferentes.

## Simulacao de venda Cielo

Quando o recebimento da proposta e `Link de Pagamento Cielo`, aparece o botao de
simulacao de venda.

A simulacao permite escolher:

- valor da venda;
- modalidade;
- bandeira do cartao;
- tipo de venda/parcelamento.

O resultado mostra:

- valor simulado;
- valor que a empresa recebera;
- taxa aplicada;
- valor liquido por parcela;
- prazo de recebimento;
- conta Cielo utilizada.

Ao selecionar a simulacao para a proposta, o pagamento e preenchido
automaticamente com o parcelamento escolhido.

Tambem existe campo para colar o link de pagamento gerado manualmente na Cielo.
Esse link aparece clicavel na proposta/PDF.

## Frete

O submodulo `Frete` guarda regras de frete.

Na tela da proposta existe o bloco `Simulador custo frete`, tambem recolhivel,
com:

- valor da NF;
- frete base;
- UF destino;
- taxa de seguro;
- tarifa operacional;
- tipo de frete;
- ICMS de frete por UF;
- total de tributos;
- valor total do frete;
- percentual do pedido.

O resultado pode ser aplicado diretamente na proposta.

## Regra Fiscal

O submodulo `Regra Fiscal` centraliza regras por:

- empresa;
- UF;
- NCM;
- descricao;
- base de ICMS;
- ICMS;
- IPI;
- PIS/COFINS.

As regras sao aplicadas nos itens para facilitar manutencao futura das tabelas
de impostos.

## Representantes

O submodulo `Representantes` centraliza:

- nome;
- CNPJ/CPF;
- contato;
- clientes representados;
- percentual de comissao;
- dados bancarios para pagamento.

Na proposta, e possivel indicar se existe representante e selecionar um cadastro.

## Comissoes

O modulo `Comissoes` controla:

- comissoes automaticas por proposta com representante;
- lancamentos manuais;
- status a pagar/pago;
- data de pagamento;
- observacoes;
- relatorio de valores pagos e a pagar.

## Busca de CNPJ

A tela da proposta possui busca de CNPJ por API. A consulta e acionada somente
quando o usuario clica na lupa ao lado do campo de CNPJ.

Os dados retornados podem ser ajustados manualmente depois.

## PDF da proposta

A proposta possui previa de PDF com layout comercial, incluindo:

- logo e dados da empresa;
- dados do cliente;
- totais de mercadorias e tributos;
- itens;
- anexos complementares;
- condicoes comerciais;
- dados bancarios ou Link de Pagamento Cielo;
- observacoes;
- rodape.

Existe opcao de orientacao horizontal e vertical. A previa tenta respeitar
quebras de pagina e margem inferior.

## Limitacoes atuais

- O app ainda e local, sem banco de dados remoto.
- Os dados ficam no navegador usado.
- Anexos grandes podem deixar o armazenamento local pesado.
- PDFs anexados sao registrados/listados, mas nao sao mesclados como paginas
  internas do PDF da proposta.
- Integracao Cielo ainda nao gera link automaticamente via API; por enquanto o
  link e gerado fora e colado na proposta.

## Proximos passos sugeridos

- Migrar dados para backend/banco de dados.
- Integrar API Cielo para gerar link automaticamente.
- Criar gestao de usuarios/perfis.
- Melhorar controle de aprovacoes e historico comercial.
- Armazenar anexos em servidor ou storage dedicado.
- Publicar uma versao web com login.

## GitHub

Repositorio:

`AndreArauj0/ExtrainoxComercial`

Mensagem de commit sugerida para esta fase:

`Atualiza modulo comercial com anexos, frete e paineis recolhiveis`
