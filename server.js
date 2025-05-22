



require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const projectRoutes = require('./routes/projects');
const authRoutes = require('./routes/auth'); // Adiciona esta linha
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Conectado ao MongoDB!'))
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Rotas da API
app.use('/api/auth', authRoutes); // Adiciona esta linha para as rotas de autenticação
app.use('/api/projects', projectRoutes);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse em http://localhost:${PORT}`);
});
// ... outras configurações de app.use()
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Adiciona esta linha
// path.join é mais seguro para construir caminhos
// Se server.js não estiver na raiz, ajuste o caminho para 'uploads'
// Exemplo: se server.js está em uma pasta 'src', seria express.static(path.join(__dirname, '..', 'uploads'))

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
// ...
app.use('/api/users', userRoutes);