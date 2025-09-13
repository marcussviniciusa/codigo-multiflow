import { Op } from "sequelize";
import WebhookLink from "../../models/WebhookLink";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import AppError from "../../errors/AppError";

interface UpdateData {
  name?: string;
  description?: string;
  platform?: string;
  flowId?: number;
  active?: boolean;
  metadata?: object;
}

interface Request {
  webhookLinkId: number;
  companyId: number;
  updateData: UpdateData;
}

const UpdateWebhookLinkService = async ({
  webhookLinkId,
  companyId,
  updateData
}: Request): Promise<WebhookLink> => {
  
  // Buscar o webhook link
  const webhookLink = await WebhookLink.findOne({
    where: {
      id: webhookLinkId,
      companyId
    }
  });

  if (!webhookLink) {
    throw new AppError("ERR_WEBHOOK_NOT_FOUND", 404);
  }

  // Se estiver atualizando o flowId, verificar se existe
  if (updateData.flowId) {
    const flow = await FlowBuilderModel.findOne({
      where: {
        id: updateData.flowId,
        company_id: companyId
      }
    });

    if (!flow) {
      throw new AppError("ERR_FLOW_NOT_FOUND", 404);
    }
  }

  // Se estiver atualizando o nome, verificar duplicação
  if (updateData.name && updateData.name !== webhookLink.name) {
    const existingWebhook = await WebhookLink.findOne({
      where: {
        name: updateData.name,
        companyId,
        id: { [Op.ne]: webhookLinkId }
      }
    });

    if (existingWebhook) {
      throw new AppError("ERR_WEBHOOK_NAME_EXISTS", 409);
    }
  }

  // Atualizar o webhook
  await webhookLink.update(updateData);

  // Retornar com dados atualizados
  return await WebhookLink.findByPk(webhookLinkId, {
    include: [
      {
        model: FlowBuilderModel,
        as: 'flow',
        attributes: ['id', 'name', 'active']
      }
    ]
  });
};

export default UpdateWebhookLinkService;