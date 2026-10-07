import {Router} from "express";
import {createProduct,getByBarcode,listProducts} from "../controllers/productController.js";

const router=Router();

router.get("/",listProducts);
router.get("/barcode/:barcode",getByBarcode);
router.post("/",createProduct);

export default router;
