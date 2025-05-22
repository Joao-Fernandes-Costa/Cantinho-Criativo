document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos do DOM (Definidos uma vez no topo) ---
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    const loginRegisterFormsDiv = document.getElementById('login-register-forms');
    
    // Elementos da Navbar
    const navProjectsLi = document.getElementById('nav-projects-li');
    const navAddProjectLi = document.getElementById('nav-add-project-li');
    const navAuthLi = document.getElementById('nav-auth-li');
    const navUserWelcomeLi = document.getElementById('nav-user-welcome-li');
    const navbarWelcomeMessage = document.getElementById('navbarWelcomeMessage');
    const navLogoutLi = document.getElementById('nav-logout-li');
    const navbarLogoutButton = document.getElementById('navbarLogoutButton');
    
    // Seções Principais da Página
    const authSection = document.getElementById('auth-section');
    const addProjectFormSection = document.getElementById('form-section');
    const projectsSection = document.getElementById('projects-section');
    const projectsGrid = document.getElementById('projectsGrid');
    const projectsSectionTitle = document.getElementById('projects-section-title'); // Para título da seção de projetos
    const showAllProjectsBtn = document.getElementById('show-all-projects-btn'); // Botão para ver todos os projetos
    
    const editFormSection = document.getElementById('edit-form-section');
    const editProjectForm = document.getElementById('editProjectForm');
    const editProjectIdField = document.getElementById('editProjectIdField');
    const editTitleInput = document.getElementById('editTitle');
    const editDescriptionInput = document.getElementById('editDescription');
    const editCategoryInput = document.getElementById('editCategory');
    const editProjectImageFileInput = document.getElementById('editProjectImageFile');
    const currentEditImage = document.getElementById('currentEditImage');
    const cancelEditButton = document.getElementById('cancelEditButton');

    const projectFormForAdd = document.getElementById('addProjectForm');

    const apiUrlBase = '/api';

    // --- Funções Auxiliares de Autenticação ---
    function getToken() { return localStorage.getItem('authToken'); }
    function getCurrentUserId() { return localStorage.getItem('currentUserId'); }
    function getCurrentUsername() { return localStorage.getItem('currentUsername'); }

    // --- Atualização da UI de Autenticação e Geral ---
    function updateAuthUI() {
        const token = getToken();
        const username = getCurrentUsername();

        // Navbar items
        if (navProjectsLi) navProjectsLi.style.display = (token && username) ? 'list-item' : 'none';
        if (navAddProjectLi) navAddProjectLi.style.display = (token && username) ? 'list-item' : 'none';
        if (navAuthLi) navAuthLi.style.display = (token && username) ? 'none' : 'list-item';
        
        if (navUserWelcomeLi) navUserWelcomeLi.style.display = (token && username) ? 'list-item' : 'none';
        if (navbarWelcomeMessage) {
            navbarWelcomeMessage.textContent = (token && username) ? `Olá, ${username}!` : '';
        }
        if (navLogoutLi) navLogoutLi.style.display = (token && username) ? 'list-item' : 'none';

        // Seções da Página
        if (token && username) { // Usuário LOGADO
            if (authSection) authSection.style.display = 'none';
            if (addProjectFormSection) addProjectFormSection.style.display = 'block'; // Torna visível para o link da navbar
            if (projectsSection) projectsSection.style.display = 'block';
            if (editFormSection) editFormSection.style.display = 'none'; 
            
            // Resetar título da seção de projetos para o padrão ao logar/atualizar UI
            if (projectsSectionTitle) projectsSectionTitle.textContent = 'Projetos Recentes';
            if (showAllProjectsBtn) showAllProjectsBtn.style.display = 'none';
            
            fetchProjects();
        } else { // Usuário DESLOGADO
            if (authSection) authSection.style.display = ''; // Permite que o CSS dite (deve ser flex para centralizar)
            if (loginRegisterFormsDiv) loginRegisterFormsDiv.style.display = 'block';
            if (loginForm) loginForm.style.display = 'block';
            if (registerForm) registerForm.style.display = 'none';
            
            if (addProjectFormSection) addProjectFormSection.style.display = 'none';
            if (projectsSection) projectsSection.style.display = 'none';
            if (editFormSection) editFormSection.style.display = 'none';
            if (projectsGrid) projectsGrid.innerHTML = '<p style="text-align:center; padding: 20px;">Faça login ou registre-se para ver e adicionar projetos.</p>';
            
            // Garante que o título e botão de "ver todos" estejam no estado padrão
            if (projectsSectionTitle) projectsSectionTitle.textContent = 'Projetos Recentes';
            if (showAllProjectsBtn) showAllProjectsBtn.style.display = 'none';
        }
    }

    // --- Manipuladores de Eventos de Autenticação ---
    if (showRegisterLink) showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); if (loginForm) loginForm.style.display = 'none'; if (registerForm) registerForm.style.display = 'block'; });
    if (showLoginLink) showLoginLink.addEventListener('click', (e) => { e.preventDefault(); if (registerForm) registerForm.style.display = 'none'; if (loginForm) loginForm.style.display = 'block'; });

    if (registerForm) registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const usernameInput = document.getElementById('registerUsername');
        const emailInput = document.getElementById('registerEmail');
        const passwordInput = document.getElementById('registerPassword');

        if (!usernameInput || !emailInput || !passwordInput) { alert("Erro nos campos de registro."); return; }
        const username = usernameInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;
        try {
            const response = await fetch(`${apiUrlBase}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha no registro.');
            alert(data.message || 'Registro bem-sucedido! Faça login.');
            registerForm.reset();
            if (showLoginLink) showLoginLink.click();
        } catch (error) { alert('Erro no registro: ' + error.message); }
    });

    if (loginForm) loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const emailOrUsernameInput = document.getElementById('loginEmailOrUsername');
        const passwordInput = document.getElementById('loginPassword');
        if (!emailOrUsernameInput || !passwordInput) { alert("Erro nos campos de login."); return;}
        const emailOrUsername = emailOrUsernameInput.value;
        const password = passwordInput.value;
        try {
            const response = await fetch(`${apiUrlBase}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailOrUsername, password }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha no login.');
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUserId', data.userId);
            localStorage.setItem('currentUsername', data.username);
            alert('Login realizado!');
            loginForm.reset();
            updateAuthUI();
            window.location.hash = ''; 
            window.location.hash = 'projects-section'; 
        } catch (error) { alert('Erro no login: ' + error.message); }
    });

    if (navbarLogoutButton) {
        navbarLogoutButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('currentUsername');
            alert('Logout realizado.');
            updateAuthUI();
            window.location.hash = ''; 
            window.location.hash = 'auth-section';
        });
    }

    // --- Funções de CRUD de Projetos ---
    async function renderProjects(projectsToRender, isUserProfileView = false, profileUsername = '') {
        if (!projectsGrid) return;
        projectsGrid.innerHTML = '';

        if (projectsToRender.length === 0) {
            if (isUserProfileView) {
                projectsGrid.innerHTML = `<p>${profileUsername} ainda não enviou projetos.</p>`;
            } else {
                projectsGrid.innerHTML = (getToken()) ? '<p>Nenhum projeto encontrado. Adicione um!</p>' : '<p style="text-align:center; padding: 20px;">Faça login ou registre-se para ver projetos.</p>';
            }
            return;
        }

        const currentUserId = getCurrentUserId();
        const token = getToken();

        projectsToRender.forEach(project => {
            const projectCard = document.createElement('div');
            projectCard.classList.add('project-card');
            const projectOwnerId = project.user && project.user._id ? project.user._id : project.user;
            let ownerActions = '';
            if (currentUserId && projectOwnerId === currentUserId) {
                ownerActions = `
                    <button class="edit-btn" data-id="${project._id}">Editar</button>
                    <button class="delete-btn" data-id="${project._id}">Deletar</button>
                `;
            }
            
            const creatorUsername = project.user ? (project.user.username || 'Anônimo') : 'Anônimo';
            // Link para perfil do criador, a menos que já esteja na visualização do perfil desse usuário
            const creatorDisplay = (isUserProfileView && project.user && project.user.username === profileUsername) 
                ? creatorUsername 
                : `<span class="creator-link" data-userid="${projectOwnerId}" style="color: blue; cursor: pointer; text-decoration: underline;">${creatorUsername}</span>`;

            projectCard.innerHTML = `
                <img src="${project.imageUrl || 'https://via.placeholder.com/300x200.png?text=Imagem+Padrão'}" alt="${project.title}">
                <h3>${project.title}</h3>
                <p class="category">Categoria: ${project.category || 'N/A'}</p>
                <p class="creator">Criador: ${creatorDisplay}</p>
                <p>${project.description ? project.description.replace(/\n/g, '<br>') : ''}</p>
                <div class="actions">${ownerActions}</div>
                <div class="comments-section">
                    <h4>Comentários</h4>
                    <div class="comments-list" id="comments-list-${project._id}"><small>Carregando...</small></div>
                    ${token ? `
                    <form class="add-comment-form" data-project-id="${project._id}">
                        <textarea name="commentText" placeholder="Adicione um comentário..." rows="2" required></textarea>
                        <button type="submit">Comentar</button>
                    </form>
                    ` : '<p><small>Faça login para comentar.</small></p>'}
                </div>
            `;
            projectsGrid.appendChild(projectCard);
            const commentsListContainer = projectCard.querySelector(`#comments-list-${project._id}`);
            if (commentsListContainer) {
                fetchAndDisplayComments(project._id, commentsListContainer);
            }
        });
    }

    async function fetchProjects() {
        if (!getToken()) return; // Só busca se logado
        try {
            const response = await fetch(`${apiUrlBase}/projects`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const projects = await response.json();
            renderProjects(projects); // Usa a nova função de renderização
        } catch (error) {
            console.error('Erro ao buscar projetos:', error);
            if (projectsGrid) projectsGrid.innerHTML = '<p>Erro ao carregar projetos.</p>';
        }
    }
    
    if (projectFormForAdd) projectFormForAdd.addEventListener('submit', async (event) => {
        event.preventDefault();
        const titleEl = document.getElementById('title');
        const descriptionEl = document.getElementById('description');
        const categoryEl = document.getElementById('category');
        const projectImageFileEl = document.getElementById('projectImageFile');
        
        if(!titleEl || !descriptionEl || !categoryEl || !projectImageFileEl) { alert("Campos do formulário não encontrados."); return; }

        const title = titleEl.value;
        const description = descriptionEl.value;
        const category = categoryEl.value;
        const projectImageFile = projectImageFileEl.files[0];
        const token = getToken();

        if (!token) { alert('Logue para adicionar projeto.'); return; }
        if (!projectImageFile) { alert('Selecione uma imagem.'); return; }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('projectImage', projectImageFile);

        try {
            const response = await fetch(`${apiUrlBase}/projects`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `HTTP error! status: ${response.status}`);
            projectFormForAdd.reset();
            updateAuthUI(); // Para re-exibir fetchProjects corretamente
            window.location.hash = '#projects-section'; 
            alert('Projeto adicionado!');
        } catch (error) { console.error('Erro ao adicionar projeto:', error); alert('Erro: ' + error.message); }
    });

    // --- Funções para Edição de Projeto ---
    function openEditForm(project) {
        if (!editFormSection || !editProjectIdField || !editTitleInput || !editDescriptionInput || !editCategoryInput || !currentEditImage || !editProjectImageFileInput) {
            console.error("Elementos do formulário de edição não encontrados."); return;
        }
        editProjectIdField.value = project._id;
        editTitleInput.value = project.title;
        editDescriptionInput.value = project.description;
        editCategoryInput.value = project.category || '';
        currentEditImage.src = project.imageUrl || 'https://via.placeholder.com/300x200.png?text=Sem+Imagem';
        editProjectImageFileInput.value = '';
        
        if (addProjectFormSection) addProjectFormSection.style.display = 'none';
        if (projectsSection) projectsSection.style.display = 'none';
        if (authSection) authSection.style.display = 'none';
        editFormSection.style.display = 'block';
        editFormSection.scrollIntoView({ behavior: 'smooth' });
    }

    function closeEditForm() {
        if (editFormSection) editFormSection.style.display = 'none';
        updateAuthUI(); // Deixa updateAuthUI decidir o que mostrar
        window.location.hash = '#projects-section';
    }

    if (cancelEditButton) cancelEditButton.addEventListener('click', closeEditForm);

    if (editProjectForm) editProjectForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!editProjectIdField || !editTitleInput || !editDescriptionInput || !editCategoryInput || !editProjectImageFileInput) { 
            alert("Campos do formulário de edição não encontrados."); return;
        }
        const projectId = editProjectIdField.value;
        const title = editTitleInput.value;
        const description = editDescriptionInput.value;
        const category = editCategoryInput.value;
        const newImageFile = editProjectImageFileInput.files[0];
        const token = getToken();

        if (!token) { alert('Sessão expirada. Faça login.'); closeEditForm(); updateAuthUI(); return; }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        if (newImageFile) formData.append('projectImage', newImageFile);

        try {
            const response = await fetch(`${apiUrlBase}/projects/${projectId}`, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `HTTP error! status: ${response.status}`);
            alert('Projeto atualizado!');
            closeEditForm();
            // fetchProjects(); // já é chamado por updateAuthUI que é chamado por closeEditForm
        } catch (error) {
            console.error('Erro ao atualizar projeto:', error);
            if (error.name === 'SyntaxError' && error.message.includes('<')) {
                alert('Erro: Resposta inesperada do servidor.');
            } else { alert('Erro: ' + error.message); }
        }
    });
    
    // --- Funções para Comentários ---
    async function fetchAndDisplayComments(projectId, commentsContainer) {
        if (!commentsContainer) return;
        try {
            const response = await fetch(`${apiUrlBase}/projects/${projectId}/comments`);
            if (!response.ok) {
                commentsContainer.innerHTML = '<small>Erro ao carregar comentários.</small>'; return;
            }
            const comments = await response.json();
            if (comments.length === 0) {
                commentsContainer.innerHTML = '<small>Nenhum comentário ainda.</small>'; return;
            }
            commentsContainer.innerHTML = '';
            comments.forEach(comment => {
                const commentDiv = document.createElement('div');
                commentDiv.classList.add('comment-item');
                const commentDate = new Date(comment.createdAt).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'});
                commentDiv.innerHTML = `
                    <p><strong>${comment.user ? comment.user.username : 'Anônimo'}</strong> <small>em ${commentDate}</small></p>
                    <p>${comment.text ? comment.text.replace(/\n/g, '<br>') : ''}</p> 
                `;
                commentsContainer.appendChild(commentDiv);
            });
        } catch (error) {
            console.error(`Erro nos comentários para ${projectId}:`, error);
            commentsContainer.innerHTML = '<small>Erro ao carregar comentários.</small>';
        }
    }

    // --- Funções para Perfil de Usuário ---
    async function fetchAndDisplayUserProfile(userId) {
        if (!projectsGrid || !projectsSectionTitle || !showAllProjectsBtn) return;
        try {
            const response = await fetch(`${apiUrlBase}/users/${userId}/profile`); // Corrigido para usar crases
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Não foi possível carregar o perfil.');
            
            const { user, projects } = data;

            if (projectsSectionTitle) projectsSectionTitle.textContent = `Projetos de ${user.username}`;
            if (showAllProjectsBtn) showAllProjectsBtn.style.display = 'inline-block';
            
            if (addProjectFormSection) addProjectFormSection.style.display = 'none';
            if (editFormSection) editFormSection.style.display = 'none';
            if (authSection) authSection.style.display = 'none'; // Garante que seção de auth está escondida
            if (projectsSection) projectsSection.style.display = 'block'; // Garante que seção de projetos está visível


            renderProjects(projects, true, user.username); // Passa flag e username para renderProjects

        } catch (error) {
            console.error("Erro ao buscar perfil:", error);
            alert("Erro ao carregar perfil: " + error.message);
            if (projectsGrid) projectsGrid.innerHTML = '<p>Não foi possível carregar o perfil.</p>';
            if (projectsSectionTitle) projectsSectionTitle.textContent = 'Projetos Recentes';
            if (showAllProjectsBtn) showAllProjectsBtn.style.display = 'none';
        }
    }
    
    if (showAllProjectsBtn) {
        showAllProjectsBtn.addEventListener('click', () => {
            if(projectsSectionTitle) projectsSectionTitle.textContent = 'Projetos Recentes';
            showAllProjectsBtn.style.display = 'none';
            fetchProjects(); 
            window.location.hash = '#projects-section';
        });
    }

    // --- Listener Global para Ações (Delegação de Eventos) ---
    if (projectsGrid) {
        projectsGrid.addEventListener('click', async (event) => {
            const target = event.target;
            let projectIdFromButton = null;
            const editButton = target.closest('.edit-btn');
            const deleteButton = target.closest('.delete-btn');
            const creatorLink = target.closest('.creator-link');

            if (editButton) projectIdFromButton = editButton.dataset.id;
            else if (deleteButton) projectIdFromButton = deleteButton.dataset.id;

            if (creatorLink) {
                const userIdToView = creatorLink.dataset.userid;
                if (userIdToView) {
                    fetchAndDisplayUserProfile(userIdToView);
                }
            } else if (editButton && projectIdFromButton) {
                const token = getToken();
                if (!token) { alert('Logue para editar.'); return; }
                try {
                    const response = await fetch(`${apiUrlBase}/projects/${projectIdFromButton}`);
                    if (!response.ok) throw new Error((await response.json()).message || 'Erro ao carregar projeto.');
                    openEditForm(await response.json());
                } catch (error) { console.error("Erro ao buscar para editar:", error); alert("Erro: " + error.message); }
            } 
            else if (deleteButton && projectIdFromButton) {
                const token = getToken();
                if (!token) { alert('Logue para deletar.'); return; }
                if (confirm('Deletar este projeto?')) {
                    try {
                        const response = await fetch(`${apiUrlBase}/projects/${projectIdFromButton}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.message || 'Erro ao deletar.');
                        // Se estivermos na visualização de perfil de um usuário, recarregue o perfil, senão todos os projetos.
                        if (showAllProjectsBtn && showAllProjectsBtn.style.display === 'inline-block') {
                            const currentProfileUserId = projectsGrid.dataset.profileUserId; // Precisamos de uma forma de saber qual perfil está sendo visto
                            if (currentProfileUserId) fetchAndDisplayUserProfile(currentProfileUserId);
                            else fetchProjects(); // Fallback
                        } else {
                            fetchProjects();
                        }
                        alert(data.message || 'Deletado!');
                    } catch (error) {
                        console.error('Erro ao deletar:', error);
                        if (error.name === 'SyntaxError' && error.message.includes('<')) alert('Erro: Resposta inesperada.'); else alert('Erro: ' + error.message);
                    }
                }
            }
        });

        projectsGrid.addEventListener('submit', async (event) => {
            if (event.target.classList.contains('add-comment-form')) {
                event.preventDefault();
                const form = event.target;
                const projectId = form.dataset.projectId;
                const commentTextArea = form.querySelector('textarea[name="commentText"]');
                const commentText = commentTextArea.value.trim();
                const token = getToken();

                if (!commentText) { alert('Comentário vazio.'); return; }
                if (!token) { alert('Logue para comentar.'); return; }

                try {
                    const response = await fetch(`${apiUrlBase}/projects/${projectId}/comments`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                        body: JSON.stringify({ text: commentText })
                    });
                    const newComment = await response.json();
                    if (!response.ok) throw new Error(newComment.message || 'Erro ao comentar.');
                    commentTextArea.value = '';
                    const commentsListContainer = document.getElementById(`comments-list-${projectId}`);
                    if (commentsListContainer) {
                         fetchAndDisplayComments(projectId, commentsListContainer);
                    }
                } catch (error) { console.error('Erro ao adicionar comentário:', error); alert('Erro: ' + error.message); }
            }
        });
    }

    // --- Inicialização ---
    updateAuthUI();
});