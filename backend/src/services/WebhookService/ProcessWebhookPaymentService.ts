import WebhookLink from "../../models/WebhookLink";
import WebhookLinkLog from "../../models/WebhookLinkLog";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import { ActionsWebhookService } from "./ActionsWebhookService";
import { extractVariables, determineEventType, StandardizedPaymentData } from "../../utils/PaymentDataExtractor";
import { generateHashWebhookId } from "../../utils/GenerateHashWebhookId";
import CreateContactService from "../ContactServices/CreateContactService";
import CreateTicketService from "../TicketServices/CreateTicketService";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import logger from "../../utils/logger";

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
    const defaultWhatsapp = await GetDefaultWhatsApp(webhookLink.companyId);
    
    // 7. Criar ou atualizar contato se tivermos dados suficientes
    let contact = null;
    let ticket = null;
    
    if (variables.customer_phone && variables.customer_phone.length >= 10) {
      try {
        // Limpar número de telefone (remover caracteres especiais)
        const cleanPhone = variables.customer_phone.replace(/\D/g, '');
        
        // Adicionar código do país se não tiver
        const phoneNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        
        contact = await CreateContactService({
          name: variables.customer_name || 'Cliente',
          number: phoneNumber,
          email: variables.customer_email,
          companyId: webhookLink.companyId
        });
        
        logger.info(`[WEBHOOK PAYMENT] Contact created/updated: ${contact.id}`);
        
        // 8. Criar ticket para o contato
        
        if (defaultWhatsapp) {
          ticket = await CreateTicketService({
            contactId: contact.id,
            status: "open",
            userId: 0,
            companyId: webhookLink.companyId,
            whatsappId: String(defaultWhatsapp.id)
          });
          
          logger.info(`[WEBHOOK PAYMENT] Ticket created: ${ticket.id}`);
          
          // Salvar ID do ticket nas variáveis
          global.flowVariables['webhook_ticket_id'] = ticket.id;
          global.flowVariables[`${flowExecutionId}_ticket_id`] = ticket.id;
        }
      } catch (error) {
        logger.error(`[WEBHOOK PAYMENT] Error creating contact/ticket: ${error.message}`);
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
        
        // Chamar ActionsWebhookService
        const nodes = (flow.flow as any)?.["nodes"] || [];
        const connections = (flow.flow as any)?.["connections"] || [];
        
        await ActionsWebhookService(
          defaultWhatsapp?.id || 1,
          flow.id,
          webhookLink.companyId,
          nodes,
          connections,
          'start',
          webhookData,
          {},
          flowExecutionId,
          '',
          ticket?.id,
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