# Sistema de Webhook Links - Documentação da Implementação

## Visão Geral

Este documento descreve a implementação completa de um sistema de webhook links para o WhaTicket/Multiflow, permitindo integração com múltiplas plataformas de pagamento e automação de fluxos através do Flow Builder.

## Funcionalidades Implementadas

### 1. Geração de Links de Webhook
- Criação de links únicos para cada webhook
- Seleção de plataforma de pagamento (7 plataformas suportadas)
- Associação com Flow Builders existentes
- Gestão por empresa (multi-tenant)
- Controle de ativação/desativação

### 2. Processamento de Webhooks
- Recebimento de eventos de pagamento via HTTP POST
- Extração padronizada de dados de diferentes plataformas
- Criação automática de contatos quando necessário
- Criação automática de tickets
- Ativação do Flow Builder associado
- Sistema de variáveis globais para uso nos fluxos

### 3. Interface de Usuário
- Página completa para gerenciamento de webhook links
- Componente de seleção de variáveis no Flow Builder
- Dashboard com estatísticas de uso
- Funcionalidade de cópia de URLs

## Arquitetura Implementada

### Backend (Node.js/TypeScript)

#### 1. Modelos de Banco de Dados

**WebhookLink** (`/backend/src/models/WebhookLink.ts`)
- Gerencia os links de webhook criados pelos usuários
- Inclui geração automática de hash único e URL completa
- Relacionamentos com Company, User e FlowBuilderModel

**WebhookLinkLog** (`/backend/src/models/WebhookLinkLog.ts`)
- Registra todas as tentativas de processamento de webhook
- Inclui payload original, status da operação e dados extraídos
- Permite auditoria e debugging

#### 2. Migrações de Banco

