require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN.split(",") } : undefined));
app.use(express.json());

let pool;

/**
 * Initialize the MySQL connection pool and retry until the database accepts connections
 * and the `applications` table exists.
 */
async function initDb() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "docker_practice",
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const maxAttempts = 20;
  const retryDelayMs = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS applications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          full_name VARCHAR(100) NOT NULL,
          email VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          position VARCHAR(100) NOT NULL,
          experience INT DEFAULT 0,
          cover_letter TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
      console.log("DB ready");
      return;
    } catch (err) {
      console.log(`Waiting for DB (attempt ${attempt}/${maxAttempts})...`, err.code || err.message);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  throw new Error("DB not reachable after maximum retries");
}

function parseId(rawId) {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeApplication(body) {
  const { full_name, email, phone, position, experience, cover_letter } = body || {};
  const trimmedName = typeof full_name === "string" ? full_name.trim() : "";
  const trimmedEmail = typeof email === "string" ? email.trim() : "";
  const trimmedPosition = typeof position === "string" ? position.trim() : "";

  if (!trimmedName || !trimmedEmail || !trimmedPosition) {
    return { error: "full_name, email, and position are required" };
  }

  let parsedExperience = 0;
  if (experience !== undefined && experience !== null && experience !== "") {
    const num = Number(experience);
    if (!Number.isFinite(num) || num < 0) {
      return { error: "experience must be a non-negative number" };
    }
    parsedExperience = Math.floor(num);
  }

  return {
    data: {
      full_name: trimmedName,
      email: trimmedEmail,
      phone: phone !== undefined && phone !== null && String(phone).trim() !== "" ? String(phone).trim() : null,
      position: trimmedPosition,
      experience: parsedExperience,
      cover_letter:
        cover_letter !== undefined && cover_letter !== null && String(cover_letter).trim() !== ""
          ? String(cover_letter).trim()
          : null,
    },
  };
}

// CREATE
app.post("/api/applications", async (req, res) => {
  const { data, error } = normalizeApplication(req.body);
  if (error) return res.status(400).json({ error });

  const [result] = await pool.query(
    "INSERT INTO applications (full_name, email, phone, position, experience, cover_letter) VALUES (?, ?, ?, ?, ?, ?)",
    [data.full_name, data.email, data.phone, data.position, data.experience, data.cover_letter]
  );
  res.status(201).json({ id: result.insertId });
});

// READ all
app.get("/api/applications", async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM applications ORDER BY id DESC");
  res.json(rows);
});

// READ one
app.get("/api/applications/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid application id" });

  const [rows] = await pool.query("SELECT * FROM applications WHERE id = ?", [id]);
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// UPDATE
app.put("/api/applications/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid application id" });

  const { data, error } = normalizeApplication(req.body);
  if (error) return res.status(400).json({ error });

  const [result] = await pool.query(
    "UPDATE applications SET full_name = ?, email = ?, phone = ?, position = ?, experience = ?, cover_letter = ? WHERE id = ?",
    [data.full_name, data.email, data.phone, data.position, data.experience, data.cover_letter, id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
  res.json({ message: "Updated" });
});

// DELETE
app.delete("/api/applications/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid application id" });

  const [result] = await pool.query("DELETE FROM applications WHERE id = ?", [id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
  res.json({ message: "Deleted" });
});

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    console.error("Health check DB error:", err.message);
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

// Error handler (Express 5 forwards rejected async handlers here)
app.use((err, _req, res, _next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

const PORT = Number(process.env.PORT) || 5000;
let server;

initDb()
  .then(() => {
    server = app.listen(PORT, "0.0.0.0", () => console.log(`API listening on 0.0.0.0:${PORT}`));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (pool) {
    await pool.end();
  }
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
