import { pool } from "../config/database.js";

export async function getByBarcode(req,res,next){
  try{
    const {rows}=await pool.query(
      "SELECT id,codigo,codigo_barras,nombre,descripcion,precio_venta,stock,stock_minimo FROM productos WHERE codigo_barras=$1 AND activo=TRUE LIMIT 1",
      [req.params.barcode]
    );
    if(!rows.length) return res.status(404).json({message:"Producto no encontrado"});
    res.json(rows[0]);
  }catch(e){next(e);}
}

export async function createProduct(req,res,next){
  try{
    const {codigo,codigo_barras,nombre,descripcion=null,precio_compra=0,precio_venta,stock=0,stock_minimo=0}=req.body;
    if(!codigo||!codigo_barras||!nombre||precio_venta===undefined) return res.status(400).json({message:"Faltan datos obligatorios"});
    if(Number(stock)<0||Number(stock_minimo)<0||Number(precio_venta)<0) return res.status(400).json({message:"Stock y precios no pueden ser negativos"});
    const {rows}=await pool.query(
      "INSERT INTO productos(codigo,codigo_barras,nombre,descripcion,precio_compra,precio_venta,stock,stock_minimo) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [codigo,codigo_barras,nombre,descripcion,precio_compra,precio_venta,stock,stock_minimo]
    );
    req.app.get("io")?.emit("inventory:updated",{productId:rows[0].id});
    res.status(201).json(rows[0]);
  }catch(e){
    if(e.code==="23505") return res.status(409).json({message:"Codigo o barcode duplicado"});
    next(e);
  }
}
