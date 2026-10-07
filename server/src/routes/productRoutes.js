import {Router} from "express";
import {createProduct,getByBarcode} from "../controllers/productController.js";
const router=Router();
router.get("/barcode/:barcode",getByBarcode);
router.post("/",createProduct);
export default router;
