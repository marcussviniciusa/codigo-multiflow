import express from "express";
import isAuth from "../middleware/isAuth";
import * as WebhookLinkController from "../controllers/WebhookLinkController";
import * as WebhookReceiverController from "../controllers/WebhookReceiverController";

const webhookLinkRoutes = express.Router();

// ===== ROTAS PROTEGIDAS (CRUD Webhook Links) =====
// Listar todos os webhook links
webhookLinkRoutes.get("/webhook-links", isAuth, WebhookLinkController.listWebhookLinks);

// Criar novo webhook link
webhookLinkRoutes.post("/webhook-links", isAuth, WebhookLinkController.createWebhookLink);

// Obter detalhes de um webhook link específico
webhookLinkRoutes.get("/webhook-links/:webhookLinkId", isAuth, WebhookLinkController.showWebhookLink);

// Atualizar webhook link
webhookLinkRoutes.put("/webhook-links/:webhookLinkId", isAuth, WebhookLinkController.updateWebhookLink);

// Deletar webhook link
webhookLinkRoutes.delete("/webhook-links/:webhookLinkId", isAuth, WebhookLinkController.deleteWebhookLink);

// ===== ROTAS PÚBLICAS (Receiver endpoints) =====
// Receber webhook via POST (principal)
webhookLinkRoutes.post("/webhook/payment/:webhookHash", WebhookReceiverController.receiveWebhookPayment);

// Receber webhook via GET (algumas plataformas usam GET)
webhookLinkRoutes.get("/webhook/payment/:webhookHash", WebhookReceiverController.testWebhookPayment);

// Receber webhook via PUT (compatibilidade)
webhookLinkRoutes.put("/webhook/payment/:webhookHash", WebhookReceiverController.receiveWebhookPayment);

export default webhookLinkRoutes;