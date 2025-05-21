const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: 'Geral'
    },
    imageUrl: {
        type: String,
        default: 'https://via.placeholder.com/300x200.png?text=Meu+Projeto'
    },
    user: { // Novo campo para referenciar o criador do projeto
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Referencia o modelo 'User'
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Project', projectSchema);