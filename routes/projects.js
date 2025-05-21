const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User'); // Necessário para populate, se não feito em Project
const Comment = require('../models/Comment'); // Importa o modelo Comment
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configuração do Multer para armazenamento de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
        cb(null, true);
    } else {
        cb(new Error('Apenas arquivos de imagem (JPEG, PNG, GIF) são permitidos!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
    fileFilter: fileFilter
});

// Middleware de tratamento de erro específico do Multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Erro de Upload (Multer): ${err.message}` });
    } else if (err) {
        return res.status(400).json({ message: `Erro no Upload: ${err.message}` });
    }
    next(err); // Encaminha para o próximo error handler se não for erro do multer
};

// --- ROTAS DE PROJETOS ---

// GET: Listar todos os projetos (PÚBLICO)
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 }).populate('user', 'username email');
        res.json(projects);
    } catch (err) {
        console.error("Erro ao buscar projetos:", err);
        res.status(500).json({ message: 'Erro ao buscar projetos: ' + err.message });
    }
});

// POST: Criar um novo projeto (PROTEGIDO)
router.post('/', authMiddleware, upload.single('projectImage'), handleMulterError, async (req, res) => {
    try {
        const { title, description, category } = req.body;
        if (!title || !description) {
            if (req.file) await fs.unlink(req.file.path).catch(err => console.error("Cleanup failed for POST:", err.message));
            return res.status(400).json({ message: 'Título e descrição são obrigatórios.' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'Por favor, envie uma imagem para o projeto.' });
        }

        const newProject = new Project({
            title,
            description,
            category,
            imageUrl: '/uploads/' + req.file.filename,
            user: req.user.id
        });
        const savedProject = await newProject.save();
        await savedProject.populate('user', 'username email');
        res.status(201).json(savedProject);
    } catch (err) {
        if (req.file) await fs.unlink(req.file.path).catch(cleanupErr => console.error("Erro ao limpar arquivo (POST):", cleanupErr.message));
        console.error("Erro ao salvar projeto:", err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: Object.values(err.errors).map(val => val.message).join(', ') });
        }
        res.status(500).json({ message: 'Erro ao salvar projeto: ' + err.message });
    }
});

// GET: Obter um projeto específico (PÚBLICO)
router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID de projeto inválido.' });
        }
        const project = await Project.findById(req.params.id).populate('user', 'username email');
        if (!project) return res.status(404).json({ message: 'Projeto não encontrado.' });
        res.json(project);
    } catch (err) {
        console.error("Erro ao buscar projeto por ID:", err);
        res.status(500).json({ message: 'Erro ao buscar projeto: ' + err.message });
    }
});

// PUT: Atualizar um projeto (PROTEGIDO)
router.put('/:id', authMiddleware, upload.single('projectImage'), handleMulterError, async (req, res) => {
    try {
        const { title, description, category } = req.body;
        const projectId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            if (req.file) await fs.unlink(req.file.path).catch(err => console.error("Cleanup failed for PUT (invalid ID):", err.message));
            return res.status(400).json({ message: 'ID de projeto inválido.' });
        }

        let project = await Project.findById(projectId);
        if (!project) {
            if (req.file) await fs.unlink(req.file.path).catch(err => console.error("Cleanup failed for PUT (not found):", err.message));
            return res.status(404).json({ message: 'Projeto não encontrado.' });
        }

        if (project.user.toString() !== req.user.id) {
            if (req.file) await fs.unlink(req.file.path).catch(err => console.error("Cleanup failed for PUT (unauth):", err.message));
            return res.status(403).json({ message: 'Não autorizado a editar este projeto.' });
        }

        const oldImagePath = project.imageUrl;
        if (title !== undefined) project.title = title;
        if (description !== undefined) project.description = description;
        if (category !== undefined) project.category = category;

        if (req.file) {
            project.imageUrl = '/uploads/' + req.file.filename;
        }

        const updatedProject = await project.save();

        if (req.file && oldImagePath && oldImagePath !== project.imageUrl && !oldImagePath.includes('via.placeholder.com')) {
            try {
                await fs.unlink(path.join(__dirname, '..', oldImagePath));
            } catch (unlinkErr) {
                console.error(`Erro ao deletar imagem antiga ${oldImagePath}:`, unlinkErr.message);
            }
        }
        await updatedProject.populate('user', 'username email');
        res.json(updatedProject);
    } catch (err) {
        if (req.file) await fs.unlink(req.file.path).catch(cleanupErr => console.error("Erro ao limpar arquivo (PUT):", cleanupErr.message));
        console.error("Erro ao atualizar projeto:", err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: Object.values(err.errors).map(val => val.message).join(', ') });
        }
        res.status(500).json({ message: 'Erro ao atualizar projeto: ' + (err.message || 'Erro desconhecido') });
    }
});

// DELETE: Deletar um projeto (PROTEGIDO)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID de projeto inválido.' });
        }
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Projeto não encontrado para deletar.' });
        }
        if (project.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Não autorizado a deletar este projeto.' });
        }

        const imagePathToDelete = project.imageUrl;
        await project.deleteOne();

        if (imagePathToDelete && !imagePathToDelete.includes('via.placeholder.com')) {
            try {
                await fs.unlink(path.join(__dirname, '..', imagePathToDelete));
            } catch (fileError) {
                console.error(`Erro ao deletar arquivo de imagem ${imagePathToDelete}:`, fileError.message);
            }
        }
        res.json({ message: 'Projeto deletado com sucesso!' });
    } catch (err) {
        console.error("Erro ao deletar projeto:", err);
        res.status(500).json({ message: 'Erro ao deletar projeto: ' + err.message });
    }
});


// --- ROTAS PARA COMENTÁRIOS DE UM PROJETO ---

// POST /api/projects/:projectId/comments (Criar novo comentário - PROTEGIDO)
router.post('/:projectId/comments', authMiddleware, async (req, res) => {
    const { projectId } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
        return res.status(400).json({ message: 'O texto do comentário não pode estar vazio.' });
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ message: 'ID de projeto inválido para comentar.' });
    }

    try {
        const projectExists = await Project.findById(projectId);
        if (!projectExists) {
            return res.status(404).json({ message: 'Projeto não encontrado para comentar.' });
        }

        const newComment = new Comment({
            text,
            project: projectId,
            user: req.user.id
        });
        await newComment.save();
        const populatedComment = await Comment.findById(newComment._id).populate('user', 'username');
        res.status(201).json(populatedComment);
    } catch (error) {
        console.error("Erro ao criar comentário:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: Object.values(error.errors).map(val => val.message).join(', ') });
        }
        res.status(500).json({ message: 'Erro no servidor ao criar comentário: ' + error.message });
    }
});

// GET /api/projects/:projectId/comments (Listar comentários de um projeto - PÚBLICO)
router.get('/:projectId/comments', async (req, res) => {
    const { projectId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ message: 'ID de projeto inválido para listar comentários.' });
    }

    try {
        // Opcional: verificar se o projeto existe antes de buscar comentários
        // const projectExists = await Project.findById(projectId);
        // if (!projectExists) return res.status(404).json({ message: 'Projeto não encontrado.' });

        const comments = await Comment.find({ project: projectId })
            .populate('user', 'username')
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (error) {
        console.error("Erro ao buscar comentários:", error);
        res.status(500).json({ message: 'Erro no servidor ao buscar comentários: ' + error.message });
    }
});

module.exports = router;