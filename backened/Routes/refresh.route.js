import { Router } from "express";
import {refreshAccessToken} from "../Controlers/user.controller.js"
const router=Router();
router.get("/refresh",refreshAccessToken)

export default router