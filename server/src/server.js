import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./config/db.js";

const port = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is required. Copy .env.example to .env.");
  process.exit(1);
}

connectDatabase()
  .then(() => app.listen(port, () => console.log(`AlgoMentor API listening on port ${port}`)))
  .catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  });
