import {Router} from "express";
import {createSale} from "../controllers/saleController.js";
const router=Router();
router.post("/",createSale);
export default router;
