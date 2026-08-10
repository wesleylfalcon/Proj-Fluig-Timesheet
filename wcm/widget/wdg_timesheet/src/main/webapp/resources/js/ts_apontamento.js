var calendarioSomenteLeitura = false;
var limiteSelect = 20;

var TimesheetApontamento = (function () {

	// =====================================================
	// Carrega campo select projeto
	// =====================================================
    function initSelectProjeto($row) {

        var $select = $row.find('.vf-zoom-projeto');
        var $modal = $select.closest('.modal');

        if ($row.hasClass('vf-zoom-projeto')) {
            $select = $row;
        }

        if ($select.hasClass("select2-hidden-accessible")) return;

        $select.select2({
            placeholder: "Selecione ou busque a projeto...",
            width: '100%',
            allowClear: true,
            dropdownParent: $modal.length ? $modal : $(document.body),

            language: {
                searching: () => "Carregando projetos...",
                noResults: () => "Nenhum projeto encontrado"
            },

            ajax: {
                delay: 300,

                transport: function (params, success, failure) {

                    try {
                        var delegadoSelect = $('#delegar-apontamento').val();

                        if (!delegadoSelect) {
                            var codUsuario = TimesheetServices.getUsuarioBase("codigo");

                        } else {
                            var delegadoMatr = $('#delegar-apontamento-matr').val();

                            var constraints = [];
                            constraints.push(DatasetFactory.createConstraint("colleagueId", delegadoMatr, delegadoMatr, ConstraintType.MUST));

                            var ds = TimesheetDataset.getDataset('colleague', constraints);

                            var codUsuario = TimesheetServices.carregarCodUsuario(ds.values[0].mail);
                        }

                        //var codUsuario = getUsuarioBase("codigo");
                        var term = (params.data.term || "").toLowerCase();

                        var constraints = [
                            DatasetFactory.createConstraint("CODIGO", codUsuario, codUsuario, ConstraintType.MUST)
                        ];

                        var cacheKey = "proj_" + codUsuario;

                        var dataset = TimesheetServices.consultarProjetosTarefas(constraints, cacheKey);

                        var results = [];

                        if (dataset && dataset.values) {

                            results = dataset.values
                                .filter(item => !term || item.NOME.toLowerCase().includes(term))
                                .slice(0, limiteSelect)
                                .map(item => ({
                                    id: item.ID,
                                    codigo: item.CODIGO,
                                    text: item.NOME
                                }));
                        }

                        success({ results: results });

                    } catch (e) {
                        console.error("Erro ao buscar projetos:", e);
                        failure();
                    }
                }
            },

            templateResult: TimesheetServices.formatProjeto,
            templateSelection: TimesheetServices.formatSelection
        });

        $select.on('select2:select', function (e) {
            var data = e.params.data;

            $row.find('.vf-cod-projeto-apontamento').val(data.codigo);
            $row.find('.vf-id-projeto-apontamento').val(data.id);

            var $tarefa = $row.find('.vf-zoom-tarefa');
            $tarefa.val(null).trigger('change');

            $row.find('.vf-cod-tarefa-apontamento').val('');
            $row.find('.vf-idism-apontamento').val('');
            $row.find('.vf-idtrf-apontamento').val('');
        });
    }

	// =====================================================
	// Carrega campo select tarefa
	// =====================================================
    function initSelectTarefa($row) {

        var $select = $row.find('.vf-zoom-tarefa');
        var $modal = $select.closest('.modal');

        if ($row.hasClass('vf-zoom-tarefa') || $row.attr('id') === 'filtro-tarefa') {
            $select = $row;
        }

        if ($select.hasClass("select2-hidden-accessible")) return;

        $select.select2({
            placeholder: "Selecione ou busque a tarefa...",
            width: '100%',
            allowClear: true,
            dropdownParent: $modal.length ? $modal : $(document.body),

            language: {
                searching: () => "Carregando tarefas...",
                noResults: () => "Nenhuma tarefa encontrada"
            },

            ajax: {
                delay: 300,

                transport: function (params, success, failure) {

                    try {

                        var codUsuario = TimesheetServices.getUsuarioBase("codigo");
                        var projetoId = "";

                        if ($select.attr('id') === 'filtro-tarefa') {
                            projetoId = $('#filtro-id-projeto').val();
                        } else {
                            projetoId = $row.find('.vf-id-projeto-apontamento').val();
                        }

                        if (!projetoId) {
                            success({ results: [] });
                            return;
                        }

                        var term = (params.data.term || "").toLowerCase();

                        var constraints = [
                            DatasetFactory.createConstraint("CODIGO", codUsuario, codUsuario, ConstraintType.MUST),
                            DatasetFactory.createConstraint("IDPRJ", projetoId, projetoId, ConstraintType.MUST)
                        ];

                        var cacheKey = "trf_" + codUsuario + "_" + projetoId;

                        var dataset = TimesheetServices.consultarProjetosTarefas(constraints, cacheKey);

                        var results = [];

                        if (dataset && dataset.values) {
                            results = dataset.values
                                .filter(item => !term || item.NOME.toLowerCase().includes(term))
                                .slice(0, limiteSelect)
                                .map(item => ({
                                    id: item.CODIGO,
                                    text: item.NOME,
                                    idISM: item.IDISM || "",
                                    idTRF: item.IDTRF || ""
                                }));
                        }

                        success({ results: results });

                    } catch (e) {
                        console.error("Erro ao buscar tarefas:", e);
                        failure();
                    }
                }
            },

            templateResult: TimesheetServices.formatTarefa,
            templateSelection: TimesheetServices.formatSelection
        });

        $select.on('select2:select', function (e) {
            var data = e.params.data;

            $row.find('.vf-cod-tarefa-apontamento').val(data.id);
            $row.find('.vf-idism-apontamento').val(data.idISM || "");
            $row.find('.vf-idtrf-apontamento').val(data.idTRF || "");
        });
    }

	// =====================================================
	// Carrega campo select delegação
	// =====================================================
    function initSelectDelegar() {

        var $select = $('#delegar-apontamento');

        if ($select.hasClass("select2-hidden-accessible")) return;

        $select.select2({
            placeholder: "Selecione ou busque o colaborador...",
            width: '100%',
            allowClear: true,

            language: {
                searching: () => "Buscando colaboradores...",
                noResults: () => "Nenhum colaborador encontrado"
            },

            ajax: {
                delay: 300,

                transport: function (params, success, failure) {

                    try {

                        //var tipo = "matricula";
                        var matricula = $('#matriculaUsuario').val();//getUsuarioBase(tipo);

                        var constraints = [
                            DatasetFactory.createConstraint("MATRICULA", matricula, matricula, ConstraintType.MUST)
                        ];

                        var dataset = DatasetFactory.getDataset(
                            "ds_ts_consulta_delegacao",
                            null,
                            constraints,
                            null
                        );

                        var term = (params.data.term || "").toLowerCase();

                        var results = [];

                        if (dataset && dataset.values) {

                            results = dataset.values
                                .filter(function (item) {
                                    return item.nmColaborador.toLowerCase().includes(term);
                                })
                                .slice(0, limiteSelect)
                                .map(function (item) {
                                    return {
                                        id: item.matrColaborador,
                                        cod: item.codRMColaborador,
                                        text: item.nmColaborador
                                    };
                                });
                        }

                        success({ results: results });

                    } catch (e) {
                        console.error("Erro ao buscar delegação:", e);
                        failure();
                    }
                }
            }
        });

        // AO SELECIONAR
        $select.on('select2:select', function (e) {
            var data = e.params.data;

            $('#delegar-apontamento-codRM').val(data.cod);
            $('#delegar-apontamento-matr').val(data.id);
            $('#delegar-apontamento-nome').val(data.text);

            // LIMPA CACHE
            TimesheetServices.clearCache();

            // Inicializa filtro projeto
            TimesheetApontamento.initSelectProjeto($(document));

            // Inicializa filtro tarefa
            TimesheetApontamento.initSelectTarefa($(document));
        });

        // AO LIMPAR
        $select.on('select2:clear', function () {
            $('#delegar-apontamento-codRM').val('');
            $('#delegar-apontamento-matr').val('');

            // LIMPA CACHE
            TimesheetServices.clearCache();

            // Inicializa filtro projeto
            TimesheetApontamento.initSelectProjeto($(document));

            // Inicializa filtro tarefa
            TimesheetApontamento.initSelectTarefa($(document));
        });
    }

	// =====================================================
	// Carrega filtros mes e ano
	// =====================================================
    function carregaFiltroInicial() {
    	
        var dataAtual = new Date();
        var mes = dataAtual.getMonth() + 1;
        var ano = dataAtual.getFullYear();

        if (mes < 10) { mes = "0" + mes }

        $('#filtro-mes').val(mes);
        $('#filtro-ano').val(ano);
    }

	// =====================================================
	// Carrega modal de cancelamento
	// =====================================================
    function abrirModalCancelamento(nrSolicitacao) {

        var modal = FLUIGC.modal({
            title: 'Cancelar apontamento',
            content: `
                <div>
                    <p>Tem certeza que deseja cancelar este apontamento?</p>

                    <div id="motivo-wrapper" style="display:none;">
                        <label>Motivo do cancelamento *</label>
                        <textarea id="motivo-cancelamento" 
                            class="form-control" 
                            rows="3"></textarea>
                    </div>
                </div>
            `,
            id: 'fluig-modal-cancelamento',
            size: 'small',
            actions: [
                {
                    'label': 'Não',
                    'autoClose': true
                },
                {
                    'label': 'Sim',
                    'bind': 'data-confirmar'
                }
            ]
        });

        // salva dados no modal
        var $modal = $('#fluig-modal-cancelamento');
        $modal.data('nrSolicitacao', nrSolicitacao);
        $modal.data('etapaMotivo', false);
    }
    
	// =====================================================
	// Carrega modal de edição
	// =====================================================
    function abrirModalEdicao(dados) {

        var modal = FLUIGC.modal({
            title: 'Editar apontamento',
            content: `
                <div id="modal-edicao-apontamento">

        			<h3>Apontamento</h3>
        			<div class="row">
	                    <div class="form-group col-md-4">
	                        <label>Solicitação</label>
	                        <input type="text" class="form-control" value="${dados.nrSolicitacao}" readonly>
	                    </div>
	                    
	                    <div class="form-group col-md-4">
		                    <label>Data</label>	
		                    <div class="input-group">
		                        <input type="text" id="edit-data" class="form-control vf-data-apontamento" value="${dados.data}" readonly>	
		                        <span class="input-group-addon vf-open-calendar-apontamento" style="cursor:pointer;">
		                            <i class="flaticon flaticon-calendar"></i>
		                        </span>
		                    </div>	
		                </div>
	
	                    <div class="form-group col-md-4">
	                        <label>Horas</label>
	                        <input type="text" id="edit-horas" class="form-control" value="${dados.horas}">
	                    </div>
                    </div>

                    <div class="row">
	                    <div class="form-group col-md-6 vf-row-modal">
		                    <label>Projeto</label>
		                    <select class="form-control vf-zoom-projeto"></select>
		                    <input type="hidden" class="vf-id-projeto-apontamento" value="${dados.idProjeto}">
		                    <input type="hidden" class="vf-cod-projeto-apontamento" value="${dados.codProjeto}">
		                </div>
		
		                <div class="form-group col-md-6 vf-row-modal">
		                    <label>Tarefa</label>
		                    <select class="form-control vf-zoom-tarefa"></select>
		                    <input type="hidden" class="vf-cod-tarefa-apontamento" value="${dados.codTarefa}">
		                    <input type="hidden" class="vf-idism-apontamento" value="${dados.idISM || ''}">
		                    <input type="hidden" class="vf-idtrf-apontamento" value="${dados.idTRF || ''}">
	                    </div>
                    </div>

                    <div class="row">
	                    <div class="form-group col-md-12">
	                        <label>Observação</label>
	                        <textarea class="form-control vf-obs-apontamento" rows="2">${dados.observacao || ''}</textarea>
	                    </div>
                    </div><hr>

                    <h3>Aprovação</h3>
                    <div class="row">
	                    <div class="form-group col-md-5">
		                    <label>Aprovador</label>
		                    <input type="text" id="nome-aprovador" class="form-control" value="${dados.aprovador}" readonly>
		                </div>
		                
		                <div class="form-group col-md-2">
			                <label>Data</label>
			                <input type="text" id="data-aprovacao" class="form-control" value="${dados.dataAprov}" readonly>
			            </div>
			            
		                <div class="form-group col-md-2">
			                <label>Hora</label>
			                <input type="text" id="hora-aprovacao" class="form-control" value="${dados.hrAprov}" readonly>
			            </div>
			            
			            <div class="form-group col-md-3">
			                <label>Status</label>
			                <input type="text" id="status-aprovacao" class="form-control" value="${dados.statusAprov}" readonly>
			            </div>
		            </div>
		            
		            <div class="row">
			            <div class="form-group col-md-12">
			                <label>Justificativa</label>
			                <textarea id="justificativa-aprovador" class="form-control" rows="2" readonly>${dados.justificativa || ''}</textarea>
			            </div>
		            </div>

                </div>
            `,
            id: 'fluig-modal-edicao',
            size: 'large',
            actions: [
                {
                    label: 'Cancelar',
                    autoClose: true
                },
                {
                    label: 'Salvar',
                    bind: 'data-salvar'
                }
            ]
        });

        // INIT COMPONENTES

        // máscara hora
        $('#edit-horas').mask('00:00');

        var $container = $('#modal-edicao-apontamento');

        // inicializa como se fosse uma row
        TimesheetApontamento.initSelectProjeto($container);
        TimesheetApontamento.initSelectTarefa($container);

        // PRÉ-SELEÇÃO (visual apenas por enquanto)

        setTimeout(function () {

            var $proj = $('#modal-edicao-apontamento .vf-zoom-projeto');
            var $tar = $('#modal-edicao-apontamento .vf-zoom-tarefa');

            var optionProj = new Option(dados.nmProjeto, dados.nmProjeto, true, true);
            $proj.append(optionProj).trigger('change');

            var optionTar = new Option(dados.nmTarefa, dados.nmTarefa, true, true);
            $tar.append(optionTar).trigger('change');

        }, 300);

        // Aprovação        
        if (dados.aprovador) {
            $('#info-aprovador').show();

            var mensagem = `
                <strong>Aprovador:</strong> ${dados.aprovador}<br>
                <strong>Status:</strong> ${dados.statusAprov}<br>
                <strong>Data:</strong> ${dados.dataAprov} ${dados.hrAprov}<br>
                <strong>Justificativa:</strong> ${dados.justificativa || '-'}
            `;

            $('#aprovador-msg').html(mensagem);
        }


        // guarda contexto
        var $modal = $('#fluig-modal-edicao');
        $modal.data('dados', dados);
    }

    return {
        initSelectProjeto: initSelectProjeto,
        initSelectTarefa: initSelectTarefa,
        carregaFiltroInicial: carregaFiltroInicial,
        abrirModalCancelamento: abrirModalCancelamento,
        abrirModalEdicao: abrirModalEdicao,
        initSelectDelegar: initSelectDelegar
    };
})();

