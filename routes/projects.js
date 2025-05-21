const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path'); // Módulo 'path' do Node.js

// Configuração do Multer para armazenamento de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Pasta onde os arquivos serão salvos
    },
    filename: function (req, file, cb) {
        // Define o nome do arquivo: campo original + timestamp + extensão original
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
        cb(null, true); // Aceita o arquivo
    } else {
        cb(new Error('Apenas arquivos de imagem (JPEG, PNG, GIF) são permitidos!'), false); // Rejeita o arquivo
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5 // Limite de 5MB por arquivo
    },
    fileFilter: fileFilter
});

// GET: Listar todos os projetos (PÚBLICO)
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 }).populate('user', 'username email');
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar projetos: ' + err.message });
    }
});

// POST: Criar um novo projeto (PROTEGIDO - requer login e upload de imagem)
// Usamos upload.single('projectImage') onde 'projectImage' deve ser o nome do campo <input type="file" name="projectImage"> no frontend
router.post('/', authMiddleware, upload.single('projectImage'), async (req, res) => {
    const { title, description, category } = req.body;

    if (!title || !description) {
        return res.status(400).json({ message: 'Título e descrição são obrigatórios.' });
    }
    if (!req.file) { // Verifica se um arquivo foi enviado
        return res.status(400).json({ message: 'Por favor, envie uma imagem para o projeto.' });
    }

    try {
        const newProject = new Project({
            title,
            description,
            category,
            imageUrl: '/uploads/' + req.file.filename, // Salva o caminho da imagem
            user: req.user.id
        });

        const savedProject = await newProject.save();
        await savedProject.populate('user', 'username email');
        res.status(201).json(savedProject);
    } catch (err) {
        // Se houver erro após o upload (ex: validação do Mongoose), o arquivo já foi salvo.
        // Em um cenário de produção, você poderia querer deletar o arquivo órfão aqui.
        console.error("Erro ao salvar projeto no DB:", err);
        res.status(400).json({ message: 'Erro ao salvar projeto: ' + err.message });
    }
}, (error, req, res, next) => { // Middleware de tratamento de erro específico do Multer
    if (error instanceof multer.MulterError) {
        // Erro do Multer (ex: tamanho do arquivo)
        return res.status(400).json({ message: "Erro no upload (Multer): " + error.message });
    } else if (error) {
        // Outro erro (ex: filtro de arquivo)
        return res.status(400).json({ message: "Erro no upload: " + error.message });
    }
    next();
});


// GET: Obter um projeto específico (PÚBLICO)
router.get('/:id', async (req, res) => {
    // ... (código existente sem alterações)
    try {
        const project = await Project.findById(req.params.id).populate('user', 'username email');
        if (!project) return res.status(404).json({ message: 'Projeto não encontrado' });
        res.json(project);
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Projeto não encontrado (ID inválido)' });
        }
        res.status(500).json({ message: 'Erro ao buscar projeto: ' + err.message });
    }
});

// PUT: Atualizar um projeto (PROTEGIDO e apenas o dono)
// A atualização de imagem aqui é mais complexa:
// 1. Verificar se uma nova imagem foi enviada.
// 2. Se sim, fazer upload da nova, deletar a antiga do sistema de arquivos.
// Por simplicidade, este exemplo NÃO implementará a atualização da imagem.
// Apenas os campos de texto serão atualizáveis.
router.put('/:id', authMiddleware, async (req, res) => { // Não estamos usando multer aqui para simplificar
    const { title, description, category } = req.body;

    try {
        let project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Projeto não encontrado' });
        }

        if (project.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Não autorizado a editar este projeto.' });
        }

        if (title) project.title = title;
        if (description) project.description = description;
        if (category) project.category = category;
        // NOTA: Para atualizar a imagem, você precisaria adicionar upload.single() aqui,
        // obter req.file, salvar o novo caminho, e opcionalmente deletar o arquivo antigo project.imageUrl do sistema de arquivos.

        const updatedProject = await project.save();
        await updatedProject.populate('user', 'username email');
        res.json(updatedProject);

    } catch (err) {
        // ... (tratamento de erro existente)
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Projeto não encontrado (ID inválido)' });
        }
        res.status(500).json({ message: 'Erro ao atualizar projeto: ' + err.message });
    }
});

// DELETE: Deletar um projeto (PROTEGIDO e apenas o dono)
// Ao deletar, também devemos remover o arquivo de imagem do servidor.
router.delete('/:id', authMiddleware, async (req, res) => {
    const fs = require('fs').promises; // Módulo 'fs' para interagir com o sistema de arquivos

    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Projeto não encontrado para deletar' });
        }

        if (project.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Não autorizado a deletar este projeto.' });
        }

        const imagePath = path.join(__dirname, '..', project.imageUrl); // Constrói o caminho absoluto para a imagem

        await project.deleteOne();

        // Tenta deletar o arquivo de imagem associado
        try {
            await fs.unlink(imagePath); // Deleta o arquivo
            console.log(`Imagem ${imagePath} deletada com sucesso.`);
        } catch (fileError) {
            // Se o arquivo não existir ou houver outro erro, apenas loga.
            // Não impede a resposta de sucesso da deleção do projeto no DB.
            console.error(`Erro ao deletar arquivo de imagem ${imagePath}:`, fileError.message);
        }

        res.json({ message: 'Projeto deletado com sucesso!' });

    } catch (err) {
        // ... (tratamento de erro existente)
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Projeto não encontrado (ID inválido)' });
        }
        res.status(500).json({ message: 'Erro ao deletar projeto: ' + err.message });
    }
});

module.exports = router;