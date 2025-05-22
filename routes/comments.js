const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const authMiddleware = require('../middleware/authMiddleware');

// PUT /api/comments/:commentId (Editar um comentário)
router.put('/:commentId', authMiddleware, async (req, res) => {
    const { commentId } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
        return res.status(400).json({ message: 'O texto do comentário não pode estar vazio.' });
    }
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({ message: 'ID de comentário inválido.' });
    }

    try {
        let comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comentário não encontrado.' });
        }

        // Verifica se o usuário logado é o dono do comentário
        if (comment.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Não autorizado a editar este comentário.' });
        }

        comment.text = text.trim();
        comment.updatedAt = Date.now(); // Opcional, se você quiser rastrear atualizações
        await comment.save();

        // Popula o usuário para retornar o nome de usuário com o comentário atualizado
        const populatedComment = await Comment.findById(comment._id).populate('user', 'username');
        
        res.json(populatedComment);

    } catch (error) {
        console.error("Erro ao atualizar comentário:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Erro no servidor ao atualizar comentário: ' + error.message });
    }
});

// DELETE /api/comments/:commentId (Deletar um comentário)
router.delete('/:commentId', authMiddleware, async (req, res) => {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({ message: 'ID de comentário inválido.' });
    }

    try {
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comentário não encontrado.' });
        }

        // Verifica se o usuário logado é o dono do comentário
        if (comment.user.toString() !== req.user.id) {
            // Futuramente, aqui você poderia adicionar a lógica para permitir que o dono do PROJETO também delete.
            // Ex: const project = await Project.findById(comment.project);
            // if (project.user.toString() !== req.user.id) { /* então não autorizado */ }
            return res.status(403).json({ message: 'Não autorizado a deletar este comentário.' });
        }

        await comment.deleteOne(); // Mongoose v6+
        // Em versões antigas: await Comment.findByIdAndRemove(commentId); ou await comment.remove();

        res.json({ message: 'Comentário deletado com sucesso.' });

    } catch (error) {
        console.error("Erro ao deletar comentário:", error);
        res.status(500).json({ message: 'Erro no servidor ao deletar comentário: ' + error.message });
    }
});

module.exports = router;