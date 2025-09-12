import express from "express";
import isAuth from "../middleware/isAuth";

import * as ScheduleMesageController from "../controllers/ScheduledMessagesController";
import multer from "multer";
import uploadConfig from "../config/upload";
const upload = multer(uploadConfig);

const scheduleMessageRoutes = express.Router();

scheduleMessageRoutes.get("/schedules-message", isAuth, ScheduleMesageController.index);

//@ts-ignore
scheduleMessageRoutes.post("/schedules-message", isAuth, upload.array("file"), ScheduleMesageController.store);

//@ts-ignore
scheduleMessageRoutes.put("/schedules-message/:scheduleId", isAuth, upload.array("file"), ScheduleMesageController.update);

scheduleMessageRoutes.get("/schedules-message/:scheduleId", isAuth, ScheduleMesageController.show);

scheduleMessageRoutes.delete("/schedules-message/:scheduleId", isAuth, ScheduleMesageController.remove);

export default scheduleMessageRoutes;
