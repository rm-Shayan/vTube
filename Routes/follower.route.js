import express  from "express"
import { jwtVerify } from "../Middlewares/auth.middleware.js"
import { addFollower } from "../Controlers/Follower.controller.js"



const router=express.Router()
router.post("/:followingId",jwtVerify,addFollower)
export default router;
