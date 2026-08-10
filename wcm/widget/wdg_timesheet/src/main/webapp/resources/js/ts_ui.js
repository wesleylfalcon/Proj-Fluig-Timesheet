var TimesheetUI = (function () {

    // =========================
    // Carrega dados iniciais
    // =========================
    function initHeader() {
    	
        TimesheetPainel.carregarUsuario();
        TimesheetPainel.carregarDiaSemana();
        TimesheetPainel.carregarDataAtual();
    }

    // =========================
    // Oculta menus conforme papel do usuário logado
    // =========================
    function ocultaMenus() {
    	
        var matricula = $("#matriculaUsuario").val();

        if (!matricula) {
            console.warn("Matrícula não encontrada");
            $('.ts-menu-item[data-view="aprovacao-massiva"]').hide();
            $('.ts-menu-item[data-view="aprovacoes"]').hide();
            return false;
        }

        var constraints = [];
        constraints.push(DatasetFactory.createConstraint("workflowColleagueRolePK.colleagueId", matricula, matricula, ConstraintType.MUST));

        var dataset = TimesheetDataset.getDataset('workflowColleagueRole', constraints);

        var possuiPermissaoAdmin = false;
        var possuiPermissaoResp = false;

        // Percorre retorno
        if (dataset && dataset.values && dataset.values.length > 0) {
            dataset.values.forEach(function (item) {

                var roleId = (item["workflowColleagueRolePK.roleId"] || "").trim();

                if (roleId === "ResponsaveisTimesheet") {
                    possuiPermissaoResp = true;
                }

                if (roleId === "AdminTimesheet") {
                    possuiPermissaoAdmin = true;
                }
            });
        }

        if (!possuiPermissaoAdmin) {
            $('.ts-menu-item[data-view="aprovacao-massiva"]').hide();
        }

        if (!possuiPermissaoResp) {
            $('.ts-menu-item[data-view="aprovacoes"]').hide();
        }
    }


    // =========================
    // Carrega o menu selecionado
    // =========================
    function abrirView(view) {
    	
        $('.ts-view').removeClass('active');
        $('.ts-view[data-view="' + view + '"]').addClass('active');
    }


    // =========================
    // Identifica a alteração de menus no menu lateral
    // =========================
    function initRouter(widgetInstance) {
    	
        $('.ts-menu-item').on('click', function () {
            var view = $(this).data('view');

            $('.ts-menu-item').removeClass('active');
            $(this).addClass('active');

            widgetInstance.abrirView(view);
        });
    }


    // =========================
    // Renderiza a tabela de tarefas
    // =========================
    function renderTabela(lista) {
    	
        const tbody = $("#ts-tarefas-body");
        tbody.empty();

        const dados = Array.isArray(lista) ? lista : lista.values || [];

        dados.forEach(function (t) {
            const row = `
	        	<tr class="ts-row"
	        	    data-id-projeto="${t.IDPROJETO || ''}"
	        	    data-cod-projeto="${t.CODPROJETO || t.IDPROJETO || ''}"
	        	    data-projeto="${t.PROJETO}"
	        	    data-id-tarefa="${t.IDTAREFA}"
	        	    data-idism="${t.IDISM || ''}"
	        	    data-idtrf="${t.IDTRF || ''}"
	        	    data-tarefa="${t.TAREFA}"
	        	    data-horas-previstas="${t.HORAPREVISTA}"
	        	    data-horas-realizadas="${t.HORAREALIZADA}"
	        	    data-situacao="${t.STATUS}"
	        	    data-inicio="${t.INICIOPREVISTO}"
	        	    data-fim="${t.FIMPREVISTO}">
	
	        	    <td>${t.CODPROJETO || t.IDPROJETO || ""}</td>
	        	    <td title="${t.PROJETO}">${t.PROJETO}</td>
	        	    <td>${t.IDTAREFA}</td>
	        	    <td title="${t.TAREFA}">${t.TAREFA}</td>
	        	    <td>${t.HORAPREVISTA}</td>
	        	    <td>${t.HORAREALIZADA}</td>
	        	    <td>${t.STATUS}</td>
	        	    <td>${t.INICIOPREVISTO}</td>
	        	    <td>${t.FIMPREVISTO}</td>
	        	</tr>
        	`;

            tbody.append(row);
        });
    }


    // =========================
    // Inicia a visualização inicial do menu lateral
    // =========================
    function initSidebar() {
    	
        const collapsed = localStorage.getItem("tsSidebar");

        if (collapsed === "true") {
            $(".ts-sidebar").addClass("collapsed");
        }

        $("#tsSidebarToggle").on("click", function () {
            $(".ts-sidebar").toggleClass("collapsed");

            localStorage.setItem("tsSidebar", $(".ts-sidebar").hasClass("collapsed"));
        });
    }


    // =========================
    // Inicia a abertura da tela de detalhes da tarefa
    // =========================
    function initTabelaEventos() {
    	
        $(document).on("click", "#ts-tarefas-body tr", function () {

            $("#ts-tarefas-body tr").removeClass("selected");
            $(this).addClass("selected");

            const ctx = $(this).data();

            TimesheetPainel.abrirDetalhesTarefa(ctx);
        });
    }

    return {
        initHeader: initHeader,
        initRouter: initRouter,
        abrirView: abrirView,
        renderTabela: renderTabela,
        initSidebar: initSidebar,
        initTabelaEventos: initTabelaEventos,
        ocultaMenus: ocultaMenus
    };
})();