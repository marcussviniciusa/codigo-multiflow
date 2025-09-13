import { Op } from "sequelize";
import WebhookLink from "../../models/WebhookLink";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import User from "../../models/User";

interface Request {
  companyId: number;
  searchParam?: string;
  pageNumber?: string | number;
}

interface Response {
  webhookLinks: WebhookLink[];
  count: number;
  hasMore: boolean;
}

const ListWebhookLinksService = async ({
  companyId,
  searchParam = "",
  pageNumber = "1"
}: Request): Promise<Response> => {
  
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const whereCondition: any = {
    companyId
  };

  if (searchParam) {
    whereCondition.name = {
      [Op.iLike]: `%${searchParam}%`
    };
  }

  const { count, rows: webhookLinks } = await WebhookLink.findAndCountAll({
    where: whereCondition,
    include: [
      {
        model: FlowBuilderModel,
        as: 'flow',
        attributes: ['id', 'name', 'active']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });

  const hasMore = count > offset + webhookLinks.length;

  return {
    webhookLinks,
    count,
    hasMore
  };
};

export default ListWebhookLinksService;