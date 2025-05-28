const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');

// GET /api/users/:userId/profile (Obter perfil público e projetos de um usuário)
router.get('/:userId/profile', async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'ID de usuário inválido.' });
    }

    try {
        // Busca o usuário, selecionando apenas os campos públicos (exclui senha)
        const user = await User.findById(userId).select('username email createdAt');
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Busca os projetos criados por este usuário
        const projects = await Project.find({ user: userId })
            .populate('user', 'username') // Popula para consistência, embora o usuário principal já esteja sendo buscado
            .sort({ createdAt: -1 });

        res.json({ user, projects });

    } catch (error) {
        console.error("Erro ao buscar perfil do usuário:", error);
        res.status(500).json({ message: 'Erro no servidor ao buscar perfil do usuário: ' + error.message });
    }
});

module.exports = router;