var timeoutResetMassiva = null;
var polling = null;
var controleId = null;
var dataInicioPolling = null;
var processamentoEncerrado = false;
var finalizacaoTratada = false;
var pollingProgresso = null;
var totalInicialSnapshot = 0;
var competenciaAtual = null;
var pendentesUltimo = null;
var tempoUltimo = null;
var taxaEMA = null;
var ultimoPendentesValido = null;
var ultimoPercentualValido = 0;
var ultimoProcessadosValido = 0;

var TimesheetAprovacaoMassiva = (function () {

	var detalhesDados = [];
	var detalhesPagina = 1;
	var detalhesPageSize = 10;
	var detalhesControleId = null;

	var historicoDados = [];
	var historicoPagina = 1;
	var historicoPageSize = 10;

	// =========================
    // Polling progress
    // =========================
	function iniciarPollingProgresso() {
		
		pararPollingProgresso();
		TimesheetServices.consultarProgressoSnapshot(); // primeira

		pollingProgresso = setInterval(function () {
			if (processamentoEncerrado || !competenciaAtual || totalInicialSnapshot <= 0) {
				pararPollingProgresso();
				return;
			}
			TimesheetServices.consultarProgressoSnapshot();
		}, 5000); // pode colocar 10000 se quiser mais leve
	}
	function pararPollingProgresso() {
		
		if (pollingProgresso) {
			clearInterval(pollingProgresso);
			pollingProgresso = null;
		}
	}

	// =====================================================
	// Polling pendencias
	// =====================================================
	function iniciarPolling() {

		if (processamentoEncerrado) {
			return;
		}

		pararPolling();

		TimesheetServices.consultarControle();

		polling = setInterval(function () {

			if (processamentoEncerrado || !controleId) {
				pararPolling();
				return;
			}

			TimesheetServices.consultarControle();

		}, 5000);
	}
	function pararPolling() {
		
		if (polling) {
			clearInterval(polling);
			polling = null;
		}
	}

	// =====================================================
	// Renderiza os cards informativos
	// =====================================================
	function renderizarDashboard(ds, row) {

	    row = row || 0;

	    if (!ds || !ds.values || !ds.values[row]) {
	        return;
	    }

	    var item = ds.values[row];

	    var total = parseInt(item.total || "0", 10);
	    var processados = parseInt(item.processados || "0", 10);
	    var status = item.status || item.statusProcessamento || "PENDENTE";

	    if (isNaN(total)) {
	        total = 0;
	    }

	    if (isNaN(processados)) {
	        processados = 0;
	    }

	    var percentual = 0;

	    if (item.percentual !== undefined && item.percentual !== null && item.percentual !== "") {
	        percentual = parseFloat(item.percentual);
	    } else if (total > 0) {
	        percentual = Math.round((processados / total) * 100);
	    }

	    if (isNaN(percentual)) {
	        percentual = 0;
	    }

	    if (percentual < 0) {
	        percentual = 0;
	    }

	    if (percentual > 100) {
	        percentual = 100;
	    }

	    var statusEmAndamento = (
	        status == "PENDENTE" ||
	        status == "PROCESSANDO"
	    );

	    var statusFinal = (
	        status == "FINALIZADO" ||
	        status == "FINALIZADO_COM_ERRO"
	    );

	    // =====================================================
	    // PROTEÇÃO CONTRA REGRESSÃO VISUAL
	    // =====================================================
	    // Durante processamento, o MASTER pode estar defasado.
	    // Portanto, nunca deixa processados/progresso voltar para trás.
	    if (statusEmAndamento) {

	        var processadosDom = parseInt($("#tsMassivaProcessados").text() || "0", 10);
	        var percentualDom = parseInt($("#tsMassivaProgressBar").attr("aria-valuenow") || "0", 10);

	        if (isNaN(processadosDom)) {
	            processadosDom = 0;
	        }

	        if (isNaN(percentualDom)) {
	            percentualDom = 0;
	        }

	        var maiorProcessados = Math.max(
	            processados,
	            processadosDom,
	            ultimoProcessadosValido || 0
	        );

	        var maiorPercentual = Math.max(
	            percentual,
	            percentualDom,
	            ultimoPercentualValido || 0
	        );

	        processados = maiorProcessados;
	        percentual = maiorPercentual;

	        ultimoProcessadosValido = processados;
	        ultimoPercentualValido = percentual;
	    }

	    // Se finalizou, força fechamento visual em 100%
	    if (statusFinal) {
	        percentual = 100;

	        if (total > 0) {
	            processados = total;
	        }

	        ultimoProcessadosValido = processados;
	        ultimoPercentualValido = 100;
	    }

	    $("#divResumoMassiva").show();
	    $("#divProgressMassiva").show();

	    $("#tsMassivaTotal").text(total);
	    $("#tsMassivaProcessados").text(processados);
	    $("#tsMassivaStatus").text(status);

	    $("#tsMassivaProgressBar")
	        .css("width", percentual + "%")
	        .attr("aria-valuenow", percentual)
	        .text(percentual + "%");

	    if (statusEmAndamento) {
	        $("#tsMassivaProgressBar").addClass("progress-bar-striped active");
	    } else {
	        $("#tsMassivaProgressBar").removeClass("progress-bar-striped active");
	    }

	    var $label = $("#tsMassivaStatusLabel");

	    $label.removeClass(
	        "label-default label-info label-success label-danger label-warning"
	    );

	    if (status == "PENDENTE") {
	        $label.addClass("label-default");
	    }

	    if (status == "PROCESSANDO") {
	        $label.addClass("label-info");
	    }

	    if (status == "ERRO") {
	        $label.addClass("label-danger");
	    }

	    if (statusFinal) {

	        $label.addClass(
	            status == "FINALIZADO"
	                ? "label-success"
	                : "label-danger"
	        );

	        finalizarTelaMassiva(status);

	        return;
	    }
	}

	// =====================================================
	// Renderiza o tempo para finalizar o progresso
	// =====================================================
	function renderizarETA(processados, total) {

		if (!dataInicioPolling) {
			dataInicioPolling = new Date();
		}

		if (total <= 0 || processados <= 0) {
			$("#tsMassivaETA").text("--");
			return;
		}

		var agora = new Date();
		var segundosDecorridos = (agora - dataInicioPolling) / 1000;

		if (segundosDecorridos <= 0) {
			$("#tsMassivaETA").text("--");
			return;
		}

		var mediaPorRegistro = segundosDecorridos / processados;
		var restantes = total - processados;

		if (restantes <= 0) {
			$("#tsMassivaETA").text("0 min");
			return;
		}

		var segundosRestantes = restantes * mediaPorRegistro;
		var minutos = Math.ceil(segundosRestantes / 60);

		$("#tsMassivaETA").text(minutos + " min");
	}


	// =====================================================
	// Mantém somente a última versão de cada card de controle
	// =====================================================
	function obterUltimasVersoesControle(lista) {

		var mapa = {};
		var retorno = [];

		if (!lista || lista.length === 0) {
			return retorno;
		}

		for (var i = 0; i < lista.length; i++) {
			var row = lista[i] || {};
			var id = String(row["metadata#id"] || row.documentId || "").trim();
			var versao = parseInt(row["metadata#version"] || row.version || "0", 10);

			if (!id) {
				continue;
			}

			if (isNaN(versao)) {
				versao = 0;
			}

			if (!mapa[id]) {
				mapa[id] = row;
				continue;
			}

			var versaoAtual = parseInt(mapa[id]["metadata#version"] || mapa[id].version || "0", 10);

			if (isNaN(versaoAtual)) {
				versaoAtual = 0;
			}

			if (versao >= versaoAtual) {
				mapa[id] = row;
			}
		}

		for (var key in mapa) {
			if (mapa.hasOwnProperty(key)) {
				retorno.push(mapa[key]);
			}
		}

		return retorno;
	}


	// =====================================================
	// Carrega tabela de histórico
	// =====================================================
	function carregarHistorico() {

		try {
			var ds = TimesheetDataset.getDataset("dsControleAprovacaoTotal", null);

			if (!ds || !ds.values || ds.values.length === 0) {
				historicoDados = [];
				renderizarHistoricoMassiva();
				return;
			}

			var ultimasVersoes = obterUltimasVersoesControle(ds.values);

			historicoDados = ultimasVersoes.filter(function (row) {
				return row.tipoRegistro === "MASTER";
			});

			historicoDados.sort(function (a, b) {
				var ida = parseInt(a["metadata#id"] || "0", 10);
				var idb = parseInt(b["metadata#id"] || "0", 10);
				return idb - ida;
			});

			historicoPagina = 1;
			renderizarHistoricoMassiva();

		} catch (e) {
			console.error(e);

			FLUIGC.toast({
				title: "Erro: ",
				message: e.message || e,
				type: "danger"
			});
		}
	}

	function renderizarHistoricoMassiva() {

		var html = '';

		html += '<div class="panel panel-default ts-panel">';
		html += '   <div class="panel-body">';
		html += '       <h5 class="panel-title">Histórico - Execuções</h5><br>';
		html += '       <div class="table-responsive">';
		html += '           <table class="ts-grid-table">';
		html += '               <thead>';
		html += '                   <tr>';
		html += '                       <th style="width: 100px">ID</th>';
		html += '                       <th style="width: 150px">Status</th>';
		html += '                       <th style="width: 100px">Total</th>';
		html += '                       <th style="width: 100px">Sucesso</th>';
		html += '                       <th style="width: 100px">Erro</th>';
		html += '                       <th style="width: 150px">Início</th>';
		html += '                       <th style="width: 150px">Fim</th>';
		html += '                       <th style="width: 100px">Ações</th>';
		html += '                   </tr>';
		html += '               </thead>';
		html += '               <tbody id="vf-tbody-historico-massiva">';
		html += '               </tbody>';
		html += '           </table>';
		html += '       </div>';
		html += '       <div class="text-center">';
		html += '           <ul id="vf-paginacao-historico-massiva" class="pagination vf-pagination"></ul>';
		html += '       </div>';
		html += '   </div>';
		html += '</div>';

		$("#divHistoricoMassiva").html(html);

		renderizarTabelaHistoricoMassiva();
		renderizarPaginacaoHistoricoMassiva();
	}

	function renderizarTabelaHistoricoMassiva() {

		var inicio = (historicoPagina - 1) * historicoPageSize;
		var fim = inicio + historicoPageSize;
		var pageData = historicoDados.slice(inicio, fim);

		var $tbody = $("#vf-tbody-historico-massiva");
		$tbody.empty();

		if (!pageData || pageData.length === 0) {
			$tbody.append(
				'<tr>' +
				'   <td colspan="8" class="text-center" style="padding:20px;">' +
				'       <i class="flaticon flaticon-info icon-md"></i><br>' +
				'       Nenhum histórico encontrado' +
				'   </td>' +
				'</tr>'
			);
			return;
		}

		for (var i = 0; i < pageData.length; i++) {

			var item = pageData[i];
			var id = item["metadata#id"];
			var status = item.status || "-";
			var statusHtml = montarLabelStatusHistorico(status);

			$tbody.append(
				'<tr class="ts-historico-massiva-row" data-controle-id="' + escapeHtml(id) + '">' +
				'   <td>' + escapeHtml(id) + '</td>' +
				'   <td>' + statusHtml + '</td>' +
				'   <td>' + escapeHtml(item.total || "0") + '</td>' +
				'   <td class="text-success">' + escapeHtml(item.sucesso || "0") + '</td>' +
				'   <td class="text-danger">' + escapeHtml(item.erro || "0") + '</td>' +
				'   <td>' + escapeHtml(TimesheetServices.formatarDataHistorico(item.dataInicio) || "-") + '</td>' +
				'   <td>' + escapeHtml(TimesheetServices.formatarDataHistorico(item.dataFim) || "-") + '</td>' +
				'   <td class="text-center">' +
				'       <button type="button" class="btn btn-default btn-xs" title="Ver erros do controle" ' +
				'           onclick="TimesheetAprovacaoMassiva.visualizarDetalhes(\'' + escapeHtml(id) + '\')">' +
				'           <i class="flaticon flaticon-view icon-sm" aria-hidden="true"></i>' +
				'       </button> ' +
				'       <button type="button" class="btn btn-info btn-xs" title="Ver solicitações do controle" ' +
				'           onclick="TimesheetAprovacaoMassiva.carregarDetalhesSolicitacoes(\'' + escapeHtml(id) + '\', this)">' +
				'           <i class="flaticon flaticon-list icon-sm" aria-hidden="true"></i>' +
				'       </button>' +
				'   </td>' +
				'</tr>'
			);
		}

		if (detalhesControleId) {
			$('.ts-historico-massiva-row[data-controle-id="' + detalhesControleId + '"]').addClass("selected");
		}
	}

	function montarLabelStatusHistorico(status) {

		status = String(status || "-");

		var classe = "label-default";

		if (status === "PROCESSANDO") {
			classe = "label-info";
		}

		if (status === "FINALIZADO") {
			classe = "label-success";
		}

		if (status === "FINALIZADO_COM_ERRO" || status === "ERRO") {
			classe = "label-danger";
		}

		if (status === "PENDENTE") {
			classe = "label-info";
		}

		return '<span class="label ' + classe + '">' + escapeHtml(status) + '</span>';
	}

	function renderizarPaginacaoHistoricoMassiva() {

		var totalPaginas = Math.ceil(historicoDados.length / historicoPageSize);
		var paginaAtual = historicoPagina;
		var $container = $("#vf-paginacao-historico-massiva");

		if (!$container.parent().hasClass("vf-paginacao-wrapper")) {
			$container.wrap('<div class="vf-paginacao-wrapper"></div>');
			$container.after('<div class="vf-page-size"></div>');
		}

		var $wrapper = $container.parent();
		var $pageSizeContainer = $wrapper.find(".vf-page-size");

		$container.empty();

		if (totalPaginas === 0) {
			$pageSizeContainer.empty();
			return;
		}

		$pageSizeContainer.html(
			'<select id="vf-page-size-historico-massiva" class="form-control input-sm" style="width:60px; display:inline-block;">' +
			'   <option value="10">10</option>' +
			'   <option value="25">25</option>' +
			'   <option value="50">50</option>' +
			'   <option value="100">100</option>' +
			'</select>'
		);

		$("#vf-page-size-historico-massiva").val(historicoPageSize);

		function criarItem(label, page, disabled, active) {
			return (
				'<li class="' + (disabled ? "disabled" : "") + " " + (active ? "active" : "") + '">' +
				'   <a href="#" data-page="' + page + '">' + label + '</a>' +
				'</li>'
			);
		}

		$container.append(criarItem("<<", 1, paginaAtual === 1));
		$container.append(criarItem("<", paginaAtual - 1, paginaAtual === 1));
		$container.append(criarItem(paginaAtual, paginaAtual, false, true));
		$container.append(criarItem(">", paginaAtual + 1, paginaAtual === totalPaginas));
		$container.append(criarItem(">>", totalPaginas, paginaAtual === totalPaginas));

		$container.find("a").off("click").on("click", function (e) {
			e.preventDefault();

			var page = parseInt($(this).data("page"), 10);

			if (!page || page < 1 || page > totalPaginas) {
				return;
			}

			historicoPagina = page;
			renderizarTabelaHistoricoMassiva();
			renderizarPaginacaoHistoricoMassiva();
		});

		$("#vf-page-size-historico-massiva").off("change").on("change", function () {
			historicoPageSize = parseInt($(this).val(), 10) || 10;
			historicoPagina = 1;
			renderizarTabelaHistoricoMassiva();
			renderizarPaginacaoHistoricoMassiva();
		});
	}


	// =====================================================
	// Carrega detalhes do histórico
	// =====================================================
	function visualizarDetalhes(documentId) {

		try {

			var ds = TimesheetDataset.getDataset(
				"dsControleAprovacaoTotal",
				[]
			);

			if (!ds || !ds.values || ds.values.length == 0) {
				return;
			}

			var ultimasVersoes = obterUltimasVersoesControle(ds.values);
			var controle = null;

			for (var i = 0; i < ultimasVersoes.length; i++) {

				var item = ultimasVersoes[i];

				if (String(item["metadata#id"]) == String(documentId)) {

					controle = item;

					break;
				}
			}

			if (!controle) {

				FLUIGC.toast({
					title: "Atenção: ",
					message: "Controle não encontrado",
					type: "warning",
				    timeout: 5000
				});

				return;
			}

			var erros = "";

			// concatena erros dos WORKERS do master usando somente a última versão de cada card
			for (var j = 0; j < ultimasVersoes.length; j++) {
				var itemWorker = ultimasVersoes[j];

				if (itemWorker.tipoRegistro !== "WORKER") continue;
				if (String(itemWorker.controlePaiId) !== String(documentId)) continue;

				var eDet = String(itemWorker.errosDetalhados || "");
				if (eDet) {
					erros += eDet + "\n";
				}
			}

			if (!erros.trim()) {
				erros = "Nenhum erro encontrado";
			}

			var html = '';

			html += '<div class="row">';
			html += '   <div class="col-md-3">';
			html += '       <strong>Status:</strong><br>';
			html += controle.status;
			html += '   </div>';

			html += '   <div class="col-md-3">';
			html += '       <strong>Total:</strong><br>';
			html += controle.total;
			html += '   </div>';

			html += '   <div class="col-md-3">';
			html += '       <strong>Sucesso:</strong><br>';
			html += controle.sucesso;
			html += '   </div>';

			html += '   <div class="col-md-3">';
			html += '       <strong>Erro:</strong><br>';
			html += controle.erro;
			html += '   </div>';
			html += '</div>';

			html += '<hr>';

			html += '<div class="row">';
			html += '   <div class="col-md-12">';
			html += '       <label>Erros detalhados</label>';

			html += '       <textarea ' +
				'class="form-control" ' +
				'rows="20" ' +
				'readonly>' +
				erros +
				'</textarea>';

			html += '   </div>';
			html += '</div>';

			FLUIGC.modal({
				title: 'Detalhes execução #' + documentId,
				content: html,
				id: 'modalDetalhesMassiva',
				size: 'large',
				actions: [{
					'label': 'Fechar',
					'autoClose': true
				}]
			});

		} catch (e) {

			console.error(e);

			FLUIGC.toast({
				title: "Erro: ",
				message: e.message || e,
				type: "danger"
			});
		}
	}
	
	function carregarDetalhesSolicitacoes(documentId, element) {
	    
	    var loading = FLUIGC.loading('#divDetalhesMassiva', {
	        textMessage: 'Carregando...'
	    });

	    loading.show();

	    setTimeout(function () {
	        try {

	            detalhesControleId = String(documentId || "");
	            detalhesPagina = 1;
	            detalhesDados = [];

	            $(".ts-historico-massiva-row").removeClass("selected");

	            if (element) {
	                $(element).closest("tr").addClass("selected");
	            } else {
	                $('.ts-historico-massiva-row[data-controle-id="' + detalhesControleId + '"]').addClass("selected");
	            }

	            $("#tsDetalhesMassivaControleId").text(detalhesControleId);
	            $("#tsDetalhesMassivaSelecionado").show();
	            $("#divDetalhesMassiva").show();

	            var constraints = [];

	            constraints.push(
	                DatasetFactory.createConstraint(
	                    "CONTROLE_MASTER_ID",
	                    detalhesControleId,
	                    detalhesControleId,
	                    ConstraintType.MUST
	                )
	            );

	            // PAGE_SIZE = 0 retorna todos para paginação client-side e exportação
	            constraints.push(
	                DatasetFactory.createConstraint(
	                    "PAGE_SIZE",
	                    "0",
	                    "0",
	                    ConstraintType.MUST
	                )
	            );

	            var ds = TimesheetDataset.getDataset(
	                "ds_ts_detalhes_aprovacao_massiva",
	                constraints
	            );

	            if (!ds || !ds.values || ds.values.length === 0) {
	                renderizarDetalhesMassiva([]);

	                FLUIGC.toast({
	                    title: "Atenção: ",
	                    message: "Nenhuma solicitação encontrada para o controle #" + detalhesControleId,
	                    type: "warning",
	                    timeout: 5000
	                });

	                return;
	            }

	            if (ds.values[0].STATUS !== "OK") {
	                renderizarDetalhesMassiva([]);

	                FLUIGC.toast({
	                    title: "Erro: ",
	                    message: ds.values[0].MESSAGE || "Erro ao carregar detalhes da aprovação massiva.",
	                    type: "danger"
	                });

	                return;
	            }

	            for (var i = 0; i < ds.values.length; i++) {

	                var row = ds.values[i];

	                detalhesDados.push({
	                    worker: row.WORKER || "",
	                    nrSolicitacao: row.SOLICITACAO || "",
	                    dataExecucao: row.DATA_EXECUCAO || "",
	                    nmSolicitante: row.NM_SOLICITANTE || "",
	                    dtAbertura: row.DT_ABERTURA || "",
	                    dtApontamento: row.DT_APONTAMENTO || "",
	                    hrApontamento: row.HR_APONTAMENTO || "",
	                    idProjeto: row.ID_PROJETO || "",
	                    nmAprovGestor: row.NM_APROV_GESTOR || "",
	                    dtAprovGestor: row.DT_APROV_GESTOR || "",
	                    status: row.STATUS_SOLICITACAO || "",
	                    detalhes: row.DETALHES || ""
	                });
	            }

	            renderizarDetalhesMassiva(detalhesDados);

	            $("html, body").animate({
	                scrollTop: $("#divDetalhesMassiva").offset().top - 80
	            }, 300);

	        } catch (e) {

	            console.error(e);

	            FLUIGC.toast({
	                title: "Erro: ",
	                message: e.message || e,
	                type: "danger"
	            });

	        } finally {

	            loading.hide();
	        }

	    }, 300);
	}

	// =====================================================
	// Renderiza tabela de detalhes da aprovação massiva
	// =====================================================
	function renderizarDetalhesMassiva(dados) {
		detalhesDados = dados || detalhesDados || [];

		renderizarTabelaDetalhesMassiva();
		renderizarPaginacaoDetalhesMassiva();
		
		$("#btn-export-aprovacao-massiva-excel").prop(
	        "disabled",
	        !detalhesDados || detalhesDados.length === 0
	    );
	}

	function renderizarTabelaDetalhesMassiva() {

		var inicio = (detalhesPagina - 1) * detalhesPageSize;
		var fim = inicio + detalhesPageSize;
		var pageData = detalhesDados.slice(inicio, fim);

		var $tbody = $("#vf-tabela-aprovacao-massiva tbody");
		$tbody.empty();

		if (!pageData || pageData.length === 0) {
			$tbody.append(
				'<tr>' +
				'   <td colspan="10" class="text-center" style="padding:20px;">' +
				'       <i class="flaticon flaticon-info icon-md"></i><br>' +
				'       Nenhum detalhe encontrado' +
				'   </td>' +
				'</tr>'
			);
			return;
		}

		for (var i = 0; i < pageData.length; i++) {
			var item = pageData[i];
			var statusClass = item.status === "Erro" ? "danger" : "success";
			var detalhes = item.detalhes || "-";
			var link = window.origin + "/portal/p/1/pageworkflowview?app_ecm_workflowview_detailsProcessInstanceID=" + item.nrSolicitacao;

			$tbody.append(
		        '<tr>' +
		        '   <td>' +
		        '       <a href="' + link + '" target="_blank">' + escapeHtml(item.nrSolicitacao) + '</a>' +
		        '   </td>' +
		        '   <td>' + escapeHtml(item.nmSolicitante || "-") + '</td>' +
		        '   <td>' + escapeHtml(TimesheetServices.formatarDataHistorico(item.dtAbertura) || "-") + '</td>' +
		        '   <td>' + escapeHtml(item.dtApontamento || "-") + '</td>' +
		        '   <td>' + escapeHtml(item.hrApontamento || "-") + '</td>' +
		        '   <td>' + escapeHtml(item.idProjeto || "-") + '</td>' +
		        '   <td>' + escapeHtml(item.nmAprovGestor || "-") + '</td>' +
		        '   <td>' + escapeHtml(TimesheetServices.formatarDataHistorico(item.dtAprovGestor) || "-") + '</td>' +
		        '   <td><span class="label label-'+statusClass+'">' + escapeHtml(item.status) + '</span></td>' +
		        '   <td title="' + escapeHtml(detalhes) + '">' + escapeHtml(detalhes) + '</td>' +
		        '</tr>'
		    );
		}
	}

	function renderizarPaginacaoDetalhesMassiva() {

		var totalPaginas = Math.ceil(detalhesDados.length / detalhesPageSize);
		var paginaAtual = detalhesPagina;
		var $container = $("#vf-paginacao-aprovacao-massiva");

		if (!$container.parent().hasClass("vf-paginacao-wrapper")) {
			$container.wrap('<div class="vf-paginacao-wrapper"></div>');
			$container.after('<div class="vf-page-size"></div>');
		}

		var $wrapper = $container.parent();
		var $pageSizeContainer = $wrapper.find(".vf-page-size");

		$container.empty();

		if (totalPaginas === 0) {
			$pageSizeContainer.empty();
			return;
		}

		$pageSizeContainer.html(
			'<select id="vf-page-size-aprov-massiva" class="form-control input-sm" style="width:60px; display:inline-block;">' +
			'   <option value="10">10</option>' +
			'   <option value="25">25</option>' +
			'   <option value="50">50</option>' +
			'   <option value="100">100</option>' +
			'</select>'
		);

		$("#vf-page-size-aprov-massiva").val(detalhesPageSize);

		function criarItem(label, page, disabled, active) {
			return (
				'<li class="' + (disabled ? "disabled" : "") + " " + (active ? "active" : "") + '">' +
				'   <a href="#" data-page="' + page + '">' + label + '</a>' +
				'</li>'
			);
		}

		$container.append(criarItem("<<", 1, paginaAtual === 1));
		$container.append(criarItem("<", paginaAtual - 1, paginaAtual === 1));
		$container.append(criarItem(paginaAtual, paginaAtual, false, true));
		$container.append(criarItem(">", paginaAtual + 1, paginaAtual === totalPaginas));
		$container.append(criarItem(">>", totalPaginas, paginaAtual === totalPaginas));

		$container.find("a").off("click").on("click", function (e) {
			e.preventDefault();

			var page = parseInt($(this).data("page"), 10);

			if (!page || page < 1 || page > totalPaginas) {
				return;
			}

			detalhesPagina = page;
			renderizarTabelaDetalhesMassiva();
			renderizarPaginacaoDetalhesMassiva();
		});

		$("#vf-page-size-aprov-massiva").off("change").on("change", function () {
			detalhesPageSize = parseInt($(this).val(), 10) || 10;
			detalhesPagina = 1;
			renderizarTabelaDetalhesMassiva();
			renderizarPaginacaoDetalhesMassiva();
		});
	}

	// =====================================================
	// Helpers dos detalhes da aprovação massiva
	// =====================================================
	function parseSolicitacoesJson(solicitacoesJson) {
		try {
			var parsed = JSON.parse(solicitacoesJson || "[]");

			if (!parsed) {
				return [];
			}

			if (parsed.length === undefined) {
				return [parsed];
			}

			return parsed;

		} catch (e) {
			console.warn("Erro ao converter solicitacoesJson", e);
			return [];
		}
	}

	function extrairNumeroSolicitacao(item) {

		if (item === null || item === undefined) {
			return "";
		}

		if (typeof item === "string" || typeof item === "number") {
			return String(item);
		}

		return String(
			item.nrSolicitacao ||
			item.solicitacao ||
			item.numSolicitacao ||
			item.nrProcesso ||
			item.processInstanceId ||
			""
		);
	}

	function parseErrosDetalhados(errosDetalhados) {

		var map = {};
		var texto = String(errosDetalhados || "");

		if (!texto) {
			return map;
		}

		var regex = /Solicita(?:ç|c)[aã]o:\s*([^\r\n]+)[\s\S]*?Erro:\s*([\s\S]*?)(?=\r?\n-{5,}|\r?\n\[[^\]]+\]|\s*$)/gi;
		var match = null;

		while ((match = regex.exec(texto)) !== null) {
			var solicitacao = String(match[1] || "").trim();
			var detalhe = String(match[2] || "").trim();

			if (solicitacao) {
				map[solicitacao] = detalhe;
			}
		}

		return map;
	}

	function escapeHtml(value) {
		return String(value === null || value === undefined ? "" : value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}


	// =====================================================
	// Controle de botões da tela
	// =====================================================
	function bloquearBotoesProcessando() {
		
		$("#btnBuscarPendencias").prop("disabled", true);
		$("#btnIniciarAprovacaoMassiva").prop("disabled", true);
	}
	function liberarBusca() {
		
		$("#btnBuscarPendencias").prop("disabled", false);
		$("#btnIniciarAprovacaoMassiva").prop("disabled", true);
	}
	function liberarInicio() {
		
		$("#btnBuscarPendencias").prop("disabled", false);
		$("#btnIniciarAprovacaoMassiva").prop("disabled", false);
	}

	// =====================================================
	// Reseta a tela para a forma inicial
	// =====================================================
	function resetarTelaMassiva() {
		
		localStorage.removeItem("tsMassivaControleId");

		$("#divResumoMassiva").hide();
		$("#divProgressMassiva").hide();
		$("#divErrosMassiva").hide();

		detalhesDados = [];
		detalhesPagina = 1;
		detalhesControleId = null;
		renderizarDetalhesMassiva([]);
		
		$("#btn-export-aprovacao-massiva-excel").prop("disabled", true);
		
		$(".ts-historico-massiva-row").removeClass("selected");

		$("#tsDetalhesMassivaSelecionado").hide();

		$("#tsMassivaTotal").text("0");
		$("#tsMassivaProcessados").text("0");

		$("#tsMassivaStatus").text("Aguardando");

		$("#tsMassivaETA").text("--");

		$("#tsMassivaProgressBar")
			.css("width", "0%")
			.attr("aria-valuenow", 0)
			.text("0%")
			.removeClass("progress-bar-striped active");

		liberarBusca();

		dataInicioPolling = null;

		pararPolling();
		pararPollingProgresso();
		carregarHistorico();

		controleId = null;
		processamentoEncerrado = true;
		finalizacaoTratada = false;
		dataInicioPolling = null;
		totalInicialSnapshot = 0;
		competenciaAtual = null;
		pendentesUltimo = null;
		tempoUltimo = null;
		taxaEMA = null;
	}

	// =====================================================
	// Finaliza contagem de pendencias e progress
	// =====================================================
	function finalizarTelaMassiva(status) {

	    if (finalizacaoTratada === true) {
	        return;
	    }

	    finalizacaoTratada = true;
	    processamentoEncerrado = true;

	    pararPolling();
	    pararPollingProgresso();

	    $("#divResumoMassiva").show();
	    $("#divProgressMassiva").show();

	    $("#tsMassivaProgressBar")
	        .removeClass("progress-bar-striped active")
	        .css("width", "100%")
	        .attr("aria-valuenow", 100)
	        .text("100%");

	    $("#tsMassivaStatus").text(status);

	    if (timeoutResetMassiva) {
	        clearTimeout(timeoutResetMassiva);
	        timeoutResetMassiva = null;
	    }

	    timeoutResetMassiva = setTimeout(function () {

	        resetarTelaMassiva();

	        localStorage.removeItem("tsMassivaControleId");

	    }, 10000);
	}
	
	function exportarDetalhesExcel() {

	    if (!detalhesDados || detalhesDados.length === 0) {
	        FLUIGC.toast({
	            title: "Atenção: ",
	            message: "Não há dados para exportar",
	            type: "warning",
	            timeout: 5000
	        });

	        return;
	    }

	    var linhas = detalhesDados.map(function (item) {
	        return {
	            "Controle Master": detalhesControleId || "",
	            "Worker": item.worker || "",
	            "Solicitação": item.nrSolicitacao || "",
	            "Solicitante": item.nmSolicitante || "",
	            "Data Abertura": TimesheetServices.formatarDataHistorico(item.dtAbertura) || "",
	            "Data Apontamento": item.dtApontamento || "",
	            "Horas": item.hrApontamento || "",
	            "Projeto": item.idProjeto || "",
	            "Aprovador": item.nmAprovGestor || "",
	            "Data Aprovação": TimesheetServices.formatarDataHistorico(item.dtAprovGestor) || "",
	            "Status": item.status || "",
	            "Detalhes": item.detalhes || ""
	        };
	    });

	    var ws = XLSX.utils.json_to_sheet(linhas);

	    ws["!cols"] = [
           { wch: 18 }, // Controle Master
           { wch: 10 }, // Worker
           { wch: 15 }, // Solicitação
           { wch: 35 }, // Solicitante
           { wch: 22 }, // Data Abertura
           { wch: 18 }, // Data Apontamento
           { wch: 10 }, // Horas
           { wch: 18 }, // Projeto
           { wch: 35 }, // Aprovador
           { wch: 22 }, // Data Aprovação
           { wch: 12 }, // Status
           { wch: 80 }  // Detalhes
       ];

	    var wb = XLSX.utils.book_new();

	    XLSX.utils.book_append_sheet(
	        wb,
	        ws,
	        "Aprovacao Massiva"
	    );

	    var controle = detalhesControleId || "sem_controle";
	    var agora = new Date();

	    var dataArquivo =
	        agora.getFullYear() +
	        ("0" + (agora.getMonth() + 1)).slice(-2) +
	        ("0" + agora.getDate()).slice(-2) +
	        "_" +
	        ("0" + agora.getHours()).slice(-2) +
	        ("0" + agora.getMinutes()).slice(-2);

	    var nomeArquivo =
	        "aprovacao_massiva_controle_" +
	        controle +
	        "_" +
	        dataArquivo +
	        ".xlsx";

	    XLSX.writeFile(wb, nomeArquivo);
	}

	return {
		iniciarPolling: iniciarPolling,
		iniciarPollingProgresso: iniciarPollingProgresso,
		pararPolling: pararPolling,
		pararPollingProgresso: pararPollingProgresso,
		carregarHistorico: carregarHistorico,
		visualizarDetalhes: visualizarDetalhes,
		carregarDetalhesSolicitacoes: carregarDetalhesSolicitacoes,
		resetarTelaMassiva: resetarTelaMassiva,
		liberarBusca: liberarBusca,
		liberarInicio: liberarInicio,
		bloquearBotoesProcessando: bloquearBotoesProcessando,
		finalizarTelaMassiva: finalizarTelaMassiva,
		renderizarDashboard: renderizarDashboard,
		exportarDetalhesExcel: exportarDetalhesExcel
	};
})();