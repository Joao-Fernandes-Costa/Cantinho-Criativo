document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos do DOM ---
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    const userInfoDiv = document.getElementById('user-info');
    const welcomeMessageEl = document.getElementById('welcomeMessage');
    const logoutButton = document.getElementById('logoutButton');
    const loginRegisterFormsDiv = document.getElementById('login-register-forms');
    
    const addProjectFormSection = document.getElementById('form-section');
    const projectForm = document.getElementById('addProjectForm'); // Form de adicionar projeto
    
    const projectsGrid = document.getElementById('projectsGrid');
    
    const editFormSection = document.getElementById('edit-form-section');
    const editProjectForm = document.getElementById('editProjectForm');
    const editProjectIdInput = document.getElementById('editProjectId');
    const editTitleInput = document.getElementById('editTitle');
    const editDescriptionInput = document.getElementById('editDescription');
    const editCategoryInput = document.getElementById('editCategory');
    const editProjectImageFileInput = document.getElementById('editProjectImageFile');
    const currentEditImage = document.getElementById('currentEditImage');
    const cancelEditButton = document.getElementById('cancelEditButton');

    const apiUrlBase = '/api';

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

    // --- Atualização da UI de Autenticação ---
    function updateAuthUI() {
        const token = getToken();
        const username = getCurrentUsername();

        if (token && username) {
            loginRegisterFormsDiv.style.display = 'none';
            userInfoDiv.style.display = 'block';
            welcomeMessageEl.textContent = `Bem-vindo(a), ${username}!`;
            addProjectFormSection.style.display = 'block';
        } else {
            loginRegisterFormsDiv.style.display = 'block';
            userInfoDiv.style.display = 'none';
            welcomeMessageEl.textContent = '';
            addProjectFormSection.style.display = 'none';
            editFormSection.style.display = 'none'; // Esconde form de edição se deslogado
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        }
        fetchProjects(); // Atualiza a lista de projetos e botões de ação
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
                if (!response.ok) throw new Error(data.message || 'Falha no registro.');
                alert(data.message || 'Registro bem-sucedido! Por favor, faça login.');
                registerForm.reset();
                showLoginLink.click();
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
                    body: JSON.stringify({ email: emailOrUsername, password })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Falha no login.');
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

    // --- Funções de CRUD de Projetos ---
    async function fetchProjects() {
        try {
            const response = await fetch(`${apiUrlBase}/projects`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const projects = await response.json();
            projectsGrid.innerHTML = '';
            if (projects.length === 0) {
                projectsGrid.innerHTML = '<p>Nenhum projeto encontrado. Adicione um!</p>';
                return;
            }
            const currentUserId = getCurrentUserId();
            projects.forEach(project => {
                const projectCard = document.createElement('div');
                projectCard.classList.add('project-card');
                let ownerActions = '';
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
                    <div class="actions">${ownerActions}</div>
                `;
                projectsGrid.appendChild(projectCard);
            });
        } catch (error) {
            console.error('Erro ao buscar projetos:', error);
            projectsGrid.innerHTML = '<p>Erro ao carregar projetos.</p>';
        }
    }

    if (projectForm) { // Adicionar Novo Projeto
        projectForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const title = document.getElementById('title').value;
            const description = document.getElementById('description').value;
            const category = document.getElementById('category').value;
            const projectImageFile = document.getElementById('projectImageFile').files[0];
            const token = getToken();

            if (!token) {
                alert('Você precisa estar logado para adicionar um projeto.');
                return;
            }
            if (!projectImageFile) {
                alert('Por favor, selecione uma imagem para o projeto.');
                return;
            }

            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('category', category);
            formData.append('projectImage', projectImageFile);

            try {
                const response = await fetch(`${apiUrlBase}/projects`, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: formData,
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || `HTTP error! status: ${response.status}`);
                projectForm.reset();
                fetchProjects();
                alert('Projeto adicionado com sucesso!');
            } catch (error) {
                console.error('Erro ao adicionar projeto:', error);
                alert('Erro ao adicionar projeto: ' + error.message);
            }
        });
    }

    // --- Funções para Edição de Projeto ---
    function openEditForm(project) {
        editProjectIdInput.value = project._id;
        editTitleInput.value = project.title;
        editDescriptionInput.value = project.description;
        editCategoryInput.value = project.category || '';
        currentEditImage.src = project.imageUrl || 'https://via.placeholder.com/300x200.png?text=Sem+Imagem';
        editProjectImageFileInput.value = ''; // Limpa seleção de arquivo anterior

        addProjectFormSection.style.display = 'none';
        editFormSection.style.display = 'block';
        editFormSection.scrollIntoView({ behavior: 'smooth' });
    }

    function closeEditForm() {
        editFormSection.style.display = 'none';
        if (getToken()) {
            addProjectFormSection.style.display = 'block';
        }
    }

    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', closeEditForm);
    }

    if (editProjectForm) { // Salvar Alterações do Projeto Editado
        editProjectForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const projectId = editProjectIdInput.value;
            console.log("Editando projeto com ID (no submit):", projectId);

            const title = editTitleInput.value;
            const description = editDescriptionInput.value;
            const category = editCategoryInput.value;
            const newImageFile = editProjectImageFileInput.files[0];
            const token = getToken();

            if (!token) {
                alert('Sua sessão expirou. Por favor, faça login novamente.');
                closeEditForm();
                updateAuthUI();
                return;
            }

            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('category', category);
            if (newImageFile) {
                formData.append('projectImage', newImageFile);
            }

            try {
                const response = await fetch(`${apiUrlBase}/projects/${projectId}`, { // USA CRASES AQUI
                    method: 'PUT',
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: formData
                });
                const data = await response.json();
                if (!response.ok) {
                     throw new Error(data.message || `HTTP error! status: ${response.status}`);
                }
                alert('Projeto atualizado com sucesso!');
                closeEditForm();
                fetchProjects();
            } catch (error) {
                console.error('Erro ao atualizar projeto:', error);
                if (error.name === 'SyntaxError' && error.message.includes('Unexpected token <')) {
                    alert('Erro ao atualizar projeto: Resposta inesperada do servidor. Verifique o console do backend Node.js.');
                } else {
                    alert('Erro ao atualizar projeto: ' + error.message);
                }
            }
        });
    }
    
    // Listener de cliques para botões de Editar/Deletar nos cards
    if (projectsGrid) {
        projectsGrid.addEventListener('click', async (event) => {
            const target = event.target;
            const projectId = target.dataset.id;

            if (target.classList.contains('edit-btn')) {
                const token = getToken();
                if (!token) {
                    alert('Você precisa estar logado para editar um projeto.');
                    return;
                }
                try {
                    const response = await fetch(`${apiUrlBase}/projects/${projectId}`);
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Não foi possível carregar dados do projeto para edição.');
                    }
                    const projectToEdit = await response.json();
                    openEditForm(projectToEdit);
                } catch (error) {
                    console.error("Erro ao buscar projeto para editar:", error);
                    alert("Erro ao carregar dados para edição: " + error.message);
                }
            } else if (target.classList.contains('delete-btn')) {
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
                            if (response.status === 401 || response.status === 403) {
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
                         if (error.name === 'SyntaxError' && error.message.includes('Unexpected token <')) {
                            alert('Erro ao deletar projeto: Resposta inesperada do servidor.');
                        } else if (!error.message.includes('permissão')) {
                           alert('Erro ao deletar projeto: ' + error.message);
                        }
                    }
                }
            }
        });
    }

    // --- Inicialização ---
    updateAuthUI(); // Chamada inicial para configurar a UI e buscar projetos
});