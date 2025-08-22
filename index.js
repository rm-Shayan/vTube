import dotenv from "dotenv";
import { DbConnection } from "./DB/index.js";
import { app } from "./App.js";

dotenv.config({
  path: "./.env",
});
// Connect to DB
DbConnection();
// ✅ Port config
const PORT =process.env.PORT||1600; // backend on 4000
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
