# Prompt para continuar no Lovable - Extrainox Comercial

Crie/continue um aplicativo web chamado **Extrainox Comercial**, voltado para geração e gestão de propostas comerciais/orçamentos para as empresas **Extrainox** e **Extrafrio**.

O app atual é um protótipo local em HTML/CSS/JavaScript, com dados salvos em `localStorage`. Quero evoluir isso para um app mais robusto, mantendo a experiência atual e preparando para banco de dados futuramente.

## Objetivo principal

Construir um sistema comercial simples, rápido e organizado para:

- Cadastrar propostas/orçamentos.
- Importar dados de planilha antiga.
- Gerenciar empresas emissoras.
- Gerenciar regras fiscais.
- Gerenciar representantes e comissões.
- Simular frete.
- Gerar proposta em PDF visualmente fiel à prévia.

## Estilo visual desejado

Interface profissional, limpa e operacional, não landing page.

Use um layout de sistema interno:

- Menu lateral à esquerda.
- Área principal com cards de resumo.
- Tabelas densas, legíveis e práticas.
- Cores sóbrias, com azul escuro como base.
- Evitar visual de marketing.
- Priorizar rapidez de edição e leitura.

## Módulos atuais

### Propostas

Tela principal com:

- Lista de propostas cadastradas.
- Cards de resumo: total em propostas, rascunhos, enviadas, aprovadas.
- Tabela com colunas:
  - Núm. orçamento
  - Empresa
  - Cliente
  - CNPJ
  - Solicitante
  - Itens
  - Total
  - Status
  - Última alteração

O cabeçalho **Núm. orçamento** deve ser clicável para ordenar:

- Clique alterna entre maior para menor e menor para maior.
- A lista lateral deve acompanhar a mesma ordenação.

### Editor de proposta

Campos principais:

- Número da proposta
- Empresa emissora
- Status
- Cliente / razão social
- CNPJ
- UF
- Cidade
- Endereço
- Número
- Bairro
- CEP
- Telefone
- E-mail
- Requisitante
- Pagamento
- Entrega
- Validade
- Frete
- Incluído por
- Observações

No CNPJ deve existir uma lupa para buscar dados automaticamente por API, mas a busca só ocorre quando clicar na lupa. Depois o usuário pode editar manualmente.

### Itens da proposta

Tabela de itens com:

- Código
- Descrição
- Adc. com botão `+` para abrir descrição comercial completa
- Qtd.
- NCM
- Preço líquido
- BC ICMS
- ICMS %
- IPI %
- Valor un.
- Total

Regras importantes:

- A descrição resumida deve permitir navegação horizontal no campo, sem cortar com reticências.
- O botão `+` abre modal com:
  - Descrição resumida/sistêmica
  - Descrição comercial completa
- No PDF, usar descrição comercial completa se existir; senão usar descrição resumida.
- Campos devem aceitar formato brasileiro, especialmente preço como `99.999,00`.

### Empresas

Submódulo **Empresas** para cadastrar empresas emissoras.

Empresas iniciais:

- **Extrainox**
  - Regime: Lucro Presumido
- **Extrafrio**
  - Regime: Simples Nacional

Cada empresa deve ter:

- Código
- Nome
- Regime tributário
- CNPJ
- Inscrição Estadual
- Endereço
- Número
- Bairro
- Cidade
- UF
- CEP
- Telefone
- E-mail
- Dados bancários
- PIX
- Logotipo

Na proposta/PDF, os dados da empresa selecionada devem alimentar o cabeçalho e os dados bancários.

### Regra Fiscal

Submódulo **Regra Fiscal** para manter tabelas de imposto editáveis.

Campos esperados:

- Empresa
- UF
- NCM
- Descrição/grupo
- BC ICMS
- ICMS %
- IPI %
- PIS/COFINS %

Objetivo: facilitar alteração de tabelas fiscais sem mexer no código.

Regra importante:

- Quando a empresa estiver em **Simples Nacional**, não destacar PIS e COFINS no PDF.
- Na tela de resumo, PIS/COFINS pode aparecer como `R$ 0,00`.
- Futuramente as regras tributárias serão melhoradas por empresa/regime.