// =====================================================
// Carrega tabela de apontamentos
// =====================================================
var ConsultaApontamentos = {

    dados: [],
    pagina: 1,
    pageSize: 10,
    loading: null,

    buscar: function () {

        var self = this;

        if (!self.loading) {
            self.loading = FLUIGC.loading('#vf-tabela-consulta', {
                textMessage: 'Buscando apontamentos...'
            });
        }

        self.loading.show();

        setTimeout(function () {

            var tipo = "matricula";
            var codigo = TimesheetServices.getUsuarioBase(tipo);
            var constraints = [];

            constraints.push(DatasetFactory.createConstraint("CODIGO", codigo, "", ConstraintType.MUST));

            if ($('#filtro-mes').val() && $('#filtro-ano').val()) {
                var competencia = $('#filtro-mes').val() + "/" + $('#filtro-ano').val();

                constraints.push(DatasetFactory.createConstraint("COMPETENCIA", competencia, "", ConstraintType.MUST));
            }

            if ($('#filtro-cod-projeto').val()) {
                constraints.push(DatasetFactory.createConstraint("PROJETO", $('#filtro-cod-projeto').val(), "", ConstraintType.MUST));
            }

            if ($('#filtro-cod-tarefa').val()) {
                constraints.push(DatasetFactory.createConstraint("TAREFA", $('#filtro-cod-tarefa').val(), "", ConstraintType.MUST));
            }

            var statusSelecionados = [];

            $('.vf-filtro-status:checked').each(function () {
                statusSelecionados.push($(this).val());
            });

            if (statusSelecionados.length > 0) {
                constraints.push(DatasetFactory.createConstraint("STATUS", statusSelecionados.join(","), statusSelecionados.join(","), ConstraintType.MUST));
            }

            var ds = DatasetFactory.getDataset("ds_ts_consulta_apontamentos", null, constraints, null);

            self.dados = ds.values || [];

            if (self.dados.length > 0) {
                $('#btn-export-apontamentos-excel').prop('disabled', false);
            } else {
                $('#btn-export-apontamentos-excel').prop('disabled', true);
            }

            self.pagina = 1;

            self.render();

            self.loading.hide();

        }, 100);

    },

    render: function () {
        this.renderTabela();
        this.renderPaginacao();
    },

    renderTabela: function () {

        var inicio = (this.pagina - 1) * this.pageSize;
        var fim = inicio + this.pageSize;

        var pageData = this.dados.slice(inicio, fim);

        var $tbody = $('#vf-tabela-consulta tbody');
        $tbody.empty();

        if (!pageData || pageData.length === 0) {

            $tbody.append(`
                <tr>
                    <td colspan="9" class="text-center" style="padding:20px;">
                        <i class="flaticon flaticon-info icon-md"></i><br>
                        Nenhum apontamento encontrado para os filtros informados
                    </td>
                </tr>
            `);

            return;
        }

        pageData.forEach(function (item, i) {
            var statusClass = TimesheetServices.getStatusClass(item.status);
            var status = (item.status || '').toLowerCase();
            var isEditavel = status.includes('pendente') || status.includes('revisado');
            var acoesHtml = '';

            if (isEditavel) {
                acoesHtml = `
        	        <button class="btn btn-xs btn-default vf-editar">
        	            <i class="flaticon flaticon-edit icon-sm"></i>
        	        </button>
        	        <button class="btn btn-xs btn-danger vf-excluir" 
        	            data-id="${item.nrSolicitacao}">
        	            <i class="flaticon flaticon-close icon-sm"></i>
        	        </button>
        	    `;
            } else {
                acoesHtml = `
        	        <span style="color:#bbb;">-</span>
        	    `;
            }

            const link = window.origin + "/portal/p/1/pageworkflowview?app_ecm_workflowview_detailsProcessInstanceID=" + item.nrSolicitacao;

            $tbody.append(`
        		<tr 
        			data-observacao="${item.observacao || ''}"
                	data-aprovador="${item.aprovador || ''}"
                    data-dataaprov="${item.dataAprov || ''}"
                    data-hraprov="${item.hrAprov || ''}"
                    data-statusaprov="${item.statusAprov || ''}"
                    data-justificativa="${item.justificativa || ''}"
                    data-idism="${item.idISM || ''}"
                    data-idtrf="${item.idTRF || ''}"
                    data-idprojeto="${item.idProjeto || ''}">
            		<td>${acoesHtml}</td>
			        <td>
			        	<a href=${link} target="_blank">${item.nrSolicitacao}</a>
			        </td>
                    <td>${item.data}</td>
                    <td title="${item.nmProjeto}">${item.nmProjeto}</td>
                    <td>${item.codProjeto || item.idProjeto}</td>
                    <td title="${item.nmTarefa}">${item.nmTarefa}</td>
                    <td>${item.codTarefa}</td>
                    <td><span class="label label-${statusClass}">${item.status}</span></td>
	                <td class="text-${statusClass}">
	                	<strong>${item.horas}</strong>
		            </td>                     
                </tr>
            `);
        });
    },

    renderPaginacao: function () {

        var totalPaginas = Math.ceil(this.dados.length / this.pageSize);
        var paginaAtual = this.pagina;

        var $container = $('#vf-paginacao');

        // WRAPPER DINÂMICO
        if (!$container.parent().hasClass('vf-paginacao-wrapper')) {
            $container.wrap('<div class="vf-paginacao-wrapper"></div>');
            $container.after('<div class="vf-page-size"></div>');
        }

        var $wrapper = $container.parent();
        var $pageSizeContainer = $wrapper.find('.vf-page-size');

        // LIMPA PAGINAÇÃO
        $container.empty();

        if (totalPaginas === 0) {
            $pageSizeContainer.empty();
            return;
        }

        // MONTA SELECT PAGE SIZE
        $pageSizeContainer.html(`
            <select id="vf-page-size" class="form-control input-sm" style="width:60px; display:inline-block;">
		        <option value="10">10</option>
		        <option value="25">25</option>
		        <option value="50">50</option>
		        <option value="100">100</option>
            </select>
        `);

        $('#vf-page-size').val(this.pageSize);

        // EVENTO SELECT
        $('#vf-page-size').off('change').on('change', (e) => {
            this.pageSize = parseInt($(e.target).val());
            this.pagina = 1;
            this.render();
        });

        // PAGINAÇÃO
        function criarItem(label, page, disabled = false, active = false) {
            return `
                <li class="${disabled ? 'disabled' : ''} ${active ? 'active' : ''}">
                    <a href="#" data-page="${page}">${label}</a>
                </li>
            `;
        }

        $container.append(criarItem('<<', 1, paginaAtual === 1));
        $container.append(criarItem('<', paginaAtual - 1, paginaAtual === 1));
        $container.append(criarItem(paginaAtual, paginaAtual, false, true));
        $container.append(criarItem('>', paginaAtual + 1, paginaAtual === totalPaginas));
        $container.append(criarItem('>>', totalPaginas, paginaAtual === totalPaginas));

        // EVENTO PAGINAÇÃO
        $container.find('a').on('click', (e) => {
            e.preventDefault();

            var page = parseInt($(e.target).data('page'));

            if (!page || page < 1 || page > totalPaginas) return;

            this.pagina = page;
            this.renderTabela();
            this.renderPaginacao();
        });
    }
};