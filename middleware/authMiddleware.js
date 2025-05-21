const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Pega o token do header
    const authHeader = req.header('Authorization');

    // Verifica se não há token
    if (!authHeader) {
        return res.status(401).json({ message: 'Nenhum token, autorização negada.' });
    }

    // O token geralmente vem como "Bearer <token>"
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.status(401).json({ message: 'Formato de token inválido.' });
    }

    const token = tokenParts[1];

    try {
        // Verifica o token usando o seu JWT_SECRET
        if (!process.env.JWT_SECRET) {
            console.error("ERRO FATAL: JWT_SECRET não está definida no .env para verificação de token.");
            return res.status(500).send('Erro de configuração do servidor.');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Adiciona o usuário do payload do token ao objeto req
        // Isso torna req.user disponível nas rotas protegidas
        req.user = decoded.user;
        next(); // Passa para a próxima função (a rota em si)
    } catch (err) {
        res.status(401).json({ message: 'Token não é válido.' });
    }
};