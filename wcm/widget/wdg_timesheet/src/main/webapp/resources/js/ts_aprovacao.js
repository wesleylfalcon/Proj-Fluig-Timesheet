var competencia = TimesheetServices.carregaMesAno();

var TimesheetAprovacao = (function () {

    var cacheDataset = {};
    var limiteSelect = 20;

    // =========================
    // Carrega filtro de mes e ano
    // =========================
    function carregaFiltroInicial() {
    	
        var dataAtual = new Date();
        var mes = dataAtual.getMonth() + 1;
        var ano = dataAtual.getFullYear();

        if (mes < 10) { mes = "0" + mes }

        $('#filtro-aprov-mes').val(mes);
        $('#filtro-aprov-ano').val(ano);
    }

    // =========================
    // Carrega caixas de resumo e tarefas do usuario
    // =========================
    function carregarCompetencia() {
    	
        var ano = competencia.split("/")[1];
        var mes = competencia.split("/")[0];

        var c1 = DatasetFactory.createConstraint('MES', mes, mes, ConstraintType.MUST);
        var c2 = DatasetFactory.createConstraint('ANO', ano, ano, ConstraintType.MUST);
        var dsCompetencia = TimesheetDataset.getDataset('ds_ts_painel_comp', [c1, c2]);

        if (dsCompetencia && dsCompetencia.values.length > 0) {
            var c = dsCompetencia.values[0];

            $('#ts-aprovacoes-competencia').text(c.DATA);
        }
    }

    // =========================
    // Carrega horas aprovadas e pendentes
    // =========================
    function carregaHorasAprovacao() {
    	
        var matricula = $('#matriculaUsuario').val();

        var c1 = DatasetFactory.createConstraint('COMPETENCIA', competencia, competencia, ConstraintType.MUST);
        var c2 = DatasetFactory.createConstraint('MATRICULA', matricula, matricula, ConstraintType.MUST);
        var dsAprovacao = TimesheetDataset.getDataset('ds_ts_horas_aprovacao', [c1, c2]);

        if (dsAprovacao && dsAprovacao.values.length > 0) {
            var hora = dsAprovacao.values[0];

            $('#ts-aprovacoes-realizadas').text(TimesheetServices.decimalParaHora(parseFloat(hora.HORASAPROVADAS || 0)));
            $('#ts-aprovacoes-pendentes').text(TimesheetServices.decimalParaHora(parseFloat(hora.HORASPENDENTES || 0)));
        }
    }

    // =========================
    // Carrega quantidade de projetos pendentes
    // =========================
    function carregaProjetos() {
    	
        var matricula = $('#matriculaUsuario').val();

        var c1 = DatasetFactory.createConstraint("MATRICULA", matricula, matricula, ConstraintType.MUST);
        var c2 = DatasetFactory.createConstraint("COMPETENCIA", competencia, competencia, ConstraintType.MUST);

        var ds = DatasetFactory.getDataset("ds_ts_horas_aprovacao", null, [c1, c2], null);

        $('#ts-projetos-pendentes').text(ds.values[0].QTDPROJETOS);
    }

    // =========================
    // Carrega campo select projeto
    // =========================
    function initSelectProjetoAprov() {

        var $select = $('#filtro-projeto-aprov');

        if ($select.hasClass("select2-hidden-accessible")) {
            $select.select2('destroy');
        }

        $select.select2({
            placeholder: "Selecione ou busque o projeto...",
            width: '100%',
            allowClear: true,

            language: {
                searching: () => "Carregando projetos...",
                noResults: () => "Nenhum projeto encontrado"
            },

            ajax: {
                delay: 300,

                transport: function (params, success, failure) {
                    try {
                        var codUsuario = $('#codRM').val();
                        var term = (params.data.term || "").toLowerCase();
                        var constraints = [DatasetFactory.createConstraint("CODIGO", codUsuario, codUsuario, ConstraintType.MUST)];
                        var cacheKey = "proj_aprov_" + codUsuario;
                        var dataset = TimesheetServices.consultarProjetosTarefas(constraints, cacheKey);
                        var results = [];

                        if (dataset && dataset.values) {
                            results = dataset.values
                                .filter(function (item) {
                                    return (
                                        !term ||
                                        item.NOME.toLowerCase().includes(term)
                                    );
                                })
                                .slice(0, limiteSelect)
                                .map(function (item) {
                                    return {
                                        id: item.ID,
                                        codigo: item.CODIGO,
                                        text: item.NOME
                                    };

                                });
                        }

                        success({ results: results });

                    } catch (e) {
                        console.error(
                            "Erro ao buscar projetos:",
                            e
                        );

                        failure();
                    }
                }
            },

            templateResult: TimesheetServices.formatProjeto,
            templateSelection: TimesheetServices.formatSelection
        });

        // SELECT
        $select.on('select2:select', function (e) {
            var data = e.params.data;

            $('#filtro-cod-projeto-aprov').val(data.codigo);
            $('#filtro-id-projeto-aprov').val(data.id);
            $('#filtro-tarefa-aprov').val(null).trigger('change');
            $('#filtro-cod-tarefa-aprov').val('');
        });

        // CLEAR
        $select.on('select2:clear', function () {
            $('#filtro-cod-projeto-aprov').val('');
            $('#filtro-id-projeto-aprov').val('');
            $('#filtro-tarefa-aprov').val(null).trigger('change');
            $('#filtro-cod-tarefa-aprov').val('');
        });
    }

    // =========================
    // Carrega campo select tarefa
    // =========================
    function initSelectTarefaAprov() {
        var $select = $('#filtro-tarefa-aprov');

        if ($select.hasClass("select2-hidden-accessible")) {
            $select.select2('destroy');
        }

        $select.select2({
            placeholder: "Selecione ou busque a tarefa...",
            width: '100%',
            allowClear: true,

            language: {
                searching: () => "Carregando tarefas...",
                noResults: () => "Nenhuma tarefa encontrada"
            },

            ajax: {
                delay: 300,

                transport: function (params, success, failure) {
                    try {
                        var matricula = $('#matriculaUsuario').val();
                        var projetoId = $('#filtro-id-projeto-aprov').val();

                        if (!projetoId) {
                            success({ results: [] });

                            return;
                        }

                        var term = (params.data.term || "").toLowerCase();

                        var constraints = [
                            DatasetFactory.createConstraint(
                                "CODIGO",
                                matricula,
                                matricula,
                                ConstraintType.MUST
                            ),
                            DatasetFactory.createConstraint(
                                "IDPRJ",
                                projetoId,
                                projetoId,
                                ConstraintType.MUST
                            )
                        ];

                        var cacheKey = "tar_aprov_" + matricula + "_" + projetoId;

                        var dataset = TimesheetServices.consultarProjetosTarefas(constraints, cacheKey);

                        var results = [];

                        if (dataset && dataset.values) {
                            results = dataset.values
                                .filter(function (item) {
                                    return (
                                        !term ||
                                        item.NOME.toLowerCase().includes(term)
                                    );
                                })
                                .slice(0, limiteSelect)
                                .map(function (item) {
                                    return {
                                        id: item.CODIGO,
                                        text: item.NOME
                                    };

                                });
                        }

                        success({ results: results });

                    } catch (e) {
                        console.error(
                            "Erro ao buscar tarefas:",
                            e
                        );

                        failure();
                    }
                }
            },

            templateResult: TimesheetServices.formatTarefa,
            templateSelection: TimesheetServices.formatSelection
        });

        // SELECT
        $select.on('select2:select', function (e) {
            var data = e.params.data;

            $('#filtro-cod-tarefa-aprov').val(data.id);
        });

        // CLEAR
        $select.on('select2:clear', function () {
            $('#filtro-cod-tarefa-aprov').val('');
        });
    }

    // =========================
    // Carrega campo select colaborador
    // =========================
    function initSelectColaboradorAprov() {
        var $select = $('#filtro-colaborador');

        // evita duplicação
        if ($select.hasClass("select2-hidden-accessible")) {
            $select.select2('destroy');
        }

        $select.select2({
            placeholder: "Selecione ou busque o colaborador...",
            width: '100%',
            allowClear: true,

            language: {
                searching: () => "Carregando colaboradores...",
                noResults: () => "Nenhum colaborador encontrado"
            },

            ajax: {
                delay: 300,

                transport: function (params, success, failure) {
                    try {
                        var term = (params.data.term || "").toLowerCase();
                        var constraints = [];
                        var dataset = TimesheetDataset.getDataset("ds_ts_colaboradores", constraints);
                        var results = [];

                        if (dataset && dataset.values) {
                            results = dataset.values
                                .filter(function (item) {
                                    return (
                                        !term ||
                                        item.nome.toLowerCase().includes(term)
                                    );
                                })
                                .slice(0, limiteSelect)
                                .map(function (item) {
                                    return {
                                        id: item.matricula,
                                        text: item.nome
                                    };
                                });
                        }

                        success({
                            results: results
                        });

                    } catch (e) {
                        console.error(
                            "Erro ao buscar colaboradores:",
                            e
                        );

                        failure();
                    }
                }
            },

            templateResult: TimesheetServices.formatColaborador,
            templateSelection: TimesheetServices.formatSelection
        });

        // SELECT
        $select.on('select2:select', function (e) {
            var data = e.params.data;

            $('#filtro-cod-colaborador').val(data.id);
        });

        // CLEAR
        $select.on('select2:clear', function () {
            $('#filtro-cod-colaborador').val('');
        });
    }

    // =========================
    // Carrega modal da aprovação
    // =========================
    function abrirModalAprovacao(dados) {
        var modal = FLUIGC.modal({
            title: 'Aprovação',
            content: `
                <div id="modal-aprovacao-timesheet">
                    <div class="row">
                        <div class="form-group col-md-3">
                            <label>Solicitação</label>
                            <input type="text" class="form-control" value="${dados.nrSolicitacao}" readonly>
                        </div>

                        <div class="form-group col-md-9">
                            <label>Colaborador</label>
                            <input type="text" class="form-control" value="${dados.colaborador}" readonly>
                        </div>
                    </div>

                    <div class="row">
                        <div class="form-group col-md-3">
                            <label>Data</label>
                            <input type="text" class="form-control" value="${dados.data}" readonly>
                        </div>

                        <div class="form-group col-md-5">
                            <label>Projeto</label>
                            <input type="text" class="form-control" value="${dados.projeto}" readonly>
                        </div>

                        <div class="form-group col-md-4">
                            <label>Tarefa</label>
                            <input type="text" class="form-control" value="${dados.tarefa}" readonly>
                        </div>
                    </div>

                    <div class="row">
                        <div class="form-group col-md-3">
                            <label>Horas</label>
                            <input type="text" id="txt-horas-aprovacao" class="form-control" value="${dados.horas}" readonly>
                        </div>

                        <div class="form-group col-md-9">
                            <label>Justificativa</label>
                            <textarea id="txt-justificativa-aprovacao" class="form-control" rows="3" placeholder="Informe uma justificativa..."></textarea>
                        </div>
                    </div>
                </div>
            `,
            id: 'fluig-modal-aprovacao',
            size: 'large',
            actions: [
                {
                    label: 'Revisar',
                    bind: 'data-revisar',
                    classType: 'btn-warning'
                },
                {
                    label: 'Reprovar',
                    bind: 'data-reprovar',
                    classType: 'btn-danger'
                },
                {
                    label: 'Aprovar',
                    bind: 'data-aprovar',
                    classType: 'btn-success'
                }
            ]
        });

        // máscara hora
        $('#txt-horas-aprovacao').mask('00:00');

        $('#fluig-modal-aprovacao').data('dados', dados);
    }

    // =========================
    // Carrega modal de detalhes do projeto
    // =========================
    function abrirDetalheProjetos(ds) {
        const ctx = montarContextoProjetos(ds);

        FLUIGC.modal({
            title: `Projetos`,
            content: templateModalProjetos(ctx),
            id: 'modalProjetos',
            size: 'large',
            actions: [
                {
                    label: 'Fechar',
                    autoClose: true
                }
            ]
        });
    }
    function montarContextoProjetos(ds) {

        if (!ds || !ds.values || !ds.values.length) {
            return {
                projetos: []
            };
        }

        const row = ds.values[0];

        let projetos = [];

        if (row.PROJETOSPENDENTES) {
            projetos = row.PROJETOSPENDENTES
                .split(';')
                .map(item => item.trim())
                .filter(item => item !== '')
                .map(item => {

                    const match = item.match(/^(.*)\((.*)\)$/);

                    if (match) {
                        return {
                            nome: match[1].trim(),
                            horas: match[2].trim()
                        };
                    }

                    return {
                        nome: item,
                        horas: '00:00'
                    };
                });
        }

        return {
            projetos: projetos
        };
    }
    function templateModalProjetos(ctx) {

        let projetosHtml = '';

        if (ctx.projetos.length) {
            projetosHtml = ctx.projetos.map(projeto => {
                return `

                    <div class="vf-projeto-item">
                        <div class="vf-projeto-info">
                            <i class="flaticon flaticon-file-settings icon-sm"></i>
                            <span class="vf-projeto-nome">
                                ${projeto.nome}
                            </span>
                        </div>

                        <div class="vf-projeto-horas">
                            <span class="label label-warning">
                                ${projeto.horas}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');

        } else {
            projetosHtml = `
                <div class="alert alert-info text-center">
                    Nenhum projeto pendente encontrado.
                </div>
            `;
        }

        return `

            <div class="vf-modal-projetos">
                <div class="vf-modal-header">
                    <h4>
                        <i class="flaticon flaticon-clock"></i>
                        Projetos pendentes de aprovação
                    </h4>
                </div>

                <div class="vf-projetos-lista">
                    ${projetosHtml}
                </div>
            </div>
        `;
    }

    return {
        carregarCompetencia: carregarCompetencia,
        carregaHorasAprovacao: carregaHorasAprovacao,
        initSelectProjetoAprov: initSelectProjetoAprov,
        initSelectTarefaAprov: initSelectTarefaAprov,
        initSelectColaboradorAprov: initSelectColaboradorAprov,
        abrirModalAprovacao: abrirModalAprovacao,
        abrirDetalheProjetos: abrirDetalheProjetos,
        carregaProjetos: carregaProjetos,
        carregaFiltroInicial: carregaFiltroInicial
    };
})();

//=========================
// Carrega tabela de apontamentos para aprovação
// =========================
var ConsultaAprovacoes = {
    dados: [],
    pagina: 1,
    pageSize: 10,
    loading: null,

    buscar: function () {
        var self = this;

        if (!self.loading) {
            self.loading = FLUIGC.loading('#vf-tabela-aprovacao', {
                textMessage: 'Buscando aprovações...'
            });
        }

        self.loading.show();

        setTimeout(function () {
            var constraints = [];

            // COMPETÊNCIA
            if ($('#filtro-aprov-mes').val() && $('#filtro-aprov-ano').val()) {
                var competencia = $('#filtro-aprov-mes').val() + "/" + $('#filtro-aprov-ano').val();

                constraints.push(DatasetFactory.createConstraint("COMPETENCIA", competencia, competencia, ConstraintType.MUST));
            }

            // APROVADOR
            if ($('#matriculaUsuario').val()) {
                constraints.push(DatasetFactory.createConstraint("CODIGO", $('#matriculaUsuario').val(), $('#matriculaUsuario').val(), ConstraintType.MUST));
            }

            // COLABORADOR
            if ($('#filtro-cod-colaborador').val()) {
                constraints.push(DatasetFactory.createConstraint("CODCOLABORADOR", $('#filtro-cod-colaborador').val(), $('#filtro-cod-colaborador').val(), ConstraintType.MUST));
            }

            // PROJETO
            if ($('#filtro-cod-projeto-aprov').val()) {
                constraints.push(DatasetFactory.createConstraint("PROJETO", $('#filtro-cod-projeto-aprov').val(), $('#filtro-cod-projeto-aprov').val(), ConstraintType.MUST));
            }

            // TAREFA
            if ($('#filtro-cod-tarefa-aprov').val()) {
                constraints.push(DatasetFactory.createConstraint("TAREFA", $('#filtro-cod-tarefa-aprov').val(), $('#filtro-cod-tarefa-aprov').val(), ConstraintType.MUST));
            }

            // STATUS
            var statusSelecionados = [];

            $('.vf-filtro-aprov-status:checked').each(function () {
                statusSelecionados.push($(this).val());
            });

            if (statusSelecionados.length > 0) {
                constraints.push(DatasetFactory.createConstraint("STATUS", statusSelecionados.join(","), statusSelecionados.join(","), ConstraintType.MUST));

            } else {
                constraints.push(DatasetFactory.createConstraint("STATUS", "Pendente aprovação", "Pendente aprovação", ConstraintType.MUST));
            }

            // DATASET
            var ds = TimesheetDataset.getDataset("ds_ts_pendentes_aprovacao", constraints);

            self.dados = ds.values || [];

            // HABILITA EXPORTAÇÃO
            $('#btn-export-aprovacoes').prop('disabled', self.dados.length === 0);

            self.pagina = 1;
            self.render();
            self.atualizarResumoProjeto();
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
        var $tbody = $('#vf-tabela-aprovacao tbody');

        $tbody.empty();

        // SEM DADOS
        if (!pageData || pageData.length === 0) {
            $tbody.append(`
	             <tr>
	                 <td colspan="10" 
	                     class="text-center" 
	                     style="padding:20px;">
	
	                     <i class="flaticon flaticon-info icon-md"></i><br>
	
	                     Nenhum apontamento encontrado para os filtros informados
	                 </td>
	             </tr>
	         `);

            return;
        }

        // LINHAS
        pageData.forEach(function (item) {
        	var statusClass = TimesheetServices.getStatusClass(item.statusAprovGestor);
            var link = window.origin + "/portal/p/1/pageworkflowview?app_ecm_workflowview_detailsProcessInstanceID=" + item.nrSolicitacao;
            var horas = item.horas || "00:00";
            var erro = item.erro || "";
            var acaoHtml = `
	             <button 
	                 class="btn btn-xs btn-success vf-aprovar"
	                 data-id="${item.nrSolicitacao}">
	                 <i class="flaticon flaticon-check-circle icon-sm"></i>
	             </button>
	         `;

            // ERRO DATASET
            if (erro) {
                acaoHtml = `
	                 <span class="text-danger">
	                     <i class="flaticon flaticon-warning"></i>
	                 </span>
	             `;
            }

            $tbody.append(`
	             <tr>
			         <td class="text-center">
				         <div class="custom-checkbox custom-checkbox-primary vf-checkbox-table">
					         <input
					             type="checkbox"
					             id="check-aprov-${item.nrSolicitacao}"
					             class="vf-check-aprov"
					             data-id="${item.nrSolicitacao}"
					         >		
					         <label for="check-aprov-${item.nrSolicitacao}"></label>
					     </div>
				     </td>			
				     <td>${acaoHtml}</td>
				     <td title="${item.idTarefa}">${item.idTarefa || ''}</td>
				     <td title="${item.nmTarefa}">${item.nmTarefa || ''}</td>				     
				     <td>${item.nmColaborador || ''}</td>	
	                 <td>${item.data || ''}</td>
	                 <td title="${item.idProjeto}">${item.idProjeto || ''}</td>
	                 <td title="${item.nmProjeto}">${item.nmProjeto || ''}</td>
	                 <td>
	                     <a href="${link}" target="_blank">
	                         ${item.nrSolicitacao}
	                     </a>
	                 </td>	
	                 <td><span class="label label-${statusClass}">${item.statusAprovGestor}</span></td>
	                 <td class="text-${statusClass}"><strong>${horas}</strong></td>
	             </tr>
	         `);
        });
    },

    renderPaginacao: function () {
        var totalPaginas = Math.ceil(this.dados.length / this.pageSize);
        var paginaAtual = this.pagina;
        var $container = $('#vf-paginacao-aprovacao');

        // WRAPPER
        if (!$container.parent().hasClass('vf-paginacao-wrapper')) {
            $container.wrap('<div class="vf-paginacao-wrapper"></div>');
            $container.after('<div class="vf-page-size"></div>');
        }

        var $wrapper = $container.parent();

        var $pageSizeContainer = $wrapper.find('.vf-page-size');

        $container.empty();

        // SEM PAGINAÇÃO
        if (totalPaginas === 0) {
            $pageSizeContainer.empty();

            return;
        }

        // PAGE SIZE
        $pageSizeContainer.html(`
	         <select 
	             id="vf-page-size-aprov"
	             class="form-control input-sm"
	             style="width:60px; display:inline-block;">
	
	             <option value="10">10</option>
	             <option value="25">25</option>
	             <option value="50">50</option>
	             <option value="100">100</option>
	
	         </select>
	     `);

        $('#vf-page-size-aprov').val(this.pageSize);

        function criarItem(label, page, disabled, active) {
            return `
	             <li class="${disabled ? 'disabled' : ''} ${active ? 'active' : ''}">
	                 <a href="#" data-page="${page}">
	                     ${label}
	                 </a>
	             </li>
	         `;
        }

        $container.append(criarItem('<<', 1, paginaAtual === 1));
        $container.append(criarItem('<', paginaAtual - 1, paginaAtual === 1));
        $container.append(criarItem(paginaAtual, paginaAtual, false, true));
        $container.append(criarItem('>', paginaAtual + 1, paginaAtual === totalPaginas));
        $container.append(criarItem('>>', totalPaginas, paginaAtual === totalPaginas));

        // EVENTOS
        $container.find('a').on('click', (e) => {
            e.preventDefault();

            var page = parseInt($(e.target).data('page'));

            if (!page || page < 1 || page > totalPaginas) { return; }

            this.pagina = page;
            this.renderTabela();
            this.renderPaginacao();
        });
    },

    exportarExcel: function () {
        if (!this.dados || this.dados.length === 0) {
            FLUIGC.toast({
                title: "Atenção: ",
                message: "Não há dados para exportar",
                type: "warning",
                timeout: 5000
            });

            return;
        }

        var linhas = this.dados.map(function (item) {
            return {
                "Solicitação": item.nrSolicitacao,
                "Colaborador": item.nmColaborador,
                "Data": item.data,
                "Projeto": item.nmProjeto,
                "Tarefa": item.nmTarefa,
                "Horas Pendentes": item.horas
            };
        });

        var ws = XLSX.utils.json_to_sheet(linhas);
        var wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(wb, ws, "Aprovações");

        var mes = competencia.split("/")[0] || '00';
        var ano = competencia.split("/")[1] || '0000';
        var nomeArquivo = `aprovacoes_${mes}_${ano}.xlsx`;

        XLSX.writeFile(wb, nomeArquivo);
    },

    atualizarBotaoLote: function () {
        var totalSelecionados = $('.vf-check-aprov:checked').length;

        $('#btn-aprovar-lote').prop('disabled', totalSelecionados === 0);
    },

    atualizarResumoProjeto: function () {
        const projetoSelecionado =
            $('#filtro-cod-projeto-aprov').val();

        const $box =
            $('#vf-total-horas-projeto');

        // Sem projeto selecionado
        if (!projetoSelecionado) {

            $box.hide();

            return;
        }

        // Sem dados
        if (!this.dados || !this.dados.length) {

            $box.hide();

            return;
        }

        // Obtém total
        const totalHorasPendentes = this.dados[0].totalHorasPendentes || '00:00';
        const totalHorasAprovadas = this.dados[0].totalHorasAprovadas || '00:00';

        // Atualiza HTML
        $box.find('.vf-total-pendente-value').text(totalHorasPendentes);
        $box.find('.vf-total-aprovado-value').text(totalHorasAprovadas);

        $box.show();
    },
};
