var TimesheetPainel = (function () {

    var painelLoading = null;

    // =========================
    // Carrega cards de resumo e tabela tarefas do usuario
    // =========================
    function carregarPainel() {
    	
        if (!painelLoading) {
            painelLoading = FLUIGC.loading('#divMeuPainel', {
                textMessage: 'Carregando...'
            });
        }
        
        painelLoading.show();

        setTimeout(function () {
            try {
                var mes = TimesheetServices.carregaMesAno();
                var ano = mes.split("/")[1];
                mes = mes.split("/")[0];

                var c1 = DatasetFactory.createConstraint('MES', mes, mes, ConstraintType.MUST);
                var c2 = DatasetFactory.createConstraint('ANO', ano, ano, ConstraintType.MUST);
                var competencia = TimesheetDataset.getDataset('ds_ts_painel_comp', [c1, c2]);

                var email = $('#emailUsuario').val();
                var codigo = TimesheetServices.carregarCodUsuario(email);

                if (!codigo) {
                	FLUIGC.toast({
                        title: "Erro: ",
                        message: "Usuário não encontrado",
                        type: "danger"
                    });

                    painelLoading.hide();

                    return;
                }

                var c3 = DatasetFactory.createConstraint('CODIGO', codigo, codigo, ConstraintType.MUST);
                var tarefas = TimesheetDataset.getDataset('ds_ts_tarefas', [c3]);

                var codCompetencia = TimesheetServices.carregaMesAno();
                var matriculaUsuario = $("#matriculaUsuario").val();
                var codRM = $("#codRM").val();
                var c4 = DatasetFactory.createConstraint('CODIGO', matriculaUsuario, matriculaUsuario, ConstraintType.MUST);
                var c5 = DatasetFactory.createConstraint('COMPETENCIA', codCompetencia, codCompetencia, ConstraintType.MUST);
                var c6 = DatasetFactory.createConstraint('CHAPA', codRM, codRM, ConstraintType.MUST);
                var horas = TimesheetDataset.getDataset('ds_ts_horas_mes', [c4, c5, c6]);

                if (competencia && competencia.values.length > 0) {
                    var c = competencia.values[0];

                    $('#ts-fim-competencia').text(c.DATA);
                }

                if (horas && horas.values.length > 0) {
                    var h = horas.values[0];
                    
                    if(h.erro == ""){

	                    $('#ts-horas-mes').text(TimesheetServices.decimalParaHora(parseFloat(h.HORASMES || 0)));
	                    $('#ts-horas-aprovadas').text(TimesheetServices.decimalParaHora(parseFloat(h.HORASAPROVADAS || 0)));
	                    $('#ts-horas-pendentes').text(TimesheetServices.decimalParaHora(parseFloat(h.HORASPENDENTES || 0)));
	                    $('#ts-horas-faltantes').text(TimesheetServices.decimalParaHora(parseFloat(h.HORASFALTANTES || 0)));
	                    
                    } else{
                    	FLUIGC.toast({
                            title: "Erro: ",
                            message: h.erro,
                            type: "danger"
                        });
                    	
                    	//return;
                    	
                    	$('#ts-horas-mes').text("200:00");
                        $('#ts-horas-aprovadas').text("00:00");
                        $('#ts-horas-pendentes').text("00:00");
                        $('#ts-horas-faltantes').text("200:00");
                    }
                } 

                TarefasPaginadas.init(tarefas);

            } catch (e) {
                console.error(e);

                FLUIGC.toast({
                    title: 'Erro: ',
                    message: e.message || e,
                    type: 'danger'
                });

                painelLoading.hide();
            }

        }, 300);
    }

    // =========================
    // Carrega informações do usuario no Fluig
    // =========================
    function carregarUsuario() {
    	
        $('#ts-usuario').text(WCMAPI.user);
        $('#matriculaUsuario').val(WCMAPI.userCode);
        $('#emailUsuario').val(WCMAPI.userEmail);

        var email = $('#emailUsuario').val();
        $('#codRM').val(TimesheetServices.carregarCodUsuario(email));
    }

    // =========================
    // Carrega dia da semana
    // =========================
    function carregarDiaSemana() {
    	
        var hoje = new Date();
        var diasSemana = [
            'domingo', 'segunda-feira', 'terça-feira',
            'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'
        ];

        $('#ts-dia-semana').text(diasSemana[hoje.getDay()] + ", ");
    }

    // =========================
    // Carrega data atual
    // =========================
    function carregarDataAtual() {
    	
        $('#ts-data').text(new Date().toLocaleDateString('pt-BR'));
    }

    // =========================
    // Renderiza a tela de detalhes da tarefa
    // =========================
    function abrirDetalhesTarefa(ctx) {
    	
        FLUIGC.modal({
            title: 'Detalhes tarefa',
            content: templateModal(ctx),
            id: 'modalTimesheet',
            size: 'full',
            actions: [
                {
                    label: 'Enviar',
                    bind: 'data-send'
                },
                {
                    label: 'Fechar',
                    autoClose: true
                }
            ]
        });
    }

    // =========================
    // Template utilizado no modal detalhes da tarefa
    // =========================
    function templateModal(ctx) {
    	
        return `
        <div class="vf-modal">
            <div class="row">
                <input type="hidden" id="idProjeto" value="${ctx.idProjeto || ''}">
                ${TimesheetServices.campoTemplate("Projeto", ctx.codProjeto || ctx.idProjeto, "codProjeto")}
                ${TimesheetServices.campoTemplate("Nome Projeto", ctx.projeto, "nmProjeto")}
                ${TimesheetServices.campoTemplate("Código Tarefa", ctx.idTarefa, "idTarefa")}
                <input type="hidden" id="idISM" value="${ctx.idism || ''}">
                <input type="hidden" id="idTRF" value="${ctx.idtrf || ''}">
                ${TimesheetServices.campoTemplate("Tarefa", ctx.tarefa, "nmTarefa")}
                ${TimesheetServices.campoTemplate("Horas Previstas", ctx.horasPrevistas, "hrPrevista")}
                ${TimesheetServices.campoTemplate("Horas Realizadas", ctx.horasRealizadas, "hrRealizada")}
                ${TimesheetServices.campoTemplate("Situação", ctx.situacao, "situacaoTarefa")}
                ${TimesheetServices.campoTemplate("Início Previsto", ctx.inicio, "inicioPrevisto")}
                ${TimesheetServices.campoTemplate("Fim Previsto", ctx.fim, "fimPrevisto")}
            </div>

            <hr/>
            
            <div style="margin: 15px 0;">
		        <h3>Apontamento de horas</h3>
		    </div>

            <div style="margin: 15px 0;">
	            <button class="btn btn-info vf-add-row">
	                +
	            </button>
	        </div>

            <table class="table table-bordered ts-grid-table" id="vf-table-horas">
                <thead>
	                <tr>
		            	<th style="width:30px;text-align:center;">#</th>
		                <th style="width:100px">Data</th>
		                <th style="width:50px">Horas</th>
		                <th style="width:120px">Situação</th>
		                <th style="width:300px">Observação</th>
		                <th style="width:30px"></th>
		            </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
        `;
    }
    function abrirDetalheHoras(ds, titulo) {
    	
        const ctx = montarContextoHoras(ds);

        FLUIGC.modal({
            title: `Detalhamento de horas (${titulo})`,
            content: templateModalHoras(ctx),
            id: 'modalHoras',
            size: 'full',
            actions: [
                {
                    label: 'Fechar',
                    autoClose: true
                }
            ]
        });
    }
    function montarContextoHoras(ds) {
    	
        const agrupado = {};

        if (ds && ds.values) {
            ds.values.forEach(item => {
                const chave = item.data;

                if (!agrupado[chave]) {
                    agrupado[chave] = {
                        data: chave,
                        itens: []
                    };
                }

                agrupado[chave].itens.push({
                    nrSolicitacao: item.nrSolicitacao,
                    nmProjeto: item.nmProjeto,
                    nmTarefa: item.nmTarefa,
                    horas: item.horas,
                    status: item.status
                });
            });
        }

        return Object.values(agrupado);
    }
    function templateModalHoras(ctx) {
        return `
        <div class="vf-modal">
            ${ctx.length === 0 ? '<p>Nenhum registro encontrado</p>' : ''}

            <div class="panel-group" id="accordionHoras">
                ${ctx.map((grupo, index) => {
            const collapseId = `collapse_${index}`;
            const link = window.origin + "/portal/p/1/pageworkflowview?app_ecm_workflowview_detailsProcessInstanceID=" + grupo.itens[i].nrSolicitacao;

            return `
                    <div class="panel panel-default">
                        <div class="panel-heading" style="cursor:pointer;" data-toggle="collapse" data-parent="#accordionHoras" href="#${collapseId}">                            
                            <h4 class="panel-title">
                                <strong>Data:</strong> ${grupo.data}
                            </h4>
                        </div>

                        <div id="${collapseId}" class="panel-collapse collapse">                            
                            <div class="panel-body">
                                <table class="table table-bordered ts-grid-table">
                                    <thead>
                                        <tr>
                                        	<th>Solicitação</th>
                                            <th>Projeto</th>
                                            <th>Tarefa</th>
                                            <th>Horas</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${grupo.itens.map(item => `
                                            <tr>
                                        		<td><a href=${link} target="_blank">${item.nrSolicitacao}</a></td>
                                                <td>${item.nmProjeto}</td>
                                                <td>${item.nmTarefa}</td>
                                                <td>${item.horas}</td>
                                                <td>${item.status}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    `;
        }).join('')}
            </div>
        </div>
        `;
    }

    // =========================
    // Retorna o conteúdo da tabela de tarefas com paginação
    // =========================
    var TarefasPaginadas = {

        dados: [],
        pagina: 1,
        pageSize: 10,

        init: function (dataset) {
            this.dados = dataset.values || [];
            this.pagina = 1;

            $('#btn-export-tarefas-excel')
                .prop('disabled', this.dados.length === 0);

            this.render();
        },

        render: function () {
            this.renderTabela();
            this.renderPaginacao();

            if (painelLoading) {
                painelLoading.hide();
            }
        },

        renderTabela: function () {
            var inicio = (this.pagina - 1) * this.pageSize;
            var fim = inicio + this.pageSize;

            var pageData = this.dados.slice(inicio, fim);

            // monta dataset fake no padrão do Fluig
            var datasetFake = {
                values: pageData
            };

            // reaproveita seu render original
            TimesheetUI.renderTabela(datasetFake, '#ts-tarefas');
        },

        renderPaginacao: function () {
            var totalPaginas = Math.ceil(this.dados.length / this.pageSize);
            var paginaAtual = this.pagina;

            var $wrapper = $('#ts-tarefas-wrapper');

            if ($wrapper.length === 0) {
                $('#ts-tarefas').after(`
	                <div id="ts-tarefas-wrapper" class="vf-paginacao-wrapper">
	                    <ul id="ts-tarefas-paginacao" class="pagination vf-pagination"></ul>

	                    <div class="vf-page-size">
	                        <select id="ts-page-size" class="form-control input-sm" style="width:60px; display:inline-block;">
	                            <option value="10">10</option>
	                            <option value="25">25</option>
	                            <option value="50">50</option>
	                            <option value="100">100</option>
	                        </select>
	                    </div>
	                </div>
	            `);
            }

            var $p = $('#ts-tarefas-paginacao');
            $p.empty();

            function criarItem(label, page, disabled = false, active = false) {
                return `
	                <li class="${disabled ? 'disabled' : ''} ${active ? 'active' : ''}">
	                    <a href="#" data-page="${page}">${label}</a>
	                </li>
	            `;
            }

            $p.append(criarItem('<<', 1, paginaAtual === 1));
            $p.append(criarItem('<', paginaAtual - 1, paginaAtual === 1));
            $p.append(criarItem(paginaAtual, paginaAtual, false, true));
            $p.append(criarItem('>', paginaAtual + 1, paginaAtual === totalPaginas));
            $p.append(criarItem('>>', totalPaginas, paginaAtual === totalPaginas));

            // EVENTOS PAGINAÇÃO
            $p.find('a').on('click', (e) => {
                e.preventDefault();

                var page = parseInt($(e.target).data('page'));

                if (!page || page < 1 || page > totalPaginas) return;

                this.pagina = page;
                this.render();
            });

            // EVENTO PAGE SIZE
            $('#ts-page-size')
                .val(this.pageSize)
                .off('change')
                .on('change', (e) => {
                    this.pageSize = parseInt($(e.target).val());
                    this.pagina = 1;
                    this.render();
                });
        }
    };

    function exportarTarefasExcel() {
        var dados = TarefasPaginadas.dados || [];

        if (!dados.length) {

            FLUIGC.toast({
                title: "Atenção: ",
                message: "Não há tarefas para exportar",
                type: "warning",
                timeout: 5000
            });

            return;
        }

        // MAPEIA COLUNAS
        var linhas = dados.map(function (item) {
            return {
                "Projeto": item.CODPROJETO || item.IDPROJETO || '',
                "Nome Projeto": item.PROJETO || '',
                "Código Tarefa": item.IDTAREFA || '',
                "Tarefa": item.TAREFA || '',
                "Horas Previstas": item.HORAPREVISTA || '',
                "Horas Realizadas": item.HORAREALIZADA || '',
                "Situação": item.STATUS || '',
                "Início Previsto": item.INICIOPREVISTO || '',
                "Fim Previsto": item.FIMPREVISTO || ''
            };
        });

        // CRIA SHEET
        var ws = XLSX.utils.json_to_sheet(linhas);

        // AUTO WIDTH
        ws['!cols'] = [
            { wch: 12 },
            { wch: 40 },
            { wch: 15 },
            { wch: 40 },
            { wch: 18 },
            { wch: 18 },
            { wch: 20 },
            { wch: 15 },
            { wch: 15 }
        ];

        // WORKBOOK
        var wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            wb,
            ws,
            "Tarefas"
        );

        // NOME ARQUIVO
        var competencia = TimesheetServices.carregaMesAno().replace("/", "_");

        var nomeArquivo = "tarefas_" + competencia + ".xlsx";

        XLSX.writeFile(wb, nomeArquivo);
    }

    return {
        carregarPainel: carregarPainel,
        carregarUsuario: carregarUsuario,
        carregarDiaSemana: carregarDiaSemana,
        carregarDataAtual: carregarDataAtual,
        abrirDetalhesTarefa: abrirDetalhesTarefa,
        abrirDetalheHoras: abrirDetalheHoras,
        exportarTarefasExcel: exportarTarefasExcel
    };

})();