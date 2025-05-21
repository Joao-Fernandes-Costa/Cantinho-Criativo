const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
    text: {
        type: String,
        required: [true, 'O texto do comentário não pode estar vazio.'],
        trim: true,
        maxlength: [1000, 'O comentário não pode exceder 1000 caracteres.']
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'Project', // Referencia o modelo Project
        required: true,
        index: true // Bom para otimizar buscas por comentários de um projeto
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Referencia o modelo User
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Comment', commentSchema);