import { Request, Response } from "express";
import WebhookLink from "../models/WebhookLink";
import WebhookLinkLog from "../models/WebhookLinkLog";
import ProcessWebhookPaymentService from "../services/WebhookService/ProcessWebhookPaymentService";
import { FlowBuilderModel } from "../models/FlowBuilder";
import logger from "../utils/logger";

export const receiveWebhookPayment = async (req: Request, res: Response): Promise<Response> => {
  const { webhookHash } = req.params;
  const payload = req.body;
  const method = req.method;
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = req.ip || req.connection.remoteAddress || '';

  logger.info(`[WEBHOOK RECEIVER] Incoming webhook: ${method} /${webhookHash}`);
  logger.info(`[WEBHOOK RECEIVER] Payload: ${JSON.stringify(payload).substring(0, 500)}`);

  let webhookLink: WebhookLink | null = null;
  const startTime = Date.now();

  try {
    // Buscar webhook link pelo hash
    webhookLink = await WebhookLink.findOne({
      where: {
        webhookHash,
        active: true
      },
      include: [
        {
          model: FlowBuilderModel,
          as: 'flow',
          attributes: ['id', 'name', 'active', 'flow']
        }
      ]
    });

    if (!webhookLink) {
      logger.warn(`[WEBHOOK RECEIVER] Webhook not found: ${webhookHash}`);
      
      // Salvar log mesmo sem webhook link
      await WebhookLinkLog.create({
        platform: 'unknown',
        eventType: 'webhook_not_found',
        payloadRaw: payload,
        flowTriggered: false,
        httpStatus: 404,
        responseTimeMs: Date.now() - startTime,
        errorMessage: `Webhook link não encontrado: ${webhookHash}`,
        ipAddress,
        userAgent
      });
      
      return res.status(404).json({ 
        error: "Webhook not found",
        message: "O webhook solicitado não foi encontrado ou está inativo"
      });
    }

    logger.info(`[WEBHOOK RECEIVER] Found webhook: ${webhookLink.name} (${webhookLink.platform})`);

    // Verificar se o flow está ativo
    if (!webhookLink.flow || !webhookLink.flow.active) {
      logger.warn(`[WEBHOOK RECEIVER] Flow inactive for webhook: ${webhookLink.name}`);
      
      await WebhookLinkLog.create({
        webhookLinkId: webhookLink.id,
        companyId: webhookLink.companyId,
        platform: webhookLink.platform,
        eventType: 'flow_inactive',
        payloadRaw: payload,
        flowTriggered: false,
        httpStatus: 422,
        responseTimeMs: Date.now() - startTime,
        errorMessage: 'Flow associado está inativo',
        ipAddress,
        userAgent
      });

      // Atualizar estatísticas
      await webhookLink.update({
        totalRequests: webhookLink.totalRequests + 1,
        lastRequestAt: new Date()
      });

      return res.status(422).json({ 
        error: "Flow inactive",
        message: "O flow associado a este webhook está inativo"
      });
    }

    // Processar o webhook
    const result = await ProcessWebhookPaymentService({
      webhookLink,
      payload,
      ipAddress,
      userAgent
    });

    logger.info(`[WEBHOOK RECEIVER] Processing successful: Flow triggered = ${result.flowTriggered}`);

    // Responder sucesso
    return res.status(200).json({ 
      success: true, 
      message: "Webhook processed successfully",
      data: {
        flowTriggered: result.flowTriggered,
        eventType: result.eventType,
        flowExecutionId: result.flowExecutionId,
        ticketId: result.ticketId
      }
    });

  } catch (error) {
    logger.error(`[WEBHOOK RECEIVER] Processing error: ${error.message}`);
    logger.error(error.stack);
    
    // Salvar log de erro
    if (webhookLink) {
      await WebhookLinkLog.create({
        webhookLinkId: webhookLink.id,
        companyId: webhookLink.companyId,
        platform: webhookLink.platform,
        eventType: 'processing_error',
        payloadRaw: payload,
        flowTriggered: false,
        httpStatus: 500,
        responseTimeMs: Date.now() - startTime,
        errorMessage: error.message,
        ipAddress,
        userAgent
      });

      // Atualizar estatísticas
      await webhookLink.update({
        totalRequests: webhookLink.totalRequests + 1,
        lastRequestAt: new Date()
      });
    }

    return res.status(500).json({ 
      error: "Internal server error",
      message: "Erro ao processar webhook"
    });
  }
};

// Endpoint para testar webhook (apenas GET)
export const testWebhookPayment = async (req: Request, res: Response): Promise<Response> => {
  const { webhookHash } = req.params;

  try {
    const webhookLink = await WebhookLink.findOne({
      where: { webhookHash },
      include: [
        {
          model: FlowBuilderModel,
          as: 'flow',
          attributes: ['id', 'name', 'active']
        }
      ]
    });

    if (!webhookLink) {
      return res.status(404).json({ 
        error: "Webhook not found" 
      });
    }

    return res.status(200).json({
      message: "Webhook endpoint is working",
      webhook: {
        name: webhookLink.name,
        platform: webhookLink.platform,
        active: webhookLink.active,
        flow: webhookLink.flow?.name,
        flowActive: webhookLink.flow?.active
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      error: "Internal server error" 
    });
  }
};