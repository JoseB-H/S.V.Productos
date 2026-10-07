import {useMemo,useRef,useState} from "react";
const API="http://localhost:3000/api";

export default function App(){
  const [barcode,setBarcode]=useState("");
  const [cart,setCart]=useState([]);
  const [message,setMessage]=useState("");
  const [payment,setPayment]=useState("EFECTIVO");
  const [received,setReceived]=useState("");
  const inputRef=useRef(null);
  const total=useMemo(()=>cart.reduce((s,i)=>s+Number(i.precio_venta)*i.quantity,0),[cart]);

  async function scan(e){
    e.preventDefault();
    const code=barcode.trim(); if(!code)return;
    setMessage("");
    try{
      const r=await fetch(API+"/products/barcode/"+encodeURIComponent(code));
      const p=await r.json();
      if(!r.ok) throw new Error(p.message||"Producto no encontrado");
      setCart(current=>{
        const existing=current.find(i=>i.id===p.id);
        const qty=existing?.quantity||0;
        if(qty+1>p.stock){setMessage("Stock insuficiente. Disponible: "+p.stock);return current;}
        return existing?current.map(i=>i.id===p.id?{...i,quantity:i.quantity+1}:i):[...current,{...p,quantity:1}];
      });
    }catch(err){setMessage(err.message);}
    finally{setBarcode("");inputRef.current?.focus();}
  }

  async function confirmSale(){
    if(!cart.length)return;
    try{
      const r=await fetch(API+"/sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        items:cart.map(i=>({productId:i.id,quantity:i.quantity})),
        payment:{type:payment,received:payment==="EFECTIVO"?Number(received):total}
      })});
      const data=await r.json(); if(!r.ok) throw new Error(data.message||"No se pudo vender");
      setMessage("Venta "+data.number+" registrada. Total S/ "+data.total.toFixed(2));
      setCart([]);setReceived("");
    }catch(err){setMessage(err.message);}
    inputRef.current?.focus();
  }

  return <main className="shell">
    <header><div><p className="eyebrow">POS LOCAL · COSTO 0</p><h1>S.V.Productos</h1></div><span>Inventario + ventas</span></header>
    <section className="panel">
      <h2>Nueva venta</h2>
      <form onSubmit={scan} className="scan">
        <input ref={inputRef} autoFocus value={barcode} onChange={e=>setBarcode(e.target.value)} placeholder="Escanea codigo de barras + Enter"/>
        <button>Agregar</button>
      </form>
      {message&&<p className="message">{message}</p>}
      <div className="cart">
        {!cart.length?<p className="empty">Aun no hay productos.</p>:cart.map(i=><article className="line" key={i.id}>
          <div><strong>{i.nombre}</strong><small>{i.codigo_barras}</small></div>
          <span>x{i.quantity}</span><span>S/ {(Number(i.precio_venta)*i.quantity).toFixed(2)}</span>
          <button onClick={()=>setCart(c=>c.filter(x=>x.id!==i.id))}>Quitar</button>
        </article>)}
      </div>
      <div className="checkout">
        <div><span>Total</span><strong>S/ {total.toFixed(2)}</strong></div>
        <div className="payment">
          <button className={payment==="EFECTIVO"?"active":""} onClick={()=>setPayment("EFECTIVO")}>Efectivo</button>
          <button className={payment==="YAPE"?"active":""} onClick={()=>setPayment("YAPE")}>Yape</button>
        </div>
        {payment==="EFECTIVO"&&<input type="number" min="0" step="0.10" value={received} onChange={e=>setReceived(e.target.value)} placeholder="Monto recibido"/>}
        <button className="confirm" disabled={!cart.length} onClick={confirmSale}>Confirmar pago y venta</button>
      </div>
    </section>
  </main>;
}
