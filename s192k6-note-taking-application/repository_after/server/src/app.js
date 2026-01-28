const express = require("express");
const cors = require("cors");

const notesRoutes = require("./routes/notes");
const tagsRoutes = require("./routes/tags");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/notes", notesRoutes);
app.use("/api/tags", tagsRoutes);

app.use(errorHandler);

module.exports = app;
