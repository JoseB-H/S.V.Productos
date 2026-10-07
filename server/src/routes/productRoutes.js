import {Router} from "express";
import {adjustStock,createProduct,getByBarcode,listProducts} from "../controllers/productController.js";

const router=Router();

router.get("/",listProducts);
router.get("/barcode/:barcode",getByBarcode);
router.post("/",createProduct);
router.patch("/:id/stock",adjustStock);

export default router;
