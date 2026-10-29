const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const db = require("../lib/db.js");

const derrubadas = db.apagarTodasAsSessoes("");
console.log(`${derrubadas} sessão(ões) encerrada(s). Todo mundo, inclusive o painel, precisa entrar de novo.`);
