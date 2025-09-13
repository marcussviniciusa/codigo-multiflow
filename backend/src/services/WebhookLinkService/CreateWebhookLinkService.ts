import WebhookLink from "../../models/WebhookLink";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import AppError from "../../errors/AppError";

interface Request {
  name: string;
  description?: string;
  platform: string;
  flowId: number;
  companyId: number;
  userId: number;
}

const CreateWebhookLinkService = async ({
  name,
  description,
  platform,
  flowId,
  companyId,
  userId
}: Request): Promise<WebhookLink> => {
  
  // Verificar se o flow existe e pertence à empresa
  const flow = await FlowBuilderModel.findOne({
    where: {
      id: flowId,
      company_id: companyId
    }
  });

  if (!flow) {
    throw new AppError("ERR_FLOW_NOT_FOUND", 404);
  }

  // Verificar se já existe um webhook com o mesmo nome para a empresa
  const existingWebhook = await WebhookLink.findOne({
    where: {
      name,
      companyId
    }
  });

  if (existingWebhook) {
    throw new AppError("ERR_WEBHOOK_NAME_EXISTS", 409);
  }

  // Criar o webhook link
  const webhookLink = await WebhookLink.create({
    name,
    description,
    platform,
    flowId,
    companyId,
    userId,
    active: true,
    metadata: {}
  });

  // Retornar com dados do flow
  return await WebhookLink.findByPk(webhookLink.id, {
    include: [
      {
        model: FlowBuilderModel,
        as: 'flow',
        attributes: ['id', 'name', 'active']
      }
    ]
  });
};

export default CreateWebhookLinkService;