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
    const projectForm = document.getElementById('addProjectForm');
    
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
    function getToken() { return localStorage.getItem('authToken'); }
    function getCurrentUserId() { return localStorage.getItem('currentUserId'); }
    function getCurrentUsername() { return localStorage.getItem('currentUsername'); }

    // --- Atualização da UI de Autenticação e Geral ---
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
            editFormSection.style.display = 'none';
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        }
        fetchProjects();
    }

    // --- Manipuladores de Eventos de Autenticação ---
    if (showRegisterLink) showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; registerForm.style.display = 'block'; });
    if (showLoginLink) showLoginLink.addEventListener('click', (e) => { e.preventDefault(); registerForm.style.display = 'none'; loginForm.style.display = 'block'; });

    if (registerForm) registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        try {
            const response = await fetch(`${apiUrlBase}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha no registro.');
            alert(data.message || 'Registro bem-sucedido! Por favor, faça login.');
            registerForm.reset();
            showLoginLink.click();
        } catch (error) { alert('Erro no registro: ' + error.message); }
    });

    if (loginForm) loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const emailOrUsername = document.getElementById('loginEmailOrUsername').value;
        const password = document.getElementById('loginPassword').value;
        try {
            const response = await fetch(`${apiUrlBase}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailOrUsername, password }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha no login.');
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUserId', data.userId);
            localStorage.setItem('currentUsername', data.username);
            alert('Login realizado com sucesso!');
            loginForm.reset();
            updateAuthUI();
        } catch (error) { alert('Erro no login: ' + error.message); }
    });

    if (logoutButton) logoutButton.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('currentUsername');
        alert('Logout realizado com sucesso.');
        updateAuthUI();
    });

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
            const token = getToken();

            projects.forEach(project => {
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
                projectCard.innerHTML = `
                    <img src="${project.imageUrl || 'https://via.placeholder.com/300x200.png?text=Imagem+Padrão'}" alt="${project.title}">
                    <h3>${project.title}</h3>
                    <p class="category">Categoria: ${project.category || 'N/A'}</p>
                    <p class="creator">Criador: ${creatorUsername}</p>
                    <p>${project.description.replace(/\n/g, '<br>')}</p>
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
                fetchAndDisplayComments(project._id, projectCard.querySelector(`#comments-list-${project._id}`));
            });
        } catch (error) {
            console.error('Erro ao buscar projetos:', error);
            projectsGrid.innerHTML = '<p>Erro ao carregar projetos.</p>';
        }
    }

    if (projectForm) projectForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const category = document.getElementById('category').value;
        const projectImageFile = document.getElementById('projectImageFile').files[0];
        const token = getToken();
        if (!token) { alert('Você precisa estar logado.'); return; }
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
            projectForm.reset();
            fetchProjects();
            alert('Projeto adicionado!');
        } catch (error) { console.error('Erro ao adicionar projeto:', error); alert('Erro: ' + error.message); }
    });

    // --- Funções para Edição de Projeto ---
    function openEditForm(project) {
        editProjectIdInput.value = project._id;
        editTitleInput.value = project.title;
        editDescriptionInput.value = project.description;
        editCategoryInput.value = project.category || '';
        currentEditImage.src = project.imageUrl || 'https://via.placeholder.com/300x200.png?text=Sem+Imagem';
        editProjectImageFileInput.value = '';
        addProjectFormSection.style.display = 'none';
        editFormSection.style.display = 'block';
        editFormSection.scrollIntoView({ behavior: 'smooth' });
    }
    function closeEditForm() {
        editFormSection.style.display = 'none';
        if (getToken()) addProjectFormSection.style.display = 'block';
    }
    if (cancelEditButton) cancelEditButton.addEventListener('click', closeEditForm);

    if (editProjectForm) editProjectForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const projectId = editProjectIdInput.value;
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
            fetchProjects();
        } catch (error) {
            console.error('Erro ao atualizar projeto:', error);
            if (error.name === 'SyntaxError' && error.message.includes('<')) {
                alert('Erro: Resposta inesperada do servidor. Verifique console do backend.');
            } else { alert('Erro: ' + error.message); }
        }
    });
    
    // --- Funções para Comentários ---
    async function fetchAndDisplayComments(projectId, commentsContainer) {
        if (!commentsContainer) return;
        try {
            const response = await fetch(`${apiUrlBase}/projects/${projectId}/comments`);
            if (!response.ok) {
                console.error(`Erro ${response.status} ao buscar comentários para ${projectId}`);
                commentsContainer.innerHTML = '<small>Não foi possível carregar comentários.</small>';
                return;
            }
            const comments = await response.json();
            if (comments.length === 0) {
                commentsContainer.innerHTML = '<small>Nenhum comentário. Seja o primeiro!</small>';
                return;
            }
            commentsContainer.innerHTML = '';
            comments.forEach(comment => {
                const commentDiv = document.createElement('div');
                commentDiv.classList.add('comment-item');
                const commentDate = new Date(comment.createdAt).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'});
                commentDiv.innerHTML = `
                    <p><strong>${comment.user ? comment.user.username : 'Anônimo'}</strong> <small>em ${commentDate}</small></p>
                    <p>${comment.text.replace(/\n/g, '<br>')}</p> 
                `;
                commentsContainer.appendChild(commentDiv);
            });
        } catch (error) {
            console.error(`Erro na requisição de comentários para ${projectId}:`, error);
            commentsContainer.innerHTML = '<small>Erro ao carregar comentários.</small>';
        }
    }

    // --- Listener Global para Ações em Projetos e Comentários (Delegação de Eventos) ---
    if (projectsGrid) {
        projectsGrid.addEventListener('click', async (event) => {
            const target = event.target;
            const projectId = target.closest('.project-card')?.querySelector('.edit-btn, .delete-btn')?.dataset.id || target.dataset.id;

            // Ação de Editar Projeto
            if (target.classList.contains('edit-btn')) {
                const token = getToken();
                if (!token) { alert('Logue para editar.'); return; }
                try {
                    const response = await fetch(`${apiUrlBase}/projects/${projectId}`);
                    if (!response.ok) throw new Error((await response.json()).message || 'Erro ao carregar projeto.');
                    openEditForm(await response.json());
                } catch (error) { console.error("Erro ao buscar para editar:", error); alert("Erro: " + error.message); }
            } 
            // Ação de Deletar Projeto
            else if (target.classList.contains('delete-btn')) {
                const token = getToken();
                if (!token) { alert('Logue para deletar.'); return; }
                if (confirm('Deletar este projeto?')) {
                    try {
                        const response = await fetch(`${apiUrlBase}/projects/${projectId}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.message || 'Erro ao deletar.');
                        fetchProjects();
                        alert(data.message || 'Deletado!');
                    } catch (error) {
                        console.error('Erro ao deletar:', error);
                        if (error.name === 'SyntaxError') alert('Erro: Resposta inesperada.'); else alert('Erro: ' + error.message);
                    }
                }
            }
        });
        // Listener para submit de formulário de comentário (delegação)
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
                    fetchAndDisplayComments(projectId, document.getElementById(`comments-list-${projectId}`));
                } catch (error) { console.error('Erro ao adicionar comentário:', error); alert('Erro: ' + error.message); }
            }
        });
    }

    // --- Inicialização ---
    updateAuthUI();
});