### Representantes

Submódulo **Representantes** com:

- Nome
- CNPJ/CPF
- Clientes representados
- Percentual de comissão
- Dados bancários para pagamento

Na proposta deve existir opção:

- Representante: Sim/Não
- Se Sim, abrir seleção de representante já cadastrado.

### Comissões

Submódulo **Comissões**, abaixo de Representantes, para:

- Armazenar valores de comissões.
- Gerar relatórios de comissões pagas e a pagar.
- Permitir lançamentos manuais para teste.
- Vincular comissões automáticas às propostas que tenham representante.

### Frete

Submódulo **Frete** deve funcionar como base de regras de frete.

Na proposta existe um simulador de frete que fica oculto por padrão e abre por botão de olho.

O simulador deve usar:

- Valor da NF/proposta
- Frete base
- UF destino
- Seguro
- ICMS por UF
- Tarifa operacional

Regras atuais:

- UF destino deve puxar por padrão a UF do cliente.
- Estados PR, SC, RS, SP, MG e RJ usam ICMS 12%.
- Demais estados usam ICMS 7%.
- Seguro padrão: 0,60%.
- Tarifa operacional padrão: 2%.
- Resultado deve poder ser aplicado na proposta como valor de frete.

## PDF / proposta impressa

Este é um ponto crítico.

A prévia visual atual é boa e deve ser preservada.

O PDF deve ser gerado com visual fiel à prévia:

- A4 paisagem.
- Cabeçalho com logotipo da empresa.
- Dados da empresa.
- Número da proposta e data no canto direito.
- Dados do cliente compactos.
- Bloco “Total das mercadorias e serviços”.
- Bloco “Total dos tributos”.
- Tabela de itens.
- Condições comerciais.
- Dados bancários.
- Observações.
- Rodapé com responsável/e-mail e data/página.

Para empresa **Simples Nacional**:

- Não destacar PIS e COFINS no bloco “Total dos tributos”.
- Manter ICMS e IPI.
- Observação pode mencionar: “Empresa optante pelo Simples Nacional. Não gera direito a crédito fiscal de IPI.”

Problema encontrado no protótipo:

- O navegador interno bloqueava impressão/download.
- A solução mais fiel foi gerar o PDF a partir da própria prévia visual, como imagem/PDF, mantendo o layout.
- No Lovable, priorizar uma geração de PDF confiável usando uma biblioteca adequada, por exemplo `html2canvas` + `jspdf`, `react-to-print`, ou geração server-side se disponível.

## Importação/exportação

O app precisa ter:

- Exportar dados completos em JSON.
- Importar dados completos em JSON.
- Exportar proposta individual.
- Importar proposta individual.

Isso é importante porque hoje os dados ficam no navegador/localStorage.

## Dados existentes

Já existe uma base importada de planilha com:

- 152 propostas
- 573 itens

A aba importante da planilha original era **Orçamentos**.

## Cuidados de UX

- O usuário não é técnico.
- Botões e textos devem ser claros.
- Evitar mensagens técnicas.
- Sempre que possível, permitir edição manual.
- Não perder dados ao atualizar a página.
- Ao salvar, mostrar estado “Salvo localmente” ou equivalente.

## Próximos passos desejados

1. Migrar o protótipo para uma estrutura mais robusta.
2. Manter todos os módulos atuais.
3. Melhorar geração de PDF fiel à prévia.
4. Preparar persistência para banco de dados.
5. Preparar autenticação simples futuramente.
6. Manter importação/exportação JSON para segurança dos dados.

## Resultado esperado

Um app comercial operacional, não apenas uma tela demonstrativa, com fluxo real:

1. Selecionar empresa emissora.
2. Buscar/preencher cliente.
3. Adicionar itens.
4. Aplicar regras fiscais.
5. Simular/aplicar frete.
6. Escolher representante quando houver.
7. Salvar proposta.
8. Gerar PDF visualmente profissional e fiel à prévia.
