import WebhookLink from "../../models/WebhookLink";
import WebhookLinkLog from "../../models/WebhookLinkLog";
import Contact from "../../models/Contact";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import { ActionsWebhookService } from "./ActionsWebhookService";
import { extractVariables, determineEventType, StandardizedPaymentData } from "../../utils/PaymentDataExtractor";
import { generateHashWebhookId } from "../../utils/GenerateHashWebhookId";
import CreateContactService from "../ContactServices/CreateContactService";
import CreateTicketServiceWebhook from "../TicketServices/CreateTicketServiceWebhook";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import logger from "../../utils/logger";

// Declaração global para flowVariables
declare global {
  namespace NodeJS {
    interface Global {
      flowVariables: Record<string, any>;
    }
  }
}

// Inicializar global.flowVariables se não existir
if (!global.flowVariables) {
  global.flowVariables = {};
}

interface ProcessRequest {
  webhookLink: WebhookLink;
  payload: any;
  ipAddress?: string;
  userAgent?: string;
}

interface ProcessResult {
  processedData: StandardizedPaymentData;
  variables: Record<string, any>;
  flowTriggered: boolean;
  flowExecutionId: string;
  eventType: string;
  ticketId?: number;
}

const ProcessWebhookPaymentService = async ({
  webhookLink,
  payload,
  ipAddress,
  userAgent
}: ProcessRequest): Promise<ProcessResult> => {
  
  const startTime = Date.now();
  
  try {
    // 1. Extrair variáveis baseado na plataforma
    const variables = extractVariables(webhookLink.platform, payload);

    logger.info(`[WEBHOOK PAYMENT] Dados extraídos - Nome: ${variables.customer_name}, Email: ${variables.customer_email}, Telefone: ${variables.customer_phone}`);
    logger.info(`[WEBHOOK PAYMENT] Produto: ${variables.product_name}, Valor: ${variables.transaction_amount}, Status: ${variables.transaction_status}`);

    // 2. Determinar tipo de evento
    const eventType = determineEventType(webhookLink.platform, payload);
    
    // 3. Gerar ID único para execução
    const flowExecutionId = generateHashWebhookId();
    
    // 4. Salvar variáveis no sistema global
    Object.keys(variables).forEach(key => {
      const value = variables[key];
      // Salvar variável global
      global.flowVariables[key] = value;
      // Salvar variável específica da execução
      global.flowVariables[`${flowExecutionId}_${key}`] = value;
      // Salvar variável específica do webhook
      global.flowVariables[`webhook_${key}`] = value;
    });
    
    // 5. Adicionar variáveis extras do webhook
    global.flowVariables['webhook_platform'] = webhookLink.platform;
    global.flowVariables['webhook_event_type'] = eventType;
    global.flowVariables['webhook_link_name'] = webhookLink.name;
    global.flowVariables[`${flowExecutionId}_webhook_platform`] = webhookLink.platform;
    global.flowVariables[`${flowExecutionId}_webhook_event_type`] = eventType;
    
    logger.info(`[WEBHOOK PAYMENT] Processing webhook for platform: ${webhookLink.platform}, event: ${eventType}`);
    
    // 6. Obter WhatsApp padrão
    let defaultWhatsapp = null;
    try {
      defaultWhatsapp = await GetDefaultWhatsApp(webhookLink.companyId);
      logger.info(`[WEBHOOK PAYMENT] WhatsApp padrão encontrado: ${defaultWhatsapp.id} (${defaultWhatsapp.name}) - Status: ${defaultWhatsapp.status}`);
    } catch (error) {
      logger.error(`[WEBHOOK PAYMENT] Erro ao obter WhatsApp padrão: ${error.message}`);
      // Continuar sem WhatsApp para não bloquear o processamento
    }

    // 7. Criar ou atualizar contato se tivermos dados suficientes
    let contact = null;
    let ticket = null;
    
    if (variables.customer_phone && variables.customer_phone.length >= 10) {
      try {
        // Limpar número de telefone (remover caracteres especiais)
        const cleanPhone = variables.customer_phone.replace(/\D/g, '');

        // Adicionar código do país se não tiver
        const phoneNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        logger.info(`[WEBHOOK PAYMENT] Procurando ou criando contato - Número: ${phoneNumber}, Nome: ${variables.customer_name || 'Cliente'}`);

        // Primeiro tentar encontrar contato existente
        contact = await Contact.findOne({
          where: {
            number: phoneNumber,
            companyId: webhookLink.companyId
          }
        });

        if (contact) {
          logger.info(`[WEBHOOK PAYMENT] Contato existente encontrado: ${contact.id}`);
        } else {
          // Se não encontrar, criar novo
          contact = await CreateContactService({
            name: variables.customer_name || 'Cliente',
            number: phoneNumber,
            email: variables.customer_email,
            companyId: webhookLink.companyId
          });
          logger.info(`[WEBHOOK PAYMENT] Novo contato criado: ${contact.id}`);
        }

        // 8. Criar ticket para o contato

        if (defaultWhatsapp) {
          logger.info(`[WEBHOOK PAYMENT] Criando ticket - ContactId: ${contact.id}, WhatsAppId: ${defaultWhatsapp.id}, CompanyId: ${webhookLink.companyId}`);

          ticket = await CreateTicketServiceWebhook({
            contactId: contact.id,
            status: "open",
            userId: null,
            companyId: webhookLink.companyId,
            hashFlowId: flowExecutionId,
            flowStopped: "0"
          });

          logger.info(`[WEBHOOK PAYMENT] Ticket created: ${ticket.id}`);

          // Salvar ID do ticket nas variáveis
          global.flowVariables['webhook_ticket_id'] = ticket.id;
          global.flowVariables[`${flowExecutionId}_ticket_id`] = ticket.id;
        } else {
          logger.warn(`[WEBHOOK PAYMENT] Não foi possível criar ticket - WhatsApp padrão não encontrado`);
        }
      } catch (error) {
        logger.error(`[WEBHOOK PAYMENT] Error creating contact/ticket: ${error.message}`);
        logger.error(`[WEBHOOK PAYMENT] Stack trace: ${error.stack}`);
      }
    }
    
    // 8. Buscar o Flow Builder
    const flow = await FlowBuilderModel.findByPk(webhookLink.flowId);
    
    if (!flow || !flow.active) {
      throw new Error("Flow não encontrado ou inativo");
    }
    
    // 9. Disparar Flow Builder
    let flowTriggered = false;

    if (flow.flow && flow.flow['nodes'] && flow.flow['connections']) {
      try {
        // Preparar dados para o webhook
        const webhookData = {
          ...variables,
          platform: webhookLink.platform,
          event_type: eventType,
          webhook_link_name: webhookLink.name,
          ticket_id: ticket?.id,
          contact_id: contact?.id
        };

        // Extrair nodes e connections
        const nodes = (flow.flow as any)?.["nodes"] || [];
        const connections = (flow.flow as any)?.["connections"] || [];

        // Logs para debug
        logger.info(`[WEBHOOK PAYMENT DEBUG] Flow ${flow.name} - Nodes count: ${nodes.length}`);
        logger.info(`[WEBHOOK PAYMENT DEBUG] Connections count: ${connections.length}`);

        if (nodes.length === 0) {
          throw new Error("Flow não possui nós configurados");
        }

        // Encontrar o nó inicial (nó sem conexões de entrada)
        let startNodeId = nodes.find((node: any) => {
          const hasIncomingConnection = connections.some((conn: any) => conn.target === node.id);
          return !hasIncomingConnection && node.type !== 'end';
        })?.id;

        // Se não encontrar nó sem conexões de entrada, usar o primeiro nó
        if (!startNodeId && nodes.length > 0) {
          startNodeId = nodes[0].id;
          logger.warn(`[WEBHOOK PAYMENT] Nó inicial não encontrado por conexões, usando primeiro nó: ${startNodeId}`);
        }

        if (!startNodeId) {
          throw new Error("Não foi possível determinar o nó inicial do flow");
        }

        logger.info(`[WEBHOOK PAYMENT] Nó inicial encontrado: ${startNodeId} (tipo: ${nodes.find((n: any) => n.id === startNodeId)?.type})`);

        // Preparar objeto details corretamente
        const details = {
          inputs: [
            { keyValue: "nome", data: "customer_name" },
            { keyValue: "celular", data: "customer_phone" },
            { keyValue: "email", data: "customer_email" }
          ],
          keysFull: Object.keys(webhookData)
        };

        // Verificar se temos um ticket ou criar um temporário se necessário
        if (!ticket && defaultWhatsapp) {
          logger.warn(`[WEBHOOK PAYMENT] Ticket não foi criado anteriormente, tentando criar agora`);

          // Se não temos contato, tentar encontrar ou criar um básico
          if (!contact) {
            try {
              let phoneNumber;
              if (variables.customer_phone) {
                const cleanPhone = variables.customer_phone.replace(/\D/g, '');
                phoneNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
              } else {
                phoneNumber = `55${Date.now()}`;
              }

              // Primeiro tentar encontrar contato existente
              contact = await Contact.findOne({
                where: {
                  number: phoneNumber,
                  companyId: webhookLink.companyId
                }
              });

              if (contact) {
                logger.info(`[WEBHOOK PAYMENT] Contato existente encontrado emergencialmente: ${contact.id}`);
              } else {
                // Se não encontrar, criar novo
                contact = await CreateContactService({
                  name: variables.customer_name || 'Cliente Webhook',
                  number: phoneNumber,
                  email: variables.customer_email || '',
                  companyId: webhookLink.companyId
                });
                logger.info(`[WEBHOOK PAYMENT] Contato criado emergencialmente: ${contact.id}`);
              }
            } catch (error) {
              logger.error(`[WEBHOOK PAYMENT] Erro ao criar contato emergencial: ${error.message}`);
            }
          }

          // Criar ticket se temos contato
          if (contact) {
            try {
              ticket = await CreateTicketServiceWebhook({
                contactId: contact.id,
                status: "open",
                userId: null,
                companyId: webhookLink.companyId,
                hashFlowId: flowExecutionId,
                flowStopped: "0"
              });

              logger.info(`[WEBHOOK PAYMENT] Ticket criado emergencialmente: ${ticket.id}`);

              // Salvar ID do ticket nas variáveis
              global.flowVariables['webhook_ticket_id'] = ticket.id;
              global.flowVariables[`${flowExecutionId}_ticket_id`] = ticket.id;
            } catch (error) {
              logger.error(`[WEBHOOK PAYMENT] Erro ao criar ticket emergencial: ${error.message}`);
            }
          }
        }

        // Só prosseguir se tivermos um ticket válido
        if (!ticket) {
          logger.error(`[WEBHOOK PAYMENT] Não foi possível criar ticket para executar o flow`);
          throw new Error("Ticket não pôde ser criado para executar o flow");
        }

        logger.info(`[WEBHOOK PAYMENT] Executando flow com Ticket ID: ${ticket.id}, Contact ID: ${contact?.id}`);

        // Chamar ActionsWebhookService com parâmetros corretos
        await ActionsWebhookService(
          defaultWhatsapp?.id || 1,
          flow.id,
          webhookLink.companyId,
          nodes,
          connections,
          startNodeId,  // Usar o ID real do nó inicial
          webhookData,
          details,      // Passar details estruturado
          flowExecutionId,
          '',
          ticket.id,    // Usar ticket.id em vez de ticket?.id
          {
            number: variables.customer_phone || '',
            name: variables.customer_name || '',
            email: variables.customer_email || ''
          }
        );

        flowTriggered = true;
        logger.info(`[WEBHOOK PAYMENT] Flow triggered successfully: ${flow.name}`);
      } catch (error) {
        logger.error(`[WEBHOOK PAYMENT] Error triggering flow: ${error.message}`);
        throw error;
      }
    }
    
    // 10. Calcular tempo de processamento
    const responseTimeMs = Date.now() - startTime;
    
    // 11. Salvar log
    await WebhookLinkLog.create({
      webhookLinkId: webhookLink.id,
      companyId: webhookLink.companyId,
      platform: webhookLink.platform,
      eventType,
      payloadRaw: payload,
      payloadProcessed: variables,
      variablesExtracted: variables,
      flowTriggered,
      flowExecutionId,
      httpStatus: 200,
      responseTimeMs,
      ipAddress,
      userAgent
    });
    
    // 12. Atualizar estatísticas do webhook
    await webhookLink.update({
      totalRequests: webhookLink.totalRequests + 1,
      successfulRequests: webhookLink.successfulRequests + 1,
      lastRequestAt: new Date()
    });
    
    return {
      processedData: variables,
      variables,
      flowTriggered,
      flowExecutionId,
      eventType,
      ticketId: ticket?.id
    };
    
  } catch (error) {
    logger.error(`[WEBHOOK PAYMENT] Processing error: ${error.message}`);
    
    // Salvar log de erro
    await WebhookLinkLog.create({
      webhookLinkId: webhookLink.id,
      companyId: webhookLink.companyId,
      platform: webhookLink.platform,
      eventType: 'error',
      payloadRaw: payload,
      flowTriggered: false,
      httpStatus: 500,
      responseTimeMs: Date.now() - startTime,
      errorMessage: error.message,
      ipAddress,
      userAgent
    });
    
    // Atualizar estatísticas do webhook
    await webhookLink.update({
      totalRequests: webhookLink.totalRequests + 1,
      lastRequestAt: new Date()
    });
    
    throw error;
  }
};

export default ProcessWebhookPaymentService;