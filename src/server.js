const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// 1. ROTA PARA SALVAR UMA NOVA TRANSAÇÃO (POST)
app.post('/transactions', async (req, res) => {
  try {
    const { description, category, amount, type, paymentMethod, date } = req.body;

    // Validação básica para não salvar dado incompleto
    if (!description || !category || amount === undefined || !type || !paymentMethod) {
      return res.status(400).json({ error: "Por favor, preencha todos os campos obrigatórios." });
    }

    // 🛡️ TRATAMENTO DE VALOR INTEGRADO:
    // Se o front já mandou como número limpo, usa direto. Se for string, limpa.
    const parsedAmount = (() => {
      if (typeof amount === 'number') return amount;
      
      const valueStr = String(amount).trim();
      const cleanValue = valueStr
        .replace(/\./g, '') // Remove pontos de milhar
        .replace(',', '.');  // Transforma vírgula em ponto
      return parseFloat(cleanValue) || 0;
    })();

    const newTransaction = await prisma.transaction.create({
      data: {
        description,
        category,
        amount: parsedAmount, // Salvando o número perfeitamente formatado
        type,
        paymentMethod,
        date: date ? new Date(date) : new Date(),
      },
    });

    return res.status(201).json({ message: "Transação salva com sucesso!", data: newTransaction });
  } catch (error) {
    console.error("Erro ao criar transação:", error);
    return res.status(500).json({ error: "Não foi possível salvar a transação." });
  }
});

// 2. ROTA PARA RESUMO/DASHBOARD (GET /transactions/balance)
app.get('/transactions/balance', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany();

    let income = 0;   
    let expense = 0;  

    transactions.forEach(transaction => {
      const typeLower = transaction.type?.toLowerCase().trim();
      if (typeLower === 'receita' || typeLower === 'income' || typeLower === 'entrada') {
        income += transaction.amount;
      } else if (typeLower === 'gasto' || typeLower === 'expense' || typeLower === 'saída' || typeLower === 'saida') {
        expense += transaction.amount;
      }
    });

    const total = income - expense;

    return res.json({ income, expense, total });
  } catch (error) {
    console.error("Erro ao calcular o balanço:", error);
    return res.status(500).json({ error: "Não foi possível carregar o resumo financeiro." });
  }
});

// 3. ROTA PARA DELETAR UMA TRANSAÇÃO PELO ID (DELETE)
app.delete('/transactions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const transactionExists = await prisma.transaction.findUnique({
      where: { id: id }
    });

    if (!transactionExists) {
      return res.status(404).json({ error: "Transação não encontrada." });
    }

    await prisma.transaction.delete({
      where: { id: id },
    });
    
    return res.status(200).json({ message: "Transação deletada com sucesso!" });
  } catch (error) {
    console.error("Erro ao deletar transação:", error);
    return res.status(500).json({ error: "Não foi possível deletar a transação." });
  }
});

// 4. ROTA PARA LISTAR TODAS AS TRANSAÇÕES (GET)
app.get('/transactions', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
    });
    return res.json(transactions);
  } catch (error) {
    console.error("Erro ao listar transações:", error);
    return res.status(500).json({ error: "Não foi possível listar as transações." });
  }
});

app.get('/', (req, res) => {
  res.send('API do Aplicativo de Gastos Rodando!');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});