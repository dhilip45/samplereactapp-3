require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN.split(",") } : undefined));
app.use(express.json());
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

let pool;

async function initDb() {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
  });

  // retry until MySQL is ready
  for (let i = 0; i < 20; i++) {
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
    } catch (e) {
      console.log("Waiting for DB...", e.code);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error("DB not reachable");
}

// CREATE
app.post("/api/applications", async (req, res) => {
  const { full_name, email, phone, position, experience, cover_letter } = req.body;
  if (!full_name || !email || !position)
    return res.status(400).json({ error: "full_name, email, position required" });
  const [r] = await pool.query(
    "INSERT INTO applications (full_name,email,phone,position,experience,cover_letter) VALUES (?,?,?,?,?,?)",
    [full_name, email, phone, position, experience || 0, cover_letter]
  );
  res.status(201).json({ id: r.insertId });
});

// READ all
app.get("/api/applications", async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM applications ORDER BY id DESC");
  res.json(rows);
});

// READ one
app.get("/api/applications/:id", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM applications WHERE id=?", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// UPDATE
app.put("/api/applications/:id", async (req, res) => {
  const { full_name, email, phone, position, experience, cover_letter } = req.body;
  await pool.query(
    "UPDATE applications SET full_name=?,email=?,phone=?,position=?,experience=?,cover_letter=? WHERE id=?",
    [full_name, email, phone, position, experience, cover_letter, req.params.id]
  );
  res.json({ message: "Updated" });
});

// DELETE
app.delete("/api/applications/:id", async (req, res) => {
  await pool.query("DELETE FROM applications WHERE id=?", [req.params.id]);
  res.json({ message: "Deleted" });
});

// health check (handy for `curl localhost:5000/api/health`)
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// error handler (Express 5 forwards rejected async handlers here)
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

const PORT = Number(process.env.PORT) || 5000;
initDb()
  .then(() => app.listen(PORT, "0.0.0.0", () => console.log(`API on ${PORT}`)))
  .catch((err) => {
    console.error(err);
    process.exit(1); // let Docker's restart policy try again
  });