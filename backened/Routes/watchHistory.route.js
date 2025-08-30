import express from 'express';
import { jwtVerify } from '../Middlewares/auth.middleware.js';
import { addWatchHistory,getWatchHistory,deleteWatchHistory } from '../Controlers/watchHistory.controller.js';

const router=express.Router();

router.get("/user",jwtVerify,getWatchHistory);
router.post("/user/:videoId", jwtVerify, addWatchHistory);
router.delete("/user/delete/:videoId/:deleteType", jwtVerify, deleteWatchHistory);
router.delete("/user/delete", jwtVerify, deleteWatchHistory);

export default router