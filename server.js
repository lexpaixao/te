require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Client } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());clei

// Configuração do PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Função para criar tabelas se não existirem
async function criarTabelas() {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        cpf VARCHAR(14) NOT NULL,
        nome_usuario VARCHAR(100) NOT NULL,
        cep NUMERIC NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        telefone VARCHAR(11) NOT NULL,
        senha VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
      // Tabela de produto
    await client.query(`
      CREATE TABLE IF NOT EXISTS produto (
        id SERIAL PRIMARY KEY,
        nome_estabelecimento VARCHAR(69),
        estabelecimento_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
        nome_produto VARCHAR(100) NOT NULL,
        preco  NUMERIC NOT NULL,
        cep NUMERIC NOT NULL,
        descricao VARCHAR(100) NOT NULL,
        categoria VARCHAR(100) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
await client.query (`
    INSERT INTO produto (nome_estabelecimento, nome_produto, preco, cep, descricao, categoria)
VALUES 
('Mercearia Moura', 'Acucar Mascavo', 6.80, 46880000,  'Validos até 29-04-2026', 'produto de mercearia'),

('Superbom', 'Leite liquido domares', 3.90, 46880070,  'Leite liquido integral 1L valido até 07-05-26', 'produto de mercearia'),

('Doce Encanto', 'Morangos', 8.50, 46881900, '200g morangos orgânicos produzido pela agricultura familiar', 'Frutas'),

('Doce Encanto', 'Tomate',  2.80, 46881900, 'Tomates estragados, proprios para compostagem organica, venda por kilo. ', 'Frutas'),

('Doce Encanto', 'Doce de Banana', 18.00, 46883600,  '500g de doce artesanal de banana organica', 'Petiscos'),

('Cooperativa Tropical', 'Polpa de frutas diversas', 15.00, 46884-000, '50 polpas diversificadas de frutas organicas ', 'Congelados'),

('Axxair atacdista', 'feijao carioca', 5.00, 46885000, 'PROMOCAO, feijao carioca 1kg no precinho Validos até 19-05-2026 ou enquanto durar o estoque','produto de mercearia'),

('Axxair atacdista', 'arroz parbolizado', 24.00, 46887069, 'PROMOCAO, arroz parbolizado 5kg no precinho enquanto durar o estoque produto Validos até 03-04-2026 ','produto de mercearia')

ON CONFLICT DO NOTHING
  `);
    
    await client.query (`
    INSERT INTO usuarios (cpf, nome_usuario, cep, email, telefone, senha)
    VALUES ('52998224725', 'Alana Almeida', 40255169, 'alana@gmal.com', '71934256790', '1234')
    ON CONFLICT DO NOTHING;
    `);

     // Adiciona colunas caso não existam (seguro)
    console.log("Tabelas criadas com sucesso!");
  } catch (err) {
    console.error("Erro ao criar tabelas:", err);
  }
}

// Rota de teste
app.get("/", (req, res) => {
  res.send("API funcionando!");
});

// Rota de login
app.post("/api/login", async (req, res) => {
  try {
    const { cpf, senha } = req.body;

    const result = await client.query(
      "SELECT * FROM usuarios WHERE cpf = $1",
      [cpf]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ erro: "Usuário não encontrado" });
    }

    const usuario = result.rows[0];

    // Para testes rápidos sem hash:
    if (senha !== usuario.senha) {
      return res.status(401).json({ erro: "Senha incorreta" });
    }

    // Aqui você pode gerar token JWT real
    const token = "tokenbg-de-teste";

    res.json({ token, usuario: { id: usuario.id, nome: usuario.nome_usuario } });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

app.post("/api/cadastroproduto", async (req, res) => {
  try {
    const {nome_produto, preco, cep,  descricao, categoria} = req.body;

    if (!nome_produto|| !preco || !cep || !descricao || !categoria) {
      return res.status(400).json({ erro: "Preencha todos os campos." });
    }

    // const check = await client.query(
    //   "SELECT 1 FROM produto WHERE cep = $1",
    //   [cep]
    // );

    // if (check.rows.length) {
    //   return res.status(400).json({ erro: "Usuário já cadastrado." });
    // }

    await client.query(
      "INSERT INTO produto (nome_produto, preco, cep,  descricao, categoria) VALUES ($1, $2, $3, $4, $5)",
      [nome_produto, preco, cep,  descricao, categoria]
    );

    res.status(201).json({ mensagem: "Produto cadastrado com sucesso!" });

  } catch (err) {
    console.error("Erro no cadastro:", err);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

app.post("/api/cadastro", async (req, res) => {
  try {
    const {cpf, nome_usuario, cep,  email, telefone, senha } = req.body;

    if (!cpf|| !nome_usuario || !cep || !email || !telefone  || !senha) {
      return res.status(400).json({ erro: "Preencha todos os campos." });
    }

    const check = await client.query(
      "SELECT 1 FROM usuarios WHERE cpf = $1",
      [cpf]
    );

    if (check.rows.length) {
      return res.status(400).json({ erro: "Usuário já cadastrado." });
    }

    await client.query(
      "INSERT INTO usuarios (cpf, nome_usuario, cep, email, telefone, senha) VALUES ($1, $2, $3, $4, $5, $6)",
      [cpf, nome_usuario, cep, email, telefone, senha]
    );

    res.status(201).json({ mensagem: "Usuário cadastrado com sucesso!" });

  } catch (err) {
    console.error("Erro no cadastro:", err);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// GET /api/comercioproximo -> listar todos os produtos proximos
app.get("/api/comercioproximo", async (req, res) => {
  try {
    const query = `
      SELECT P.*
       FROM produto p
      WHERE p.cep BETWEEN 
    (SELECT cep - 100 FROM usuarios WHERE id = 1)
AND 
    (SELECT cep + 100 FROM usuarios WHERE id = 1)
      ORDER BY criado_em DESC;
    `;
    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar produto por cep:", err);
    res.status(500).json({ erro: "Erro ao buscar produto por cep" });
  }
});
// GET /api/produto -> listar todos os produtos
app.get("/api/produto", async (req, res) => {
  try {
    const query = `
      SELECT * FROM produto
      ORDER BY criado_em DESC;
    `;
    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar produto:", err);
    res.status(500).json({ erro: "Erro ao buscar produto" });
  }
});

// Inicia o servidor e cria tabelas
async function startServer() {
  try {
    await client.connect();
    console.log("Conectado ao PostgreSQL no Render");

    await criarTabelas();

    app.listen(process.env.PORT || 4000, () => {
      console.log("Servidor rodando...");
    });
  } catch (err) {
    console.error("Erro ao conectar no PostgreSQL:", err);
  }
}

startServer();
