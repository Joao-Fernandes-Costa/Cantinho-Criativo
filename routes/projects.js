const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Adicionado para verificar ObjectId
const Project = require('../models/Project');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configuração do Multer para armazenamento de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Pasta onde os arquivos serão salvos
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
        cb(null, true); // Aceita o arquivo
    } else {
        // Rejeita o arquivo e passa um erro
        cb(new Error('Apenas arquivos de imagem (JPEG, PNG, GIF) são permitidos!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5 // Limite de 5MB por arquivo
    },
    fileFilter: fileFilter
});

// Middleware de tratamento de erro específico do Multer (para ser usado após 'upload')
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) { // Erro conhecido do Multer
        return res.status(400).json({ message: `Erro de Upload (Multer): ${err.message}` });
    } else if (err) { // Outro erro (ex: filtro de arquivo, ou erro inesperado do multer)
        return res.status(400).json({ message: `Erro no Upload: ${err.message}` });
    }
    // Se não houve erro do multer, mas talvez um erro posterior na rota, chame next()
    // No entanto, este handler é mais para erros *durante* o processamento do multer.
    next(err); // Encaminha outros erros, se houver
};


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
        // req.body é populado pelo multer aqui
        const { title, description, category } = req.body;

        if (!title || !description) {
            if (req.file) await fs.unlink(req.file.path).catch(err => console.error("Cleanup failed:", err));
            return res.status(400).json({ message: 'Título e descrição são obrigatórios.' });
        }
        if (!req.file) { // Multer coloca o arquivo em req.file
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
        if (req.file) { // Se erro após upload, deleta arquivo órfão
            await fs.unlink(req.file.path).catch(cleanupErr => console.error("Erro ao limpar arquivo de upload após erro na rota POST:", cleanupErr));
        }
        console.error("Erro ao salvar projeto no DB:", err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
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
        if (!project) return res.status(404).json({ message: 'Projeto não encontrado' });
        res.json(project);
    } catch (err) {
        console.error("Erro ao buscar projeto por ID:", err);
        res.status(500).json({ message: 'Erro ao buscar projeto: ' + err.message });
    }
});

// PUT: Atualizar um projeto (PROTEGIDO)
router.put('/:id', authMiddleware, upload.single('projectImage'), handleMulterError, async (req, res) => {
    try {
        // req.body é populado pelo multer aqui
        const { title, description, category } = req.body;
        const projectId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            if (req.file) await fs.unlink(req.file.path).catch(err => console.error("Cleanup failed:", err));
            return res.status(400).json({ message: 'ID de projeto inválido.' });
        }

        let project = await Project.findById(projectId);
        if (!project) {
            if (req.file) await fs.unlink(req.file.path).catch(err => console.error("Cleanup failed:", err));
            return res.status(404).json({ message: 'Projeto não encontrado' });
        }

        if (project.user.toString() !== req.user.id) {
            if (req.file) await fs.unlink(req.file.path).catch(err => console.error("Cleanup failed for unauth file:", err));
            return res.status(403).json({ message: 'Não autorizado a editar este projeto.' });
        }

        const oldImagePath = project.imageUrl;

        // Atualiza campos de texto somente se foram enviados no corpo da requisição
        // Multer pode criar um req.body vazio se apenas um arquivo for enviado
        // E os campos podem não estar presentes se o FormData não os incluiu.
        if (title !== undefined) project.title = title;
        if (description !== undefined) project.description = description;
        if (category !== undefined) project.category = category;

        if (req.file) { // Se uma nova imagem foi enviada
            project.imageUrl = '/uploads/' + req.file.filename;
        }

        const updatedProject = await project.save();

        if (req.file && oldImagePath && oldImagePath !== project.imageUrl && !oldImagePath.includes('via.placeholder.com')) {
            try {
                const fullOldPath = path.join(__dirname, '..', oldImagePath);
                await fs.unlink(fullOldPath);
            } catch (unlinkErr) {
                console.error(`Erro ao deletar imagem antiga ${oldImagePath}:`, unlinkErr.message);
            }
        }
        await updatedProject.populate('user', 'username email');
        res.json(updatedProject);

    } catch (err) {
        if (req.file) {
            await fs.unlink(req.file.path).catch(cleanupErr => console.error("Erro ao limpar arquivo de upload após erro na rota PUT:", cleanupErr));
        }
        console.error("Erro interno ao atualizar projeto:", err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Erro ao atualizar projeto: ' + (err.message || 'Erro desconhecido no servidor') });
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
            return res.status(404).json({ message: 'Projeto não encontrado para deletar' });
        }

        if (project.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Não autorizado a deletar este projeto.' });
        }

        const imagePathToDelete = project.imageUrl;
        await project.deleteOne(); // Usar deleteOne() na instância do Mongoose v6+

        if (imagePathToDelete && !imagePathToDelete.includes('via.placeholder.com')) {
            try {
                const fullPath = path.join(__dirname, '..', imagePathToDelete);
                await fs.unlink(fullPath);
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

module.exports = router;