import { Request, Response } from "express";
import WebhookLink from "../models/WebhookLink";
import CreateWebhookLinkService from "../services/WebhookLinkService/CreateWebhookLinkService";
import ListWebhookLinksService from "../services/WebhookLinkService/ListWebhookLinksService";
import UpdateWebhookLinkService from "../services/WebhookLinkService/UpdateWebhookLinkService";
import DeleteWebhookLinkService from "../services/WebhookLinkService/DeleteWebhookLinkService";
import ShowWebhookLinkService from "../services/WebhookLinkService/ShowWebhookLinkService";

export const createWebhookLink = async (req: Request, res: Response): Promise<Response> => {
  const { name, description, platform, flowId } = req.body;
  const { companyId } = req.user;
  const userId = parseInt(req.user.id);

  const webhookLink = await CreateWebhookLinkService({
    name,
    description,
    platform,
    flowId,
    companyId,
    userId
  });

  return res.status(200).json(webhookLink);
};

export const listWebhookLinks = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, pageNumber } = req.query;
  
  const { webhookLinks, count, hasMore } = await ListWebhookLinksService({ 
    companyId,
    searchParam: searchParam as string,
    pageNumber: pageNumber as string
  });
  
  return res.status(200).json({ webhookLinks, count, hasMore });
};

export const showWebhookLink = async (req: Request, res: Response): Promise<Response> => {
  const { webhookLinkId } = req.params;
  const { companyId } = req.user;

  const result = await ShowWebhookLinkService({
    webhookLinkId: parseInt(webhookLinkId),
    companyId
  });

  return res.status(200).json(result);
};

export const updateWebhookLink = async (req: Request, res: Response): Promise<Response> => {
  const { webhookLinkId } = req.params;
  const { companyId } = req.user;
  const updateData = req.body;

  const webhookLink = await UpdateWebhookLinkService({
    webhookLinkId: parseInt(webhookLinkId),
    companyId,
    updateData
  });

  return res.status(200).json(webhookLink);
};

export const deleteWebhookLink = async (req: Request, res: Response): Promise<Response> => {
  const { webhookLinkId } = req.params;
  const { companyId } = req.user;

  await DeleteWebhookLinkService({
    webhookLinkId: parseInt(webhookLinkId),
    companyId
  });

  return res.status(200).json({ message: "Webhook link deleted successfully" });
};