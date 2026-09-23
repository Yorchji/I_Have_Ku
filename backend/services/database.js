import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const database = mysql.createPool({
  host: process.env.DBHOST,
  port: Number(process.env.DBPORT || 3306),
  user: process.env.DBUSER,
  password: process.env.DBPWD,
  database: process.env.DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
});

export default database;
