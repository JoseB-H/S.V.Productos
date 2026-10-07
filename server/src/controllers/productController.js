import { pool } from "../config/database.js";

export async function listProducts(req,res,next){
  try{
    const {rows}=await pool.query(
      "SELECT id,codigo,codigo_barras,nombre,descripcion,precio_compra,precio_venta,stock,stock_minimo,activo FROM productos WHERE activo=TRUE ORDER BY nombre"
    );
    res.json(rows);
  }catch(e){next(e);}
}

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
    const {
      codigo,
      codigo_barras,
      nombre,
      descripcion=null,
      precio_compra=0,
      precio_venta,
      stock=0,
      stock_minimo=0
    }=req.body;

    if(!codigo||!codigo_barras||!nombre||precio_venta===undefined){
      return res.status(400).json({message:"Faltan datos obligatorios"});
    }

    const purchasePrice=Number(precio_compra||0);
    const salePrice=Number(precio_venta);
    const initialStock=Number(stock||0);
    const minimumStock=Number(stock_minimo||0);

    if(
      purchasePrice<0||
      salePrice<0||
      !Number.isInteger(initialStock)||
      !Number.isInteger(minimumStock)||
      initialStock<0||
      minimumStock<0
    ){
      return res.status(400).json({message:"Stock y precios deben ser valores validos y no negativos"});
    }

    const {rows}=await pool.query(
      "INSERT INTO productos(codigo,codigo_barras,nombre,descripcion,precio_compra,precio_venta,stock,stock_minimo) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [codigo.trim(),codigo_barras.trim(),nombre.trim(),descripcion?.trim()||null,purchasePrice,salePrice,initialStock,minimumStock]
    );

    if(initialStock>0){
      await pool.query(
        "INSERT INTO movimientos_stock(producto_id,tipo,cantidad,stock_anterior,stock_nuevo,referencia_tipo) VALUES($1,'STOCK_INICIAL',$2,0,$2,'PRODUCTO')",
        [rows[0].id,initialStock]
      );
    }

    req.app.get("io")?.emit("inventory:updated",{productId:rows[0].id});
    res.status(201).json(rows[0]);
  }catch(e){
    if(e.code==="23505") return res.status(409).json({message:"El codigo interno o codigo de barras ya esta registrado"});
    next(e);
  }
}

export async function adjustStock(req,res,next){
  const db=await pool.connect();

  try{
    const productId=Number(req.params.id);
    const delta=Number(req.body.delta);

    if(!Number.isInteger(productId)||productId<=0){
      return res.status(400).json({message:"Producto invalido"});
    }

    if(!Number.isInteger(delta)||delta===0){
      return res.status(400).json({message:"El ajuste debe ser un numero entero distinto de 0"});
    }

    await db.query("BEGIN");

    const currentResult=await db.query(
      "SELECT id,nombre,stock FROM productos WHERE id=$1 AND activo=TRUE FOR UPDATE",
      [productId]
    );

    if(!currentResult.rows.length){
      await db.query("ROLLBACK");
      return res.status(404).json({message:"Producto no encontrado"});
    }

    const product=currentResult.rows[0];
    const previousStock=Number(product.stock);
    const newStock=previousStock+delta;

    if(newStock<0){
      await db.query("ROLLBACK");
      return res.status(409).json({
        message:"El stock no puede ser menor a 0",
        stock:previousStock
      });
    }

    const updatedResult=await db.query(
      "UPDATE productos SET stock=$1,actualizado_en=NOW() WHERE id=$2 RETURNING id,nombre,stock,stock_minimo",
      [newStock,productId]
    );

    await db.query(
      "INSERT INTO movimientos_stock(producto_id,tipo,cantidad,stock_anterior,stock_nuevo,referencia_tipo) VALUES($1,'AJUSTE_MANUAL',$2,$3,$4,'PRODUCTO')",
      [productId,delta,previousStock,newStock]
    );

    await db.query("COMMIT");

    const updated=updatedResult.rows[0];
    req.app.get("io")?.emit("inventory:updated",{productId});

    res.json({
      ...updated,
      previousStock,
      delta
    });
  }catch(e){
    try{await db.query("ROLLBACK");}catch{}
    next(e);
  }finally{
    db.release();
  }
}
