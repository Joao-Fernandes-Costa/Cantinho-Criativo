const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Rota de Registro: POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Por favor, forneça nome de usuário, email e senha.' });
    }

    try {
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: 'Usuário ou email já existe.' });
        }

        user = new User({ username, email, password });
        await user.save();

        // Opcional: Gerar token JWT e logar o usuário imediatamente após o registro
        // const payload = { user: { id: user.id, username: user.username } };
        // const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        // res.status(201).json({ token, message: 'Usuário registrado com sucesso!' });

        res.status(201).json({ message: 'Usuário registrado com sucesso! Por favor, faça o login.' });

    } catch (error) {
        // Verifica erros de validação do Mongoose
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        console.error(error.message);
        res.status(500).send('Erro no servidor ao registrar usuário.');
    }
});

// Rota de Login: POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body; // Pode ser username ou email

    if (!email || !password) {
        return res.status(400).json({ message: 'Por favor, forneça email e senha.' });
    }

    try {
        // Permite login com email ou username
        const user = await User.findOne({ $or: [{ email: email }, { username: email }] });
        if (!user) {
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }

        // Usuário autenticado, criar JWT
        const payload = {
            user: {
                id: user.id,
                username: user.username
            }
        };

        // Adicione uma JWT_SECRET no seu arquivo .env! Ex: JWT_SECRET=meusegredomuitosecreto123
        if (!process.env.JWT_SECRET) {
            console.error("ERRO FATAL: JWT_SECRET não está definida no .env");
            return res.status(500).send('Erro de configuração do servidor.');
        }

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' }, // Token expira em 1 hora (pode ser '1d', '7d', etc.)
            (err, token) => {
                if (err) throw err;
                res.json({ token, userId: user.id, username: user.username });
            }
        );

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Erro no servidor ao fazer login.');
    }
});

module.exports = router;