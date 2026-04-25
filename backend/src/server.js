require("dotenv").config();
const app = require("./app");
const { initDatabase } = require("./config/initDb");

const port = Number(process.env.PORT || 4000);

async function start() {
  await initDatabase();

  app.listen(port, () => {
    console.log(`Walang Pasok Panic Agent backend listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to initialize backend:", error);
  process.exit(1);
});
