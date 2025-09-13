import WebhookLink from "../../models/WebhookLink";
import AppError from "../../errors/AppError";

interface Request {
  webhookLinkId: number;
  companyId: number;
}

const DeleteWebhookLinkService = async ({
  webhookLinkId,
  companyId
}: Request): Promise<void> => {
  
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

  // Deletar o webhook link
  await webhookLink.destroy();
};

export default DeleteWebhookLinkService;