**Migration WebhookLinks** (`/backend/src/database/migrations/20250113100000-create-webhook-links.ts`)
```sql
CREATE TABLE WebhookLinks (
  id SERIAL PRIMARY KEY,
  companyId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  flowId INTEGER NOT NULL,
  webhookHash VARCHAR(255) UNIQUE NOT NULL,
  webhookUrl TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  eventsReceived INTEGER DEFAULT 0,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

**Migration WebhookLinkLogs** (`/backend/src/database/migrations/20250113100001-create-webhook-link-logs.ts`)
```sql
CREATE TABLE WebhookLinkLogs (
  id SERIAL PRIMARY KEY,
  webhookLinkId INTEGER NOT NULL,
  payload TEXT NOT NULL,
  extractedData TEXT,
  status ENUM('success', 'error') NOT NULL,
  errorMessage TEXT,
  createdAt TIMESTAMP
);
```

#### 3. Serviços Implementados

**PaymentDataExtractor** (`/backend/src/utils/PaymentDataExtractor.ts`)
- Sistema de extração de dados padronizado
- Suporte para 7 plataformas: Kiwify, Hotmart, Braip, Monetizze, Cacto, Perfect Pay, Eduzz
- Normalização de dados em formato padrão

```typescript
interface StandardizedPaymentData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_cpf: string;
  product_name: string;
  product_id: string;
  transaction_id: string;
  transaction_amount: string;
  transaction_status: string;
  transaction_date: string;
  payment_method: string;
  event_type: string;
  webhook_platform: string;
  webhook_link_name: string;
  // Campos específicos para diferentes tipos de pagamento
  pix_code?: string;
  pix_expiration?: string;
  boleto_url?: string;
  boleto_barcode?: string;
  access_url?: string;
  commission_amount?: string;
}
```

**ProcessWebhookPaymentService** (`/backend/src/services/WebhookService/ProcessWebhookPaymentService.ts`)
- Processamento principal dos webhooks recebidos
- Criação automática de contatos e tickets
- Injeção de variáveis no sistema global
- Ativação do Flow Builder associado

**Serviços CRUD**
- `CreateWebhookLinkService.ts`: Criação de novos webhook links
- `ListWebhookLinksService.ts`: Listagem com filtros e paginação
- `ShowWebhookLinkService.ts`: Exibição de webhook específico
- `UpdateWebhookLinkService.ts`: Atualização de webhook links
- `DeleteWebhookLinkService.ts`: Exclusão de webhook links

#### 4. Controladores e Rotas

**WebhookLinkController** (`/backend/src/controllers/WebhookLinkController.ts`)
- Endpoints para CRUD completo
- Endpoint para recebimento de webhooks: `POST /webhook/:hash`
- Tratamento de erros e validações

**Rotas implementadas:**
```typescript
router.post("/webhook-links", WebhookLinkController.store);
router.get("/webhook-links", WebhookLinkController.index);
router.get("/webhook-links/:id", WebhookLinkController.show);
router.put("/webhook-links/:id", WebhookLinkController.update);
router.delete("/webhook-links/:id", WebhookLinkController.remove);
router.post("/webhook/:hash", WebhookLinkController.handleWebhook);
```

### Frontend (React.js)

#### 1. Página Principal de Webhook Links

**WebhookLinks** (`/frontend/src/pages/WebhookLinks/index.js`)
- Interface completa para gerenciamento de webhook links
- Tabela com listagem, filtros e paginação
- Modais para criação e edição
- Dashboard com estatísticas
- Funcionalidade de cópia de URLs

Recursos da interface:
- Seleção de plataforma de pagamento
- Seleção de Flow Builder através de autocomplete
- Indicadores visuais de status (ativo/inativo)
- Contador de eventos recebidos
- Ações: Editar, Ativar/Desativar, Copiar URL, Excluir

#### 2. Componente de Seleção de Variáveis

**FlowBuilderVariableSelector** (`/frontend/src/components/FlowBuilderVariableSelector/index.js`)
- Componente modal para seleção de variáveis
- Organização em abas: Variáveis do Webhook, Sistema, Todas
- Sistema de busca e filtros
- Categorização por cores
- Exemplos de uso para cada variável

**Variáveis do Webhook disponíveis:**
```javascript
const webhookVariables = [
  // Dados do Cliente
  { name: "customer_name", description: "Nome completo do cliente" },
  { name: "customer_email", description: "Email do cliente" },
  { name: "customer_phone", description: "Telefone do cliente" },
  { name: "customer_cpf", description: "CPF do cliente" },
  
  // Dados do Produto
  { name: "product_name", description: "Nome do produto" },
  { name: "product_id", description: "ID do produto" },
  
  // Dados da Transação
  { name: "transaction_id", description: "ID da transação" },
  { name: "transaction_amount", description: "Valor da transação" },
  { name: "transaction_status", description: "Status do pagamento" },
  { name: "payment_method", description: "Método de pagamento" },
  
  // E muitas outras...
];
```

#### 3. Integração com Flow Builder

**FlowBuilderAddTextModal** (modificado)
- Adição do botão "Inserir Variável"
- Integração com FlowBuilderVariableSelector
- Inserção automática de variáveis no texto

## Plataformas de Pagamento Suportadas

### 1. Kiwify
- Campos específicos: CommissionValue, Customer.FullName
- Eventos: order.approved, order.refused, etc.

### 2. Hotmart
- Campos específicos: prod_name, buyer_name, purchase_date
- Eventos: PURCHASE_COMPLETE, PURCHASE_CANCELED, etc.

### 3. Braip
- Campos específicos: customer_name, product_name, status
- Eventos: purchase.approved, purchase.canceled, etc.

### 4. Monetizze
- Campos específicos: cliente_nome, produto_nome, valor
- Eventos: venda.aprovada, venda.cancelada, etc.

### 5. Cacto
- Campos específicos: buyer.name, product.name, transaction.value
- Eventos: purchase.approved, purchase.refunded, etc.

### 6. Perfect Pay
- Campos específicos: customer_name, product_name, order_total
- Eventos: order.paid, order.canceled, etc.

### 7. Eduzz
- Campos específicos: customer_name, content_title, order_total
- Eventos: order.approved, order.canceled, etc.

## Sistema de Variáveis

### Injeção Global
As variáveis extraídas dos webhooks são injetadas no sistema global através de:
```typescript
global.flowVariables = extractedData;
```

### Formatos Suportados
- **Template Strings**: `${variable_name}` (usado em webhooks)
- **Mustache**: `{{variable_name}}` (usado no sistema)

### Processamento
O Flow Builder processa automaticamente as variáveis disponíveis em `global.flowVariables` e substitui os placeholders pelos valores reais.

## Fluxo de Funcionamento

### 1. Configuração
1. Usuário acessa a página "Webhook Links"
2. Clica em "Novo Webhook"
3. Preenche o nome, seleciona a plataforma e o Flow Builder
4. Sistema gera automaticamente o hash único e URL completa
5. Usuário copia a URL e configura na plataforma de pagamento

### 2. Processamento do Webhook
1. Plataforma de pagamento envia evento para a URL do webhook
2. Sistema identifica o webhook pelo hash na URL
3. PaymentDataExtractor processa o payload conforme a plataforma
4. Dados são padronizados e injetados em `global.flowVariables`
5. Sistema cria/localiza contato baseado no email
6. Cria novo ticket associado ao contato
7. Ativa o Flow Builder configurado
8. Registra log da operação

### 3. Execução do Flow
1. Flow Builder inicia com as variáveis disponíveis
2. Mensagens são processadas substituindo variáveis pelos valores reais
3. Flow executa normalmente com os dados do webhook

## Benefícios da Implementação

### Para o Usuário
- **Simplicidade**: Configuração fácil sem necessidade de programação
- **Flexibilidade**: Suporte a múltiplas plataformas de pagamento
- **Automação**: Processamento automático de eventos de pagamento
- **Rastreabilidade**: Logs completos de todas as operações

### Para o Sistema
- **Escalabilidade**: Arquitetura preparada para novas plataformas
- **Manutenibilidade**: Código organizado e bem documentado
- **Confiabilidade**: Sistema robusto de tratamento de erros
- **Integração**: Aproveitamento total da infraestrutura existente

## Arquivos Implementados

### Backend
```
backend/src/
├── controllers/WebhookLinkController.ts
├── database/migrations/
│   ├── 20250113100000-create-webhook-links.ts
│   └── 20250113100001-create-webhook-link-logs.ts
├── models/
│   ├── WebhookLink.ts
│   └── WebhookLinkLog.ts
├── routes/webhookLinkRoutes.ts
├── services/WebhookService/
│   ├── CreateWebhookLinkService.ts
│   ├── DeleteWebhookLinkService.ts
│   ├── ListWebhookLinksService.ts
│   ├── ProcessWebhookPaymentService.ts
│   ├── ShowWebhookLinkService.ts
│   └── UpdateWebhookLinkService.ts
└── utils/PaymentDataExtractor.ts
```

### Frontend
```
frontend/src/
├── components/FlowBuilderVariableSelector/index.js
├── pages/WebhookLinks/index.js
└── components/FlowBuilderAddTextModal/index.js (modificado)
```

## Considerações Técnicas

### Segurança
- Validação de dados de entrada em todos os endpoints
- Tratamento seguro de payloads JSON
- Logs detalhados para auditoria

### Performance
- Processamento assíncrono de webhooks
- Índices de banco de dados otimizados
- Cache de Flow Builders quando possível

### Manutenibilidade
- Código TypeScript com tipagem forte
- Padrão de serviços bem definido
- Testes unitários recomendados para futuras melhorias

### Extensibilidade
- Sistema preparado para novas plataformas de pagamento
- Interface de dados padronizada
- Arquitetura modular

## Conclusão

A implementação do sistema de webhook links representa uma evolução significativa na capacidade de automação do WhaTicket/Multiflow, permitindo integração nativa com as principais plataformas de pagamento do mercado brasileiro. O sistema foi projetado com foco em usabilidade, confiabilidade e extensibilidade, aproveitando ao máximo a infraestrutura existente do Flow Builder.

A solução implementada oferece aos usuários uma ferramenta poderosa para automação de comunicação baseada em eventos de pagamento, mantendo a simplicidade de uso característica da plataforma.