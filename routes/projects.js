const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const authMiddleware = require('../middleware/authMiddleware'); // Importa o middleware

// GET: Listar todos os projetos (PÚBLICO - não precisa de auth)
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 }).populate('user', 'username email'); // Adiciona 'populate' para ver nome do usuário
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar projetos: ' + err.message });
    }
});

// POST: Criar um novo projeto (PROTEGIDO - requer login)
router.post('/', authMiddleware, async (req, res) => { // Adiciona o authMiddleware aqui
    const { title, description, category, imageUrl } = req.body;

    if (!title || !description) {
        return res.status(400).json({ message: 'Título e descrição são obrigatórios.' });
    }

    try {
        const newProject = new Project({
            title,
            description,
            category,
            imageUrl: imageUrl || undefined,
            user: req.user.id // Associa o projeto ao ID do usuário logado (vindo do token)
        });

        const savedProject = await newProject.save();
        await savedProject.populate('user', 'username email'); // Popula após salvar para retornar
        res.status(201).json(savedProject);
    } catch (err) {
        res.status(400).json({ message: 'Erro ao salvar projeto: ' + err.message });
    }
});

// GET: Obter um projeto específico (PÚBLICO)
router.get('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('user', 'username email');
        if (!project) return res.status(404).json({ message: 'Projeto não encontrado' });
        res.json(project);
    } catch (err) {
        // Se o ID não for um ObjectId válido do Mongoose
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Projeto não encontrado (ID inválido)' });
        }
        res.status(500).json({ message: 'Erro ao buscar projeto: ' + err.message });
    }
});

// PUT: Atualizar um projeto (PROTEGIDO e apenas o dono)
router.put('/:id', authMiddleware, async (req, res) => {
    const { title, description, category, imageUrl } = req.body;

    try {
        let project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Projeto não encontrado' });
        }

        // Verifica se o usuário logado é o dono do projeto
        if (project.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Não autorizado a editar este projeto.' });
        }

        // Atualiza os campos
        if (title) project.title = title;
        if (description) project.description = description;
        if (category) project.category = category;
        if (imageUrl) project.imageUrl = imageUrl;
        // project.updatedAt = Date.now(); // Mongoose faz isso se timestamps: true no schema

        const updatedProject = await project.save();
        await updatedProject.populate('user', 'username email');
        res.json(updatedProject);

    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Projeto não encontrado (ID inválido)' });
        }
        res.status(500).json({ message: 'Erro ao atualizar projeto: ' + err.message });
    }
});

// DELETE: Deletar um projeto (PROTEGIDO e apenas o dono)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Projeto não encontrado para deletar' });
        }

        // Verifica se o usuário logado é o dono do projeto
        if (project.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Não autorizado a deletar este projeto.' });
        }

        await project.deleteOne(); // Mongoose v6+ usa deleteOne() em instâncias
        // Para versões anteriores, poderia ser project.remove()

        res.json({ message: 'Projeto deletado com sucesso!' });

    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Projeto não encontrado (ID inválido)' });
        }
        res.status(500).json({ message: 'Erro ao deletar projeto: ' + err.message });
    }
});

module.exports = router;