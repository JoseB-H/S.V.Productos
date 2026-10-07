import {useEffect,useMemo,useRef,useState} from "react";
import {io} from "socket.io-client";

const API="http://localhost:3000/api";
const SOCKET_URL="http://localhost:3000";

const emptyProduct={
  codigo:"",
  codigo_barras:"",
  nombre:"",
  descripcion:"",
  precio_compra:"",
  precio_venta:"",
  stock:"",
  stock_minimo:""
};

export default function App(){
  const [view,setView]=useState("pos");
  const [barcode,setBarcode]=useState("");
  const [cart,setCart]=useState([]);
  const [message,setMessage]=useState("");
  const [payment,setPayment]=useState("EFECTIVO");
  const [received,setReceived]=useState("");
  const [products,setProducts]=useState([]);
  const [loadingProducts,setLoadingProducts]=useState(false);
  const [productForm,setProductForm]=useState(emptyProduct);
  const [productMessage,setProductMessage]=useState("");
  const [savingProduct,setSavingProduct]=useState(false);
  const inputRef=useRef(null);
  const productBarcodeRef=useRef(null);

  const total=useMemo(
    ()=>cart.reduce((sum,item)=>sum+Number(item.precio_venta)*item.quantity,0),
    [cart]
  );

  const change=useMemo(()=>{
    if(payment!=="EFECTIVO") return 0;
    const cash=Number(received||0);
    return Math.max(0,cash-total);
  },[payment,received,total]);

  async function loadProducts(){
    setLoadingProducts(true);
    try{
      const response=await fetch(API+"/products");
      const data=await response.json();
      if(!response.ok) throw new Error(data.message||"No se pudieron cargar los productos");
      setProducts(data);
    }catch(error){
      setProductMessage("No se pudo conectar con el backend. Verifica localhost:3000");
    }finally{
      setLoadingProducts(false);
    }
  }

  useEffect(()=>{
    loadProducts();
    const socket=io(SOCKET_URL,{transports:["websocket","polling"]});
    socket.on("inventory:updated",loadProducts);
    return ()=>socket.disconnect();
  },[]);

  useEffect(()=>{
    if(view==="pos") setTimeout(()=>inputRef.current?.focus(),0);
    if(view==="products") setTimeout(()=>productBarcodeRef.current?.focus(),0);
  },[view]);

  async function scan(event){
    event.preventDefault();
    const code=barcode.trim();
    if(!code) return;

    setMessage("");

    try{
      const response=await fetch(API+"/products/barcode/"+encodeURIComponent(code));
      const product=await response.json();
      if(!response.ok) throw new Error(product.message||"Producto no encontrado");

      setCart(current=>{
        const existing=current.find(item=>item.id===product.id);
        const quantity=existing?.quantity||0;

        if(quantity+1>product.stock){
          setMessage("Stock insuficiente. Disponible: "+product.stock);
          return current;
        }

        if(existing){
          return current.map(item=>
            item.id===product.id?{...item,quantity:item.quantity+1}:item
          );
        }

        return [...current,{...product,quantity:1}];
      });
    }catch(error){
      setMessage(error.message);
    }finally{
      setBarcode("");
      inputRef.current?.focus();
    }
  }

  function updateQuantity(id,nextQuantity){
    setCart(current=>current.flatMap(item=>{
      if(item.id!==id) return [item];
      if(nextQuantity<=0) return [];
      if(nextQuantity>item.stock){
        setMessage("Stock insuficiente. Disponible: "+item.stock);
        return [item];
      }
      return [{...item,quantity:nextQuantity}];
    }));
  }

  async function confirmSale(){
    if(!cart.length) return;
    if(payment==="EFECTIVO"&&Number(received)<total){
      setMessage("El efectivo recibido es menor al total.");
      return;
    }

    setMessage("");

    try{
      const response=await fetch(API+"/sales",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          items:cart.map(item=>({productId:item.id,quantity:item.quantity})),
          payment:{
            type:payment,
            received:payment==="EFECTIVO"?Number(received):total
          }
        })
      });

      const result=await response.json();
      if(!response.ok) throw new Error(result.message||"No se pudo registrar la venta");

      setMessage(
        "Venta "+result.number+" registrada · Total S/ "+result.total.toFixed(2)+
        (payment==="EFECTIVO"?" · Vuelto S/ "+result.change.toFixed(2):" · Pago Yape")
      );
      setCart([]);
      setReceived("");
      inputRef.current?.focus();
    }catch(error){
      setMessage(error.message);
    }
  }

  function setProductField(field,value){
    setProductForm(current=>({...current,[field]:value}));
  }

  function generateInternalCode(){
    const suffix=String(Date.now()).slice(-8);
    setProductField("codigo","P-"+suffix);
  }

  async function saveProduct(event){
    event.preventDefault();
    setProductMessage("");
    setSavingProduct(true);

    try{
      const payload={
        ...productForm,
        precio_compra:Number(productForm.precio_compra||0),
        precio_venta:Number(productForm.precio_venta),
        stock:Number(productForm.stock||0),
        stock_minimo:Number(productForm.stock_minimo||0)
      };

      const response=await fetch(API+"/products",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });

      const result=await response.json();
      if(!response.ok) throw new Error(result.message||"No se pudo registrar el producto");

      setProductMessage("Producto registrado correctamente: "+result.nombre);
      setProductForm(emptyProduct);
      await loadProducts();
      productBarcodeRef.current?.focus();
    }catch(error){
      setProductMessage(error.message);
    }finally{
      setSavingProduct(false);
    }
  }

  return <main className="shell">
    <header className="topbar">
      <div>
        <p className="eyebrow">POS LOCAL · COSTO 0</p>
        <h1>S.V.Productos</h1>
      </div>
      <span className="status-pill">Inventario + ventas</span>
    </header>

    <nav className="tabs" aria-label="Navegacion principal">
      <button className={view==="pos"?"tab active-tab":"tab"} onClick={()=>setView("pos")}>
        Nueva venta
      </button>
      <button className={view==="products"?"tab active-tab":"tab"} onClick={()=>setView("products")}>
        Productos
      </button>
    </nav>

    {view==="pos"&&<section className="panel">
      <div className="section-title">
        <div>
          <p className="section-kicker">Caja</p>
          <h2>Nueva venta</h2>
        </div>
        <span>{cart.reduce((sum,item)=>sum+item.quantity,0)} unidades</span>
      </div>

      <form onSubmit={scan} className="scan">
        <input
          ref={inputRef}
          autoFocus
          value={barcode}
          onChange={event=>setBarcode(event.target.value)}
          placeholder="Escanea codigo de barras + Enter"
          aria-label="Codigo de barras"
        />
        <button type="submit" className="primary">Agregar</button>
      </form>

      {message&&<p className="message">{message}</p>}

      <div className="cart">
        {!cart.length?<div className="empty-state">
          <strong>Carrito vacio</strong>
          <span>Escanea un producto para comenzar.</span>
        </div>:cart.map(item=><article className="line" key={item.id}>
          <div className="product-main">
            <strong>{item.nombre}</strong>
            <small>{item.codigo_barras} · Stock {item.stock}</small>
          </div>

          <div className="quantity">
            <button type="button" onClick={()=>updateQuantity(item.id,item.quantity-1)}>−</button>
            <span>{item.quantity}</span>
            <button type="button" onClick={()=>updateQuantity(item.id,item.quantity+1)}>+</button>
          </div>

          <strong>S/ {(Number(item.precio_venta)*item.quantity).toFixed(2)}</strong>
          <button className="ghost danger" type="button" onClick={()=>updateQuantity(item.id,0)}>
            Quitar
          </button>
        </article>)}
      </div>

      <div className="checkout">
        <div className="total-row">
          <span>Total</span>
          <strong>S/ {total.toFixed(2)}</strong>
        </div>

        <div className="payment">
          <button
            type="button"
            className={payment==="EFECTIVO"?"active":""}
            onClick={()=>setPayment("EFECTIVO")}
          >
            Efectivo
          </button>
          <button
            type="button"
            className={payment==="YAPE"?"active":""}
            onClick={()=>setPayment("YAPE")}
          >
            Yape
          </button>
        </div>

        {payment==="EFECTIVO"?<div className="cash-grid">
          <label>
            <span>Monto recibido</span>
            <input
              type="number"
              min="0"
              step="0.10"
              value={received}
              onChange={event=>setReceived(event.target.value)}
              placeholder="S/ 0.00"
            />
          </label>
          <div className="change-box">
            <span>Vuelto</span>
            <strong>S/ {change.toFixed(2)}</strong>
          </div>
        </div>:<div className="yape-note">
          <strong>Pago con Yape</strong>
          <span>Verifica el abono en el celular del negocio y luego confirma la venta.</span>
        </div>}

        <button
          type="button"
          className="confirm"
          disabled={!cart.length}
          onClick={confirmSale}
        >
          Confirmar pago y venta
        </button>
      </div>
    </section>}

    {view==="products"&&<div className="products-layout">
      <section className="panel">
        <div className="section-title">
          <div>
            <p className="section-kicker">Inventario</p>
            <h2>Registrar producto</h2>
          </div>
        </div>

        <form className="product-form" onSubmit={saveProduct}>
          <label className="full">
            <span>Codigo de barras *</span>
            <input
              ref={productBarcodeRef}
              value={productForm.codigo_barras}
              onChange={event=>setProductField("codigo_barras",event.target.value)}
              placeholder="Escanea o escribe el codigo"
              required
            />
          </label>

          <label>
            <span>Codigo interno *</span>
            <div className="input-action">
              <input
                value={productForm.codigo}
                onChange={event=>setProductField("codigo",event.target.value)}
                placeholder="P-000001"
                required
              />
              <button type="button" className="ghost" onClick={generateInternalCode}>Generar</button>
            </div>
          </label>

          <label>
            <span>Nombre *</span>
            <input
              value={productForm.nombre}
              onChange={event=>setProductField("nombre",event.target.value)}
              placeholder="Ej. Gaseosa 500 ml"
              required
            />
          </label>

          <label className="full">
            <span>Descripcion</span>
            <textarea
              value={productForm.descripcion}
              onChange={event=>setProductField("descripcion",event.target.value)}
              placeholder="Detalle opcional del producto"
              rows="3"
            />
          </label>

          <label>
            <span>Precio de compra</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={productForm.precio_compra}
              onChange={event=>setProductField("precio_compra",event.target.value)}
              placeholder="0.00"
            />
          </label>

          <label>
            <span>Precio de venta *</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={productForm.precio_venta}
              onChange={event=>setProductField("precio_venta",event.target.value)}
              placeholder="0.00"
              required
            />
          </label>

          <label>
            <span>Stock inicial</span>
            <input
              type="number"
              min="0"
              step="1"
              value={productForm.stock}
              onChange={event=>setProductField("stock",event.target.value)}
              placeholder="0"
            />
          </label>

          <label>
            <span>Stock minimo</span>
            <input
              type="number"
              min="0"
              step="1"
              value={productForm.stock_minimo}
              onChange={event=>setProductField("stock_minimo",event.target.value)}
              placeholder="0"
            />
          </label>

          <button className="primary full" disabled={savingProduct}>
            {savingProduct?"Guardando...":"Registrar producto"}
          </button>
        </form>

        {productMessage&&<p className="message">{productMessage}</p>}
      </section>

      <section className="panel">
        <div className="section-title">
          <div>
            <p className="section-kicker">Catalogo interno</p>
            <h2>Productos registrados</h2>
          </div>
          <span>{products.length}</span>
        </div>

        {loadingProducts?<p className="empty">Cargando...</p>:!products.length?
          <div className="empty-state">
            <strong>No hay productos registrados</strong>
            <span>Registra el primero usando el formulario.</span>
          </div>:
          <div className="product-list">
            {products.map(product=>{
              const low=product.stock<=product.stock_minimo;
              const empty=product.stock===0;
              return <article className="product-row" key={product.id}>
                <div>
                  <strong>{product.nombre}</strong>
                  <small>{product.codigo_barras}</small>
                </div>
                <span>S/ {Number(product.precio_venta).toFixed(2)}</span>
                <span className={empty?"stock-badge empty-stock":low?"stock-badge low-stock":"stock-badge"}>
                  {empty?"Agotado":"Stock "+product.stock}
                </span>
              </article>;
            })}
          </div>
        }
      </section>
    </div>}
  </main>;
}
