import { pool } from "../config/database.js";

export async function createSale(req,res,next){
  const db=await pool.connect();
  try{
    const {items,payment}=req.body;
    if(!Array.isArray(items)||!items.length) return res.status(400).json({message:"Venta sin productos"});
    if(!payment||!["EFECTIVO","YAPE"].includes(payment.type)) return res.status(400).json({message:"Metodo de pago invalido"});
    await db.query("BEGIN");
    let total=0;
    const lines=[];
    for(const item of items){
      const qty=Number(item.quantity);
      if(!Number.isInteger(qty)||qty<=0) throw Object.assign(new Error("Cantidad invalida"),{status:400});
      const q=await db.query("SELECT id,nombre,precio_venta,stock FROM productos WHERE id=$1 AND activo=TRUE FOR UPDATE",[item.productId]);
      if(!q.rows.length) throw Object.assign(new Error("Producto no encontrado"),{status:404});
      const p=q.rows[0];
      if(p.stock<qty) throw Object.assign(new Error("Stock insuficiente para "+p.nombre+". Disponible: "+p.stock),{status:409});
      const price=Number(p.precio_venta), subtotal=price*qty;
      total+=subtotal; lines.push({p,qty,price,subtotal});
    }
    if(payment.type==="EFECTIVO" && Number(payment.received)<total) throw Object.assign(new Error("Efectivo insuficiente"),{status:400});
    const s=await db.query("INSERT INTO ventas(total) VALUES($1) RETURNING id",[total]);
    const saleId=s.rows[0].id, number="V-"+String(saleId).padStart(8,"0");
    await db.query("UPDATE ventas SET numero=$1 WHERE id=$2",[number,saleId]);
    for(const l of lines){
      const nextStock=l.p.stock-l.qty;
      await db.query("INSERT INTO venta_detalles(venta_id,producto_id,cantidad,precio_unitario,subtotal) VALUES($1,$2,$3,$4,$5)",[saleId,l.p.id,l.qty,l.price,l.subtotal]);
      await db.query("UPDATE productos SET stock=$1,actualizado_en=NOW() WHERE id=$2",[nextStock,l.p.id]);
      await db.query("INSERT INTO movimientos_stock(producto_id,tipo,cantidad,stock_anterior,stock_nuevo,referencia_tipo,referencia_id) VALUES($1,'VENTA',$2,$3,$4,'VENTA',$5)",[l.p.id,-l.qty,l.p.stock,nextStock,saleId]);
    }
    const received=payment.type==="EFECTIVO"?Number(payment.received):total;
    const change=payment.type==="EFECTIVO"?received-total:0;
    await db.query("INSERT INTO pagos(venta_id,tipo,monto,monto_recibido,vuelto,referencia) VALUES($1,$2,$3,$4,$5,$6)",[saleId,payment.type,total,received,change,payment.reference||null]);
    await db.query("COMMIT");
    req.app.get("io")?.emit("inventory:updated",{saleId});
    res.status(201).json({id:saleId,number,total:Number(total.toFixed(2)),change:Number(change.toFixed(2))});
  }catch(e){await db.query("ROLLBACK"); next(e);}
  finally{db.release();}
}
