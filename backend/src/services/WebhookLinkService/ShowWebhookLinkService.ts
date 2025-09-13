import WebhookLink from "../../models/WebhookLink";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import WebhookLinkLog from "../../models/WebhookLinkLog";
import AppError from "../../errors/AppError";

interface Request {
  webhookLinkId: number;
  companyId: number;
}

interface Response {
  webhookLink: WebhookLink;
  recentLogs: WebhookLinkLog[];
  stats: {
    totalRequests: number;
    successfulRequests: number;
    successRate: number;
    lastRequestAt: Date | null;
  };
}

const ShowWebhookLinkService = async ({
  webhookLinkId,
  companyId
}: Request): Promise<Response> => {
  
  // Buscar o webhook link com detalhes
  const webhookLink = await WebhookLink.findOne({
    where: {
      id: webhookLinkId,
      companyId
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
    throw new AppError("ERR_WEBHOOK_NOT_FOUND", 404);
  }

  // Buscar logs recentes
  const recentLogs = await WebhookLinkLog.findAll({
    where: {
      webhookLinkId
    },
    order: [['createdAt', 'DESC']],
    limit: 10
  });

  // Calcular estatísticas
  const successRate = webhookLink.totalRequests > 0 
    ? (webhookLink.successfulRequests / webhookLink.totalRequests) * 100 
    : 0;

  return {
    webhookLink,
    recentLogs,
    stats: {
      totalRequests: webhookLink.totalRequests,
      successfulRequests: webhookLink.successfulRequests,
      successRate: Math.round(successRate * 100) / 100,
      lastRequestAt: webhookLink.lastRequestAt
    }
  };
};

export default ShowWebhookLinkService;