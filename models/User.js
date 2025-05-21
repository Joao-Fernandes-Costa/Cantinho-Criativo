const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'O nome de usuário é obrigatório.'],
        unique: true,
        trim: true,
        minlength: [3, 'O nome de usuário deve ter pelo menos 3 caracteres.']
    },
    email: { // Opcional, mas bom para recuperação de senha no futuro
        type: String,
        required: [true, 'O email é obrigatório.'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/.+\@.+\..+/, 'Por favor, insira um email válido.']
    },
    password: {
        type: String,
        required: [true, 'A senha é obrigatória.'],
        minlength: [6, 'A senha deve ter pelo menos 6 caracteres.']
    }
}, {
    timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// Middleware (hook) para criptografar a senha ANTES de salvar o usuário
userSchema.pre('save', async function(next) {
    // Só criptografa a senha se ela foi modificada (ou é nova)
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10); // Gera um "salt" para a criptografia
        this.password = await bcrypt.hash(this.password, salt); // Criptografa a senha
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar a senha fornecida com a senha armazenada (criptografada)
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);