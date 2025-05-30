require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// 1. Importações de Rotas (cada uma declarada APENAS UMA VEZ)
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const userRoutes = require('./routes/users');     // Para perfis de usuário

// 2. Criação da instância do Express
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Configuração de Middlewares Globais
app.use(cors()); // Permite requisições de diferentes origens
app.use(express.json()); // Para parsear JSON no corpo das requisições
app.use(express.static(path.join(__dirname, 'public'))); // Serve arquivos estáticos da pasta 'public'
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve a pasta 'uploads' para as imagens dos projetos

// 4. Conexão com o Banco de Dados
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Conectado ao MongoDB!'))
    .catch(err => {
        console.error('Erro ao conectar ao MongoDB:', err.message);
        // Em um ambiente de produção, você pode querer encerrar o processo se o DB não conectar.
        // process.exit(1); 
    });

// 5. Definição e Montagem das Rotas da API (cada uma montada APENAS UMA VEZ)
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes); // As rotas para criar/listar comentários de um projeto (/:projectId/comments) estão dentro de projects.js
app.use('/api/users', userRoutes);       // Rotas para perfis de usuário (/:userId/profile)

// 6. Rota para servir o frontend (index.html) como fallback
// Esta rota deve vir DEPOIS das rotas da API para não interceptá-las.
app.get('*', (req, res) => {
    // Se a requisição não for para um endpoint da API conhecido, sirva o index.html
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        // Se for uma rota de API que não foi encontrada pelas definições acima
        res.status(404).json({ message: 'Endpoint da API não encontrado.' });
    }
});

// 7. Inicialização do Servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse em http://localhost:${PORT}`);
});