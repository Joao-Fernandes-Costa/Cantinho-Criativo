document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM para Autenticação
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    const userInfoDiv = document.getElementById('user-info');
    const welcomeMessageEl = document.getElementById('welcomeMessage');
    const logoutButton = document.getElementById('logoutButton');
    const loginRegisterFormsDiv = document.getElementById('login-register-forms');
    const addProjectFormSection = document.getElementById('form-section');


    // Elementos do DOM para Projetos
    const projectForm = document.getElementById('addProjectForm');
    const projectsGrid = document.getElementById('projectsGrid');
    const apiUrlBase = '/api'; // Base da API

    // --- Funções Auxiliares de Autenticação ---
    function getToken() {
        return localStorage.getItem('authToken');
    }
    function getCurrentUserId() {
        return localStorage.getItem('currentUserId');
    }
    function getCurrentUsername() {
        return localStorage.getItem('currentUsername');
    }

    function updateAuthUI() {
        const token = getToken();
        const username = getCurrentUsername();

        if (token && username) {
            loginRegisterFormsDiv.style.display = 'none';
            userInfoDiv.style.display = 'block';
            welcomeMessageEl.textContent = `Bem-vindo(a), ${username}!`;
            addProjectFormSection.style.display = 'block'; // Mostra form de adicionar projeto
        } else {
            loginRegisterFormsDiv.style.display = 'block';
            userInfoDiv.style.display = 'none';
            welcomeMessageEl.textContent = '';
            addProjectFormSection.style.display = 'none'; // Esconde form de adicionar projeto
            loginForm.style.display = 'block'; // Garante que login é o padrão se deslogado
            registerForm.style.display = 'none';
        }
        fetchProjects(); // Atualiza a lista de projetos (para mostrar/esconder botões de ação)
    }

    // --- Manipuladores de Eventos de Autenticação ---
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;

            try {
                const response = await fetch(`${apiUrlBase}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Falha no registro.');
                }
                alert(data.message || 'Registro bem-sucedido! Por favor, faça login.');
                registerForm.reset();
                showLoginLink.click(); // Mostra o formulário de login
            } catch (error) {
                alert('Erro no registro: ' + error.message);
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const emailOrUsername = document.getElementById('loginEmailOrUsername').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const response = await fetch(`${apiUrlBase}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailOrUsername, password }) // Backend espera 'email' para login
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Falha no login.');
                }

                localStorage.setItem('authToken', data.token);
                localStorage.setItem('currentUserId', data.userId);
                localStorage.setItem('currentUsername', data.username);

                alert('Login realizado com sucesso!');
                loginForm.reset();
                updateAuthUI();
            } catch (error) {
                alert('Erro no login: ' + error.message);
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('currentUsername');
            alert('Logout realizado com sucesso.');
            updateAuthUI();
        });
    }

    // --- Funções de Projetos ---
    async function fetchProjects() {
        try {
            const response = await fetch(`${apiUrlBase}/projects`); // Rota pública
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const projects = await response.json();
            projectsGrid.innerHTML = ''; // Limpa o grid

            if (projects.length === 0) {
                projectsGrid.innerHTML = '<p>Nenhum projeto encontrado. Adicione um!</p>';
                return;
            }

            const currentUserId = getCurrentUserId(); // Pega o ID do usuário logado

            projects.forEach(project => {
                const projectCard = document.createElement('div');
                projectCard.classList.add('project-card');

                let ownerActions = '';
                // Verifica se o usuário logado é o dono do projeto
                // project.user pode ser um objeto populado ou apenas um ID, então verificamos _id se for objeto
                const projectOwnerId = project.user && project.user._id ? project.user._id : project.user;

                if (currentUserId && projectOwnerId === currentUserId) {
                    ownerActions = `
                        <button class="edit-btn" data-id="${project._id}">Editar</button>
                        <button class="delete-btn" data-id="${project._id}">Deletar</button>
                    `;
                }

                const creatorUsername = project.user ? (project.user.username || 'Desconhecido') : 'Desconhecido';

                projectCard.innerHTML = `
                    <img src="${project.imageUrl || 'https://via.placeholder.com/300x200.png?text=Imagem+Padrão'}" alt="${project.title}">
                    <h3>${project.title}</h3>
                    <p class="category">Categoria: ${project.category || 'Não especificada'}</p>
                    <p class="creator">Criador: ${creatorUsername}</p>
                    <p>${project.description}</p>
                    <div class="actions">
                        ${ownerActions}
                    </div>
                `;
                projectsGrid.appendChild(projectCard);
            });
        } catch (error) {
            console.error('Erro ao buscar projetos:', error);
            projectsGrid.innerHTML = '<p>Erro ao carregar projetos. Tente novamente mais tarde.</p>';
        }
    }

    if (projectForm) {
        projectForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const title = document.getElementById('title').value;
            const description = document.getElementById('description').value;
            const category = document.getElementById('category').value;
            const projectImageFile = document.getElementById('projectImageFile').files[0]; // Pega o arquivo

            const token = getToken();
            if (!token) {
                alert('Você precisa estar logado para adicionar um projeto.');
                return;
            }

            if (!projectImageFile) { // Validação básica no frontend
                alert('Por favor, selecione uma imagem para o projeto.');
                return;
            }

            // Usa FormData para enviar arquivos e dados de texto
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('category', category);
            formData.append('projectImage', projectImageFile); // 'projectImage' é o nome do campo esperado pelo multer

            try {
                const response = await fetch(`${apiUrlBase}/projects`, {
                    method: 'POST',
                    headers: {
                        // NÃO defina 'Content-Type': 'application/json' quando usar FormData.
                        // O navegador definirá 'multipart/form-data' com o boundary correto.
                        'Authorization': 'Bearer ' + token
                    },
                    body: formData, // Envia o FormData
                });
                const data = await response.json(); // Tenta parsear como JSON (backend deve retornar JSON)

                if (!response.ok) {
                    throw new Error(data.message || `HTTP error! status: ${response.status}`);
                }
                projectForm.reset(); // Limpa o formulário, incluindo o campo de arquivo
                fetchProjects(); // Atualiza a lista
                alert('Projeto adicionado com sucesso!');
            } catch (error) {
                console.error('Erro ao adicionar projeto:', error);
                alert('Erro ao adicionar projeto: ' + error.message);
            }
        });
    }


    if (projectsGrid) {
        projectsGrid.addEventListener('click', async (event) => {
            const target = event.target;
            const projectId = target.dataset.id;

            if (target.classList.contains('delete-btn')) {
                const token = getToken();
                if (!token) {
                    alert('Você precisa estar logado para deletar um projeto.');
                    return;
                }
                if (confirm('Tem certeza que deseja deletar este projeto?')) {
                    try {
                        const response = await fetch(`${apiUrlBase}/projects/${projectId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': 'Bearer ' + token }
                        });
                        const data = await response.json();
                        if (!response.ok) {
                            if (response.status === 401 || response.status === 403) { // Não autorizado ou Proibido
                                alert(data.message || 'Você não tem permissão para deletar este projeto.');
                            } else {
                                throw new Error(data.message || `HTTP error! status: ${response.status}`);
                            }
                        } else {
                            fetchProjects();
                            alert(data.message || 'Projeto deletado com sucesso!');
                        }
                    } catch (error) {
                        console.error('Erro ao deletar projeto:', error);
                        if (!error.message.includes('permissão')) {
                            alert('Erro ao deletar projeto: ' + error.message);
                        }
                    }
                }
            } else if (target.classList.contains('edit-btn')) {
                // Placeholder para funcionalidade de Edição
                alert(`Funcionalidade de Editar para o projeto ID: ${projectId} ainda não implementada.`);
                // Aqui você implementaria a lógica para abrir um formulário de edição,
                // preenchê-lo com os dados do projeto e fazer uma requisição PUT.
            }
        });
    }

    // --- Inicialização ---
    updateAuthUI(); // Atualiza a UI com base no status de login ao carregar a página
    // fetchProjects(); // Já é chamado dentro de updateAuthUI
});