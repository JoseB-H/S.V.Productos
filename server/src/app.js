import "dotenv/config";
import cors from "cors";
import express from "express";
import http from "http";
import {Server} from "socket.io";
import {pool} from "./config/database.js";
import productRoutes from "./routes/productRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";

const app=express();
const server=http.createServer(app);
const origin=process.env.CLIENT_URL||"http://localhost:5173";
const io=new Server(server,{cors:{origin}});
app.set("io",io);
app.use(cors({origin}));
app.use(express.json());

app.get("/api/health",async(req,res,next)=>{
  try{const r=await pool.query("SELECT NOW() now");res.json({ok:true,now:r.rows[0].now});}
  catch(e){next(e);}
});
app.use("/api/products",productRoutes);
app.use("/api/sales",saleRoutes);
app.use((e,req,res,next)=>{console.error(e);res.status(e.status||500).json({message:e.message||"Error interno"});});
server.listen(Number(process.env.PORT||3000),()=>console.log("API en http://localhost:"+(process.env.PORT||3000)));
