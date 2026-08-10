var TimesheetServices = (function () {

    var cacheDataset = {};
    
    // =========================
    // Renumera as linhas das tabelas de apontamento
    // =========================
    function renumerarTabelaHorasPainel() {
	
    	$('#vf-table-horas tbody tr').each(function (index) {
    		$(this).find('.vf-linha-numero').text(index + 1);
    	});
    }
	
    function renumerarTabelaHorasApontamento() {
	
    	$('#ts-apontamento-horas tbody tr').each(function (index) {
    		$(this).find('.ts-linha-numero').text(index + 1);
    	});
    }
	
    function renumerarTabelasHoras() {
	
    	renumerarTabelaHorasPainel();
    	renumerarTabelaHorasApontamento();
    }

    // =========================
    // Remove os apontamentos no painel pessoal e no apontamento após envio
    // =========================
    function removerLinhasPorData(data, origem, payload) {
    	
        if (origem == "painel") {
            $('#vf-table-horas tbody tr').each(function () {
                const $tr = $(this);
                const dataLinha = $tr.find('.vf-data').val();

                if (dataLinha === data) {
                    $tr.remove();
                }
            });
            
            renumerarTabelaHorasPainel();

        } else {
            $('#ts-apontamento-horas tbody tr').each(function () {
                const $tr = $(this);
                const dataLinha = $tr.find('.vf-data-apontamento').val();
                const tarefaLinha = $tr.find('.vf-cod-tarefa-apontamento').val();
                const idTarefa = payload.apontamentos[0].idTarefa;

                if (dataLinha == data && tarefaLinha == idTarefa) {
                    $tr.remove();
                }
            });
            
            renumerarTabelaHorasPainel();
        }
    }

    // =========================
    // Consulta o código do usuario do RM
    // =========================
    function carregarCodUsuario(email) {
    	
        var c1 = DatasetFactory.createConstraint('EMAIL', email, email, ConstraintType.MUST);
        var resumo = TimesheetDataset.getDataset('ds_ts_usuario', [c1]);

        if (resumo && resumo.values.length > 0) {
            var usuario = resumo.values[0];

            return usuario.CODIGO;
        }

        return null;
    }

    // =========================
    // Obter mes e ano atual
    // =========================
    function carregaMesAno() {
    	
        var dataAtual = new Date();
        var mes = dataAtual.getMonth() + 1;
        var ano = dataAtual.getFullYear();

        if (mes < 10) { mes = "0" + mes }

        return "02/2026";//mes + "/" + ano;
    }

    // =========================
    // Identifica os campos do template e seus valores
    // =========================
    function campoTemplate(label, value, idCampo) {
    	var valor = "";
    	
    	if(value == 0){
    		valor = '0';
    		
    	}else{
    		valor = value;
    	}
    	
        return `
            <div class="col-md-4">
                <div class="form-group">
                    <label>${label}</label>
                    <input type="text" class="form-control" id="${idCampo || ''}" value="${valor || ''}" readonly>
                </div>
            </div>
        `;
    }

    // =========================
    // Formatação para campos select
    // =========================
    function formatProjeto(data) {
    	
        if (!data.id) {
            return data.text;
        }

        return $(`
            <div>
                <strong>${data.text}</strong>
                <div style="font-size:11px;color:#888">
                    ID: ${data.id}
                </div>
            </div>
        `);
    }
    function formatTarefa(data) {
    	
        if (!data.id) {
            return data.text;
        }

        return $(`
            <div>
                <strong>${data.text}</strong>
                <div style="font-size:11px;color:#888">
                    Código: ${data.id}
                </div>
            </div>
        `);
    }
    function formatColaborador(data) {
    	
        if (!data.id) {
            return data.text;
        }

        return $(`
            <div>
                <strong>${data.text}</strong>
                <div style="font-size:11px;color:#888">
                    Matrícula: ${data.id}
                </div>
            </div>
        `);
    }
    function formatSelection(data) {
    	
        return data.text || data.id;
    }

    // =========================
    // Consulta projetos e tarefas
    // =========================
    function consultarProjetosTarefas(constraints, cacheKey) {
    	
        if (cacheDataset[cacheKey]) {
            return cacheDataset[cacheKey];
        }

        try {
            var dataset = TimesheetDataset.getDataset("ds_ts_projetos_tarefas", constraints);

            cacheDataset[cacheKey] = dataset || { values: [] };

            return cacheDataset[cacheKey];

        } catch (e) {
            console.error("Erro ao consultar dataset:", e);

            return { values: [] };
        }
    }
    
    // =========================
    // Consulta todos os projetos
    // =========================
    function consultarProjetos(constraints, cacheKey) {
    	
        if (cacheDataset[cacheKey]) {
            return cacheDataset[cacheKey];
        }

        try {
            var dataset = TimesheetDataset.getDataset("ds_ts_projetos", constraints);

            cacheDataset[cacheKey] = dataset || { values: [] };

            return cacheDataset[cacheKey];

        } catch (e) {
            console.error("Erro ao consultar dataset:", e);

            return { values: [] };
        }
    }

    // =========================
    // Executa a aprovação em lote
    // =========================
    function executarAprovacaoLote(acao) {
    	
        var myLoading = FLUIGC.loading('#fluig-modal-aprovacao-lote', {
            textMessage: 'Processando solicitações...'
        });

        myLoading.show();

        setTimeout(function () {
            var solicitacoes = $('#fluig-modal-aprovacao-lote').data('solicitacoes') || [];
            var justificativa = $('#txt-justificativa-lote').val();

            // VALIDAÇÃO
            if ((acao === 'REPROVAR' || acao === 'REVISAR') && !justificativa) {
                FLUIGC.toast({
                    title: 'Atenção: ',
                    message: 'Informe a justificativa',
                    type: 'warning',
                    timeout: 5000
                });
                
                myLoading.hide();

                return;
            }

            // DATA/HORA
            var agora = new Date();
            var dataAtual = ("0" + agora.getDate()).slice(-2) + "/" + ("0" + (agora.getMonth() + 1)).slice(-2) + "/" + agora.getFullYear();
            var horaAtual = ("0" + agora.getHours()).slice(-2) + ":" + ("0" + agora.getMinutes()).slice(-2);

            // CONFIGURAÇÃO AÇÃO
            var choosedState = 5;
            var completeTask = false;
            var statusAprovGestor = 'Aprovado';

            if (acao === 'REPROVAR') {
                choosedState = 7;
                completeTask = true;
                statusAprovGestor = 'Reprovado';
            }

            if (acao === 'REVISAR') {
                choosedState = 7;
                completeTask = true;
                statusAprovGestor = 'Revisado';
            }

            // PAYLOADS
            var payloads = solicitacoes.map(function (item) {

                return {
                    processInstanceId: item.nrSolicitacao,
                    usuarioExecucao: $('#matriculaUsuario').val(),
                    acao: acao,
                    choosedState: choosedState,
                    completeTask: completeTask,
                    campos: {
                        nmAprovGestor: $('#ts-usuario').text(),
                        dtAprovGestor: dataAtual,
                        hrAprovGestor: horaAtual,
                        statusAprovGestor: statusAprovGestor,
                        justificativaGestor: justificativa || ''
                    }
                };
            });

            TimesheetWorkflow.executarProcessoLote(payloads, myLoading);
        }, 300);
    }

    // =========================
    // Executa a aprovação individual
    // =========================
    function executarAprovacao(acao) {
    	
        var myLoading = FLUIGC.loading('#fluig-modal-aprovacao', {
            textMessage: 'Processando solicitação...'
        });

        myLoading.show();

        setTimeout(function () {
            var dados = $('#fluig-modal-aprovacao').data('dados');
            var justificativa = $('#txt-justificativa-aprovacao').val();
            var horasAprovadas = $('#txt-horas-aprovacao').val();

            // VALIDAÇÕES
            if ((acao === 'REPROVAR' || acao === 'REVISAR') && !justificativa) {
                FLUIGC.toast({
                    title: 'Atenção: ',
                    message: 'Informe a justificativa',
                    type: 'warning',
                    timeout: 5000
                });

                myLoading.hide();

                return;
            }

            // CONFIGURA AÇÃO
            var choosedState = 5;
            var completeTask = false;
            var statusAprovGestor = 'Aprovado';

            if (acao === 'REPROVAR') {
                choosedState = 7;
                completeTask = true;
                statusAprovGestor = 'Reprovado';
            }

            if (acao === 'REVISAR') {
                choosedState = 7;
                completeTask = true;
                statusAprovGestor = 'Revisado';
            }

            // DATA/HORA
            var agora = new Date();
            var dataAtual = ("0" + agora.getDate()).slice(-2) + "/" + ("0" + (agora.getMonth() + 1)).slice(-2) + "/" + agora.getFullYear();
            var horaAtual = ("0" + agora.getHours()).slice(-2) + ":" + ("0" + agora.getMinutes()).slice(-2);

            // PAYLOAD
            var payload = {
                processInstanceId: dados.nrSolicitacao,
                usuarioExecucao: $('#matriculaUsuario').val(),
                acao: acao,
                choosedState: choosedState,
                completeTask: completeTask,
                campos: {
                    nmAprovGestor: $('#ts-usuario').text(),
                    dtAprovGestor: dataAtual,
                    hrAprovGestor: horaAtual,
                    statusAprovGestor: statusAprovGestor,
                    horasAprovadas: horasAprovadas,
                    justificativaGestor: justificativa || ''
                }
            };

            TimesheetWorkflow.executarProcesso(payload, myLoading);

        }, 300);
    }

    // =====================================================
    // Busca os apontamentos pendentes de aprovação
    // =====================================================
    function buscarPendencias() {

        var myLoading = FLUIGC.loading('#divAprovacaoMassiva', {
            textMessage: 'Buscando pendências...'
        });

        myLoading.show();

        $("#btnIniciarAprovacaoMassiva").prop("disabled", true);

        setTimeout(function () {
            try {
                var competencia = TimesheetServices.carregaMesAno();

                var constraints = [];
                constraints.push(DatasetFactory.createConstraint("COMPETENCIA", competencia, competencia, ConstraintType.MUST));

                var ds = TimesheetDataset.getDataset('ds_ts_pendentes_aprovacao_massiva', constraints);

                var total = ds.values.length;

                $("#divResumoMassiva").show();
                $("#tsMassivaTotal").text(total);

                if (total > 0) {
                    TimesheetAprovacaoMassiva.liberarInicio();
                    
                } else {
                    $("#btnIniciarAprovacaoMassiva").prop("disabled", true);
                }

                FLUIGC.toast({
                    title: "Pendências: ",
                    message: total + " solicitações encontradas",
                    type: "info"
                });

            } catch (e) {
                console.error(e);

                FLUIGC.toast({
                    title: "Erro: ",
                    message: e.message || e,
                    type: "danger"
                });

            } finally {
                myLoading.hide();
            }
        }, 300);
    }
    
	 // =====================================================
	 // Marca o MASTER como PROCESSANDO no backend
	 // =====================================================
	 function marcarMasterComoProcessando(masterId) {
	
	     if (!masterId) {
	         throw "masterId não informado para marcar processamento.";
	     }
	
	     var constraints = [];
	
	     constraints.push(
	         DatasetFactory.createConstraint(
	             "documentId",
	             String(masterId),
	             String(masterId),
	             ConstraintType.MUST
	         )
	     );
	
	     constraints.push(
	         DatasetFactory.createConstraint(
	             "status",
	             "PROCESSANDO",
	             "PROCESSANDO",
	             ConstraintType.MUST
	         )
	     );
	
	     constraints.push(
	         DatasetFactory.createConstraint(
	             "dataFim",
	             "",
	             "",
	             ConstraintType.MUST
	         )
	     );
	
	     var dsUpdate = TimesheetDataset.getDataset(
	         "ds_ts_atualizar_controle_aprovacao",
	         constraints
	     );
	
	     if (!dsUpdate || !dsUpdate.values || dsUpdate.values.length === 0) {
	         throw "Erro ao atualizar MASTER para PROCESSANDO.";
	     }
	
	     if (dsUpdate.values[0].STATUS != "OK") {
	         throw dsUpdate.values[0].MESSAGE || "Erro ao atualizar MASTER para PROCESSANDO.";
	     }
	 }

    // =====================================================
    // Inicia a aprovação massiva
    // =====================================================
    function iniciarAprovMassiva() {

        processamentoEncerrado = false;
        finalizacaoTratada = false;

        if (timeoutResetMassiva) {
            clearTimeout(timeoutResetMassiva);
            timeoutResetMassiva = null;
        }

        var myLoading = FLUIGC.loading('#divAprovacaoMassiva', {
            textMessage: 'Iniciando aprovação massiva...'
        });

        myLoading.show();

        TimesheetAprovacaoMassiva.bloquearBotoesProcessando();

        if (existeProcessamentoAtivo()) {
            myLoading.hide();

            FLUIGC.toast({
                title: "Atenção: ",
                message: "Já existe uma aprovação massiva pendente de aprovação",
                type: "warning",
                timeout: 5000
            });

            recuperarProcessamentoAtivo();

            return;
        }

        setTimeout(function () {
            try {
                var total = parseInt($("#tsMassivaTotal").text() || "0");

                if (total <= 0) {
                    FLUIGC.toast({
                        title: "Atenção: ",
                        message: "Nenhuma pendência encontrada",
                        type: "warning",
                        timeout: 5000
                    });

                    return;
                }

                var competencia = TimesheetServices.carregaMesAno();

                var filtros = {
                    competencia: competencia,
                    colaborador: "",
                    projeto: "",
                    tarefa: ""
                };

                // Snapshot fixo da massa
                var constraintsSnapshot = [];
                constraintsSnapshot.push(DatasetFactory.createConstraint("COMPETENCIA", competencia, competencia, ConstraintType.MUST));

                var dsSnapshot = TimesheetDataset.getDataset("ds_ts_pendentes_aprovacao_massiva", constraintsSnapshot);

                if (!dsSnapshot || !dsSnapshot.values || dsSnapshot.values.length === 0) {
                    throw "Nenhuma solicitação encontrada no snapshot";
                }

                var solicitacoes = [];

                for (var i = 0; i < dsSnapshot.values.length; i++) {

                    var item = dsSnapshot.values[i];

                    solicitacoes.push({
                        nrSolicitacao: item.nrSolicitacao,
                        documentId: item.documentId
                    });
                }

                total = solicitacoes.length;
                totalInicialSnapshot = total;
                competenciaAtual = competencia;
                pendentesUltimo = null;
                tempoUltimo = null;
                taxaEMA = null;

                // MASTER
                var constraintsMaster = [];
                constraintsMaster.push(DatasetFactory.createConstraint("tipoRegistro", "MASTER", "MASTER", ConstraintType.MUST));
                constraintsMaster.push(DatasetFactory.createConstraint("status", "PENDENTE", "PENDENTE", ConstraintType.MUST));
                constraintsMaster.push(DatasetFactory.createConstraint("total", String(total), String(total), ConstraintType.MUST));
                constraintsMaster.push(DatasetFactory.createConstraint("processados", "0", "0", ConstraintType.MUST));
                constraintsMaster.push(DatasetFactory.createConstraint("sucesso", "0", "0", ConstraintType.MUST));
                constraintsMaster.push(DatasetFactory.createConstraint("erro", "0", "0", ConstraintType.MUST));
                constraintsMaster.push(DatasetFactory.createConstraint("dataInicio", new Date().toString(), new Date().toString(), ConstraintType.MUST));
                constraintsMaster.push(DatasetFactory.createConstraint("filtrosJson", JSON.stringify(filtros), JSON.stringify(filtros), ConstraintType.MUST));

                var dsMaster = TimesheetDataset.getDataset("ds_ts_criar_controle_aprovacao", constraintsMaster);

                if (!dsMaster || !dsMaster.values || dsMaster.values.length === 0) {
                    throw "Erro criando controle MASTER";
                }

                if (dsMaster.values[0].STATUS != "OK") {
                    throw dsMaster.values[0].MESSAGE;
                }

                var masterId = dsMaster.values[0].DOCUMENTID;

                // WORKERS
                var qtdWorkers = 5;
                var tamanhoWorker = Math.ceil(total / qtdWorkers);

                for (var w = 1; w <= qtdWorkers; w++) {

                    var inicioWorker = (w - 1) * tamanhoWorker;
                    var fimWorker = inicioWorker + tamanhoWorker;
                    var listaWorker = solicitacoes.slice(inicioWorker, fimWorker);
                    var totalWorker = listaWorker.length;

                    if (totalWorker <= 0) {
                        continue;
                    }

                    var solicitacoesJson = JSON.stringify(listaWorker);

                    var constraintsWorker = [];
                    constraintsWorker.push(DatasetFactory.createConstraint("tipoRegistro", "WORKER", "WORKER", ConstraintType.MUST));
                    constraintsWorker.push(DatasetFactory.createConstraint("controlePaiId", String(masterId), String(masterId), ConstraintType.MUST));
                    constraintsWorker.push(DatasetFactory.createConstraint("worker", String(w), String(w), ConstraintType.MUST));
                    constraintsWorker.push(DatasetFactory.createConstraint("vlrOffset", String(inicioWorker), String(inicioWorker), ConstraintType.MUST));
                    constraintsWorker.push(DatasetFactory.createConstraint("vlrLimit", String(totalWorker), String(totalWorker), ConstraintType.MUST));
                    constraintsWorker.push(DatasetFactory.createConstraint("status", "PENDENTE", "PENDENTE", ConstraintType.MUST));
                    constraintsWorker.push(DatasetFactory.createConstraint("total", String(totalWorker), String(totalWorker), ConstraintType.MUST));
                    constraintsWorker.push(DatasetFactory.createConstraint("processados", "0", "0", ConstraintType.MUST));
                    constraintsWorker.push(DatasetFactory.createConstraint("sucesso", "0", "0", ConstraintType.MUST));
                    constraintsWorker.push(DatasetFactory.createConstraint("erro", "0", "0", ConstraintType.MUST));
                    constraintsWorker.push(DatasetFactory.createConstraint("filtrosJson", JSON.stringify(filtros), JSON.stringify(filtros), ConstraintType.MUST));
                    constraintsWorker.push(DatasetFactory.createConstraint("solicitacoesJson", solicitacoesJson, solicitacoesJson, ConstraintType.MUST));

                    var dsWorker = TimesheetDataset.getDataset(
                        "ds_ts_criar_controle_aprovacao",
                        constraintsWorker
                    );

                    if (!dsWorker || !dsWorker.values || dsWorker.values.length === 0) {
                        throw "Erro criando WORKER " + w;
                    }

                    if (dsWorker.values[0].STATUS != "OK") {
                        throw dsWorker.values[0].MESSAGE;
                    }
                }
                
                marcarMasterComoProcessando(masterId);

                controleId = masterId;
                localStorage.setItem("tsMassivaControleId", String(controleId));

                $("#divProgressMassiva").show();
                $("#tsMassivaStatus").text("PROCESSANDO");

                TimesheetAprovacaoMassiva.iniciarPolling();
                TimesheetAprovacaoMassiva.iniciarPollingProgresso();

                FLUIGC.toast({
                    title: "Sucesso: ",
                    message: "Processamento iniciado",
                    type: "success"
                });

                TimesheetAprovacaoMassiva.carregarHistorico();

            } catch (e) {
                console.error(e);

                FLUIGC.toast({
                    title: "Erro: ",
                    message: e.message || e,
                    type: "danger"
                });

            } finally {
                myLoading.hide();
            }
        }, 300);
    }

    // =====================================================
    // Atualiza a barra de progresso da aprovação massiva
    // =====================================================
    function atualizarBarraEETA(pendentes, dadosValidos) {
        if (totalInicialSnapshot <= 0) return;

        // Se não tiver dados válidos, não mexe em nada
        if (dadosValidos !== true) return;

        var processadosEstimado = totalInicialSnapshot - pendentes;

        // Clamp
        if (processadosEstimado < 0) processadosEstimado = 0;
        if (processadosEstimado > totalInicialSnapshot) processadosEstimado = totalInicialSnapshot;

        var percentual = Math.round((processadosEstimado / totalInicialSnapshot) * 100);

        // ===== Monotônico: nunca volta pra trás =====
        if (percentual < ultimoPercentualValido) {
            percentual = ultimoPercentualValido;
            processadosEstimado = ultimoProcessadosValido;
            
        } else {
            ultimoPercentualValido = percentual;
            ultimoProcessadosValido = processadosEstimado;
        }

        // Atualiza barra
        $("#tsMassivaProgressBar")
            .css("width", percentual + "%")
            .attr("aria-valuenow", percentual)
            .text(percentual + "%");

        if (percentual >= 100) {
            $("#tsMassivaProgressBar").removeClass("progress-bar-striped active");
        }

        // ===== Atualiza CARD de processados junto do progresso =====
        $("#tsMassivaProcessados").text(processadosEstimado);

        // ===== ETA por velocidade real (delta pendentes) com EMA =====
        var agora = new Date().getTime();

        if (pendentesUltimo !== null && tempoUltimo !== null) {
            var deltaPend = pendentesUltimo - pendentes; // quantos saíram
            var deltaT = (agora - tempoUltimo) / 1000;

            // só calcula taxa se houve avanço
            if (deltaT > 0 && deltaPend > 0) {
                var taxaAtual = deltaPend / deltaT; // regs/seg
                var alpha = 0.3;
                taxaEMA = (taxaEMA === null) ? taxaAtual : (alpha * taxaAtual + (1 - alpha) * taxaEMA);
            }
        }

        pendentesUltimo = pendentes;
        tempoUltimo = agora;

        if (!taxaEMA || taxaEMA <= 0) {
            // Não zera; mantém "--" até ter avanço real
            $("#tsMassivaETA").text("--");
        } else {
            var segundosRestantes = pendentes / taxaEMA;
            var minutos = Math.ceil(segundosRestantes / 60);
            $("#tsMassivaETA").text(minutos + " min");
        }

        // 1) Se MASTER finalizou, encerra a UI mesmo com pendentes remanescentes (erros)
        var master = consultarMasterStatus(controleId);
        if (master && (master.status === "FINALIZADO" || master.status === "FINALIZADO_COM_ERRO")) {

            // força barra 100% e status final
            $("#tsMassivaProgressBar")
                .removeClass("progress-bar-striped active")
                .css("width", "100%")
                .attr("aria-valuenow", 100)
                .text("100%");

            $("#tsMassivaStatus").text(master.status);

            // se você estiver exibindo processados pelo snapshot, pode ajustar aqui:
            if (master.total > 0) $("#tsMassivaProcessados").text(master.total);

            // PARA OS DOIS POLLINGS
            TimesheetAprovacaoMassiva.pararPolling();
            TimesheetAprovacaoMassiva.pararPollingProgresso();

            TimesheetAprovacaoMassiva.finalizarTelaMassiva(master.status);
            return;
        }

        // ===== Finalização somente quando pendentes == 0 COM DADO VÁLIDO =====
        if (pendentes === 0) {
            // como você comentou erro/sucesso, vamos assumir finalizado simples
            var statusFinal = "FINALIZADO";
            $("#tsMassivaStatus").text(statusFinal);
            TimesheetAprovacaoMassiva.finalizarTelaMassiva(statusFinal);
        }
    }

    // =====================================================
    // Consulta o status do controle master da aprovação massiva
    // =====================================================
    
    // =====================================================
    // Mantém somente a última versão de cada card de controle
    // =====================================================
    function obterUltimasVersoesControleMassiva(lista) {
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

function consultarMasterStatusViaTotal(masterId) {
        try {
            var ds = TimesheetDataset.getDataset("dsControleAprovacaoTotal", null);
            if (!ds || !ds.values) return null;

            var ultimasVersoes = obterUltimasVersoesControleMassiva(ds.values);

            for (var i = 0; i < ultimasVersoes.length; i++) {
                var row = ultimasVersoes[i];
                if (row.tipoRegistro === "MASTER" && String(row["metadata#id"]) === String(masterId)) {
                    return {
                        status: String(row.status || ""),
                        total: parseInt(row.total || "0", 10),
                        processados: parseInt(row.processados || "0", 10),
                        erro: parseInt(row.erro || "0", 10)
                    };
                }
            }

            return null;
        } catch (e) {
            console.error(e);
            return null;
        }
    }
    function consultarMasterStatus(masterId) {
        try {
            var constraints = [];
            constraints.push(DatasetFactory.createConstraint("documentId", String(masterId), String(masterId), ConstraintType.MUST));
            var ds = TimesheetDataset.getDataset("ds_ts_consultar_controle_aprovacao", constraints);

            if (!ds || !ds.values || ds.values.length === 0) return null;

            return {
                status: String(ds.values[0].status || ""),
                total: parseInt(ds.values[0].total || "0", 10),
                processados: parseInt(ds.values[0].processados || "0", 10),
                erro: parseInt(ds.values[0].erro || "0", 10)
            };
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    // =====================================================
    // Consulta as pendencias para o progress
    // =====================================================
    function consultarProgressoSnapshot() {
        try {
            if (!competenciaAtual || totalInicialSnapshot <= 0) return;

            var constraints = [];
            constraints.push(
                DatasetFactory.createConstraint("COMPETENCIA", competenciaAtual, competenciaAtual, ConstraintType.MUST)
            );

            // dataset COUNT (1 linha)
            var ds = TimesheetDataset.getDataset("ds_ts_pendentes_aprovacao_progresso", constraints);

            // Se falhou, NÃO zera nada. Mantém último valor.
            if (!ds || !ds.values || ds.values.length === 0) {
                return;
            }

            // Se o dataset devolve STATUS/erro, respeita
            var status = (ds.values[0].STATUS || "OK");
            if (status !== "OK") {
                return;
            }

            var raw = ds.values[0].PENDENTES;
            var pendentes = parseInt(raw, 10);

            // Se veio NaN, mantém último pendentes válido (não zera!)
            if (isNaN(pendentes)) {
                if (ultimoPendentesValido !== null) {
                    pendentes = ultimoPendentesValido;
                } else {
                    return;
                }
            }

            // Clamp de segurança
            if (pendentes < 0) pendentes = 0;
            if (pendentes > totalInicialSnapshot) pendentes = totalInicialSnapshot;

            ultimoPendentesValido = pendentes;

            var master = consultarMasterStatusViaTotal(controleId);
            if (master && (master.status === "FINALIZADO" || master.status === "FINALIZADO_COM_ERRO")) {

                $("#tsMassivaStatus").text(master.status);

                $("#tsMassivaProgressBar")
                    .removeClass("progress-bar-striped active")
                    .css("width", "100%")
                    .attr("aria-valuenow", 100)
                    .text("100%");

                // fecha processados em 100% do total do lote (não depende do snapshot)
                if (master.total > 0) $("#tsMassivaProcessados").text(master.total);

                TimesheetAprovacaoMassiva.pararPolling();
                TimesheetAprovacaoMassiva.pararPollingProgresso();
                TimesheetAprovacaoMassiva.finalizarTelaMassiva(master.status);
                return;
            }

            atualizarBarraEETA(pendentes, /*dadosValidos=*/true);

        } catch (e) {
            // em erro de consulta, não zera UI
            console.error(e);
        }
    }

    // =====================================================
    // Consulta o controle master da aprovação massiva
    // =====================================================
    function consultarControle() {

        if (processamentoEncerrado || !controleId) {
            return;
        }

        try {

            var constraints = [];
            constraints.push(
                DatasetFactory.createConstraint(
                    "documentId",
                    String(controleId),
                    String(controleId),
                    ConstraintType.MUST
                )
            );

            var ds = TimesheetDataset.getDataset(
                "ds_ts_consultar_controle_aprovacao",
                constraints
            );

            if (!ds || !ds.values || ds.values.length == 0) {
                return;
            }

            var row = ds.values[0];

            if (row.STATUS && row.STATUS != "OK") {
                console.warn("Erro ao consultar controle:", row.MESSAGE);
                return;
            }

            TimesheetAprovacaoMassiva.renderizarDashboard(ds, 0);
            TimesheetAprovacaoMassiva.carregarHistorico();

        } catch (e) {
            console.error(e);
        }
    }

    // =====================================================
    // Verifica processamento
    // =====================================================
    function recuperarProcessamentoAtivo() {

        try {
            var ds = TimesheetDataset.getDataset("dsControleAprovacaoTotal", null);

            if (!ds || !ds.values || ds.values.length == 0) {
                TimesheetAprovacaoMassiva.liberarBusca();
                return;
            }

            var controles = obterUltimasVersoesControleMassiva(ds.values);

            if (controles.length === 0) {
                TimesheetAprovacaoMassiva.liberarBusca();
                TimesheetAprovacaoMassiva.carregarHistorico();
                return;
            }

            var controleIndex = -1;
            var maiorId = -1;

            // PRIORIDADE 1: MASTER PROCESSANDO mais recente
            for (var i = 0; i < controles.length; i++) {
                var rowProc = controles[i];
                var statusProc = String(rowProc.status || "");
                var tipoProc = String(rowProc.tipoRegistro || "");
                var idProc = parseInt(rowProc["metadata#id"] || "0", 10);

                if (tipoProc == "MASTER" && statusProc == "PROCESSANDO" && idProc > maiorId) {
                    maiorId = idProc;
                    controleIndex = i;
                }
            }

            // PRIORIDADE 2: MASTER PENDENTE mais recente
            if (controleIndex == -1) {
                maiorId = -1;

                for (var j = 0; j < controles.length; j++) {
                    var rowPend = controles[j];
                    var statusPend = String(rowPend.status || "");
                    var tipoPend = String(rowPend.tipoRegistro || "");
                    var idPend = parseInt(rowPend["metadata#id"] || "0", 10);

                    if (tipoPend == "MASTER" && statusPend == "PENDENTE" && idPend > maiorId) {
                        maiorId = idPend;
                        controleIndex = j;
                    }
                }
            }

            if (controleIndex == -1) {

                var ultimoControleId = localStorage.getItem("tsMassivaControleId");

                if (ultimoControleId) {

                    var dsFinalizado = consultarControlePorId(ultimoControleId);

                    if (dsFinalizado && dsFinalizado.values && dsFinalizado.values.length > 0) {

                        var rowFinal = dsFinalizado.values[0];
                        var statusFinal = rowFinal.status || rowFinal.statusProcessamento || "";

                        if (statusFinal == "FINALIZADO" || statusFinal == "FINALIZADO_COM_ERRO") {

                            controleId = ultimoControleId;

                            processamentoEncerrado = false;
                            finalizacaoTratada = false;

                            var totalFinal = parseInt(rowFinal.total || "0", 10);
                            var processadosFinal = parseInt(rowFinal.processados || rowFinal.total || "0", 10);

                            if (isNaN(totalFinal)) totalFinal = 0;
                            if (isNaN(processadosFinal)) processadosFinal = totalFinal;

                            totalInicialSnapshot = totalFinal;
                            ultimoProcessadosValido = processadosFinal;
                            ultimoPercentualValido = 100;
                            ultimoPendentesValido = 0;

                            $("#divResumoMassiva").show();
                            $("#divProgressMassiva").show();

                            TimesheetAprovacaoMassiva.renderizarDashboard(dsFinalizado, 0);
                            TimesheetAprovacaoMassiva.finalizarTelaMassiva(statusFinal);
                            TimesheetAprovacaoMassiva.carregarHistorico();

                            return;
                        }
                    }
                }

                TimesheetAprovacaoMassiva.liberarBusca();
                TimesheetAprovacaoMassiva.carregarHistorico();

                return;
            }

            var master = controles[controleIndex];

            controleId = master["metadata#id"];
            localStorage.setItem("tsMassivaControleId", String(controleId));

            var totalMaster = parseInt(master.total || "0", 10);
            var processadosMaster = parseInt(master.processados || "0", 10);

            if (isNaN(totalMaster)) totalMaster = 0;
            if (isNaN(processadosMaster)) processadosMaster = 0;

            totalInicialSnapshot = totalMaster;

            processamentoEncerrado = false;
            finalizacaoTratada = false;

            if (timeoutResetMassiva) {
                clearTimeout(timeoutResetMassiva);
                timeoutResetMassiva = null;
            }

            competenciaAtual = null;

            try {
                var filtrosJson = master.filtrosJson || "{}";
                var filtros = JSON.parse(filtrosJson);

                if (filtros && filtros.competencia) {
                    competenciaAtual = filtros.competencia;
                }

            } catch (eFiltro) {
                console.warn("Não foi possível ler filtrosJson do controle ativo", eFiltro);
            }

            if (!competenciaAtual) {
                competenciaAtual = TimesheetServices.carregaMesAno();
            }

            var percentualAtual = 0;

            if (totalInicialSnapshot > 0) {
                percentualAtual = Math.round((processadosMaster / totalInicialSnapshot) * 100);
            }

            if (percentualAtual < 0) percentualAtual = 0;
            if (percentualAtual > 100) percentualAtual = 100;

            ultimoPercentualValido = percentualAtual;
            ultimoProcessadosValido = processadosMaster;
            ultimoPendentesValido = totalInicialSnapshot - processadosMaster;

            if (ultimoPendentesValido < 0) {
                ultimoPendentesValido = 0;
            }

            pendentesUltimo = ultimoPendentesValido;
            tempoUltimo = new Date().getTime();
            taxaEMA = null;

            TimesheetAprovacaoMassiva.renderizarDashboard({ values: controles }, controleIndex);

            $("#divResumoMassiva").show();
            $("#divProgressMassiva").show();

            $("#tsMassivaTotal").text(totalInicialSnapshot);
            $("#tsMassivaProcessados").text(processadosMaster);
            $("#tsMassivaStatus").text(master.status || "PROCESSANDO");

            $("#tsMassivaProgressBar")
                .addClass("progress-bar-striped active")
                .css("width", percentualAtual + "%")
                .attr("aria-valuenow", percentualAtual)
                .text(percentualAtual + "%");

            TimesheetAprovacaoMassiva.bloquearBotoesProcessando();

            // Essencial: retoma os dois pollings
            TimesheetAprovacaoMassiva.iniciarPolling();
            TimesheetAprovacaoMassiva.iniciarPollingProgresso();

            TimesheetAprovacaoMassiva.carregarHistorico();

        } catch (e) {
            console.error("Erro recuperar processamento", e);

            FLUIGC.toast({
                title: "Erro: ",
                message: e.message || String(e),
                type: "danger"
            });
        }
    }
    function existeProcessamentoAtivo() {

        var ds = TimesheetDataset.getDataset("dsControleAprovacaoTotal", null);

        if (!ds || !ds.values || ds.values.length == 0) {
            return false;
        }

        var ultimasVersoes = obterUltimasVersoesControleMassiva(ds.values);

        for (var i = 0; i < ultimasVersoes.length; i++) {

            var status = ultimasVersoes[i].status;
            var tipo = ultimasVersoes[i].tipoRegistro;

            if (tipo == "MASTER" && (status == "PENDENTE" || status == "PROCESSANDO")) {
                return true;
            }
        }

        return false;
    }
    function consultarControlePorId(documentId) {

        if (!documentId) {
            return null;
        }

        var constraints = [
            DatasetFactory.createConstraint(
                "documentId",
                String(documentId),
                String(documentId),
                ConstraintType.MUST
            )
        ];

        return TimesheetDataset.getDataset(
            "ds_ts_consultar_controle_aprovacao",
            constraints
        );
    }

    // =====================================================
    // Formata data para 00/00/0000 00:00
    // =====================================================
    function formatarDataHistorico(dateStr) {
    	
        if (!dateStr) return "-";
        dateStr = String(dateStr).trim();
        if (!dateStr) return "-";

        // tenta parse nativo (funciona para "Tue Jun 09 2026 13:44:56 GMT-0300 ...")
        var d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            var dd = ("0" + d.getDate()).slice(-2);
            var mm = ("0" + (d.getMonth() + 1)).slice(-2);
            var yyyy = d.getFullYear();

            var hh = ("0" + d.getHours()).slice(-2);
            var mi = ("0" + d.getMinutes()).slice(-2);
            var ss = ("0" + d.getSeconds()).slice(-2);

            return dd + "/" + mm + "/" + yyyy + " - " + hh + ":" + mi + ":" + ss;
        }

        // fallback manual (se algum navegador não parsear)
        // Ex: Tue Jun 09 2026 13:44:56 GMT-0300 (...)
        var parts = dateStr.split(" ");
        if (parts.length >= 5) {
            var monMap = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
            var mon = monMap[parts[1]] || "01";
            var day = ("0" + parts[2]).slice(-2);
            var year = parts[3];
            var time = parts[4]; // HH:mm:ss
            return day + "/" + mon + "/" + year + " - " + time;
        }

        return dateStr; // último fallback
    }

    // =========================
    // Obtem texto dos campos select
    // =========================
    function getTextoSelect2($select) {
    	
        var data = $select.select2('data');
        
        return data && data.length ? data[0].text : '';
    }

    // =========================
    // Valida inserção de apontamento
    // =========================
    function validarAddLinhaApont() {
    	
        let erros = [];

        if ($('#ts-apontamento-horas tbody tr').length === 0) {
            erros.push('Favor inserir pelo menos uma linha de apontamento');
        }

        return erros;
    }

    // =========================
    // Valida total de horas apontado para o projeto/tarefa
    // =========================
    function validaTotalHorasApont(codigo, competencia, idProjeto, idTarefa, hrPrevista, $rows) {
    	
        let erros = [];
        competencia = competencia.split("/")[1] + "/" + competencia.split("/")[2];

        var constraints = [];
        constraints.push(DatasetFactory.createConstraint("CODIGO", codigo, codigo, ConstraintType.MUST));
        constraints.push(DatasetFactory.createConstraint("COMPETENCIA", competencia, competencia, ConstraintType.MUST));
        constraints.push(DatasetFactory.createConstraint("CODPROJETO", idProjeto, idProjeto, ConstraintType.MUST));
        constraints.push(DatasetFactory.createConstraint("IDTAREFA", idTarefa, idTarefa, ConstraintType.MUST));

        var ds = TimesheetDataset.getDataset('ds_ts_horas_por_projeto_tarefa', constraints);

        if (!ds || !ds.values || ds.values.length === 0) {
            erros.push("Não foi possível consultar horas já apontadas.");
            return erros;
        }

        var erroDataset = ds.values[0].ERRO;

        if (erroDataset && erroDataset !== "") {
            erros.push(erroDataset);
            return erros;
        }

        var totalHoras = parseFloat(ds.values[0].HORAS) || 0;

        var calculoHoras = 0;
        let linha = 0;

        $rows.each(function (index) {
            linha = index + 1;
            const hora = $(this).find('.vf-horas-apontamento').val();
            const data = $(this).find('.vf-data-apontamento').val();

            if (!hora) return;

            calculoHoras += horaParaDecimal(hora);

            if (calculoHoras + totalHoras > parseInt(hrPrevista)) {

                erros.push(
                    `Linha ${linha} do dia ${data}: Ultrapassou o limite de horas para a tarefa.\n` +
                    `Previstas: ${hrPrevista}h | ` +
                    `Já apontadas: ${totalHoras.toFixed(2)}h | ` +
                    `Tentando adicionar: ${calculoHoras.toFixed(2)}h`
                );
            }
        });

        return erros;
    }

    // =========================
    // Transforma hora 000:00 em decimal
    // =========================
    function horaParaDecimal(valor) {

        // null/undefined
        if (valor === null || valor === undefined || valor === '') {
            return 0;
        }

        // já é número/decimal
        if (typeof valor === 'number') {
            return valor;
        }

        // garante string
        valor = String(valor).trim();

        // formato HH:MM
        if (valor.indexOf(':') !== -1) {

            var partes = valor.split(':');

            var horas = parseInt(partes[0], 10) || 0;
            var minutos = parseInt(partes[1], 10) || 0;

            return horas + (minutos / 60);
        }

        // decimal em texto
        return parseFloat(valor) || 0;
    }

    // =========================
    // Transforma hora decimal em 00:00
    // =========================
    function decimalParaHora(decimal) {
        if (!decimal || isNaN(decimal)) return "00:00";

        var horas = Math.floor(decimal);
        var minutos = Math.round((decimal - horas) * 60);

        // ajuste caso arredonde 60 minutos
        if (minutos === 60) {
            horas += 1;
            minutos = 0;
        }

        return String(horas).padStart(2, '0') + ':' +
            String(minutos).padStart(2, '0');
    }

    // =========================
    // Converte HH:MM ou decimal em minutos
    // =========================
    function horaParaMinutos(valor) {

        if (valor === null || valor === undefined || valor === '') {
            return 0;
        }

        // já é número decimal
        if (typeof valor === 'number') {
            return Math.round(valor * 60);
        }

        valor = String(valor).trim();

        // HH:MM
        if (valor.indexOf(':') !== -1) {

            var partes = valor.split(':');

            var horas = parseInt(partes[0], 10) || 0;
            var minutos = parseInt(partes[1], 10) || 0;

            return (horas * 60) + minutos;
        }

        // decimal texto
        return Math.round((parseFloat(valor) || 0) * 60);
    }

    // =========================
    // Converte HH:MM ou decimal em minutos
    // =========================
    function getStatusClass(status) {
    	
        if (!status) return '';

        status = status.toLowerCase();

        if (status.includes('pendente') || status.includes('revisado')) return 'warning';
        if (status.includes('aprovado')) return 'success';
        if (status.includes('reprovado')) return 'danger';

        return '';
    }

    // =========================
    // Valida preenchimento dos campos do apontamento
    // =========================
    function validarCamposApont($rows) {
    	
        let erros = [];

        //var horasFaltantesStr = $('#ts-horas-faltantes').text();
        var horasFaltantesMes = horaParaDecimal(consultarHorasFaltantes());
        var totalDigitadoMes = 0;
        var jornada = obterJornadaParaApontamento();
        var limiteHorasDia = obterLimiteHorasDiaDecimal(jornada);
        var limiteMinutosDia = Math.round(limiteHorasDia * 60);

        $rows.each(function (index) {
            const linha = index + 1;
            const data = $(this).find('.vf-data-apontamento').val();
            const horas = $(this).find('.vf-horas-apontamento').val();
            const horasAtuais = $(this).find('.vf-hora-atual-apontamento').val();
            const projeto = $(this).find('.vf-cod-projeto-apontamento').val();
            const tarefa = $(this).find('.vf-cod-tarefa-apontamento').val();

            // DATA OBRIGATÓRIA
            if (!data) {
                erros.push(`Linha ${linha}: Data não informada`);
            }

            validarDataDentroDaJornada(data, jornada, linha, erros);

            // HORA OBRIGATÓRIA
            if (!horas) {
                erros.push(`Linha ${linha} com data ${data}: Horas não informadas`);
            }

            // PROJETO OBRIGATÓRIO
            if (!projeto) {
                erros.push(`Linha ${linha} com data ${data}: Projeto não informado`);
            }

            // TAREFA OBRIGATÓRIO
            if (!tarefa) {
                erros.push(`Linha ${linha} com data ${data}: Tarefa não informada`);
            }

            // FORMATO HH:MM
            if (!/^([0-9]{2}):([0-5][0-9])$/.test(horas)) {
                erros.push(`Linha ${linha} com data ${data}: Formato de hora inválido (use HH:MM)`);
            }

            // LIMITE DIÁRIO CONFORME JORNADA
            const [h, m] = horas.split(":").map(Number);
            var minutosInformados = (h * 60) + m;

            if (minutosInformados > limiteMinutosDia) {
                erros.push(
                    `Linha ${linha} com data ${data}: Não pode ultrapassar ${jornada.horasDia} horas`
                );
            }

            if (h === 0 && m === 0) {
                erros.push(`Linha ${linha} com data ${data}: Horas zeradas`);
            }

            var horasDigitadas = horaParaDecimal(horas);

            totalDigitadoMes += horasDigitadas;

            if (horasAtuais) {

                var minutosAtuais = horaParaMinutos(horasAtuais);
                var minutosDigitados = horaParaMinutos(horas);
                var totalMinutos = minutosAtuais + minutosDigitados;
                var limiteMinutos = limiteMinutosDia;

                if (totalMinutos > limiteMinutos) {

                    var minutosRestantes = limiteMinutos - minutosAtuais;
                    var horasRestantes = minutosParaHora(minutosRestantes);

                    erros.push(
                        `Linha ${linha} com data ${data}: Você pode apontar somente ${horasRestantes}`
                    );
                }
            }    
        });
        
        // VALIDAÇÃO MENSAL
        if (totalDigitadoMes > horasFaltantesMes) {
            let restante = decimalParaHora(horasFaltantesMes);

            if(horasFaltantesMes > 0){
            	
            	erros.push(
                    `Total mensal excedido: você pode apontar somente ${restante} no mês`
                );
            	
            } else{
            	
            	erros.push(
                    `Total mensal excedido: você não pode mais apontar nessa competência`
                );
            }            
        }

        return erros;
    }
    
    function consultarHorasFaltantes(){
    	 	
    	var codCompetencia = carregaMesAno();
        var matriculaUsuario = $('#delegar-apontamento-matr').val() ? $('#delegar-apontamento-matr').val() : $('#matriculaUsuario').val();
        var codRMUsuario = $('#delegar-apontamento-codRM').val() ? $('#delegar-apontamento-codRM').val() : $('#codRM').val();
        
        var c1 = DatasetFactory.createConstraint('CODIGO', matriculaUsuario, matriculaUsuario, ConstraintType.MUST);
        var c2 = DatasetFactory.createConstraint('COMPETENCIA', codCompetencia, codCompetencia, ConstraintType.MUST);
        var c3 = DatasetFactory.createConstraint('CHAPA', codRMUsuario, codRMUsuario, ConstraintType.MUST);
        
        var horas = TimesheetDataset.getDataset('ds_ts_horas_mes', [c1, c2, c3]);
        
        var horasFaltantesMes = horas.values[0].HORASFALTANTES;
        
        return horasFaltantesMes;
    }

    // =========================
    // BLoqueia inserção de data fora da competencia atual
    // =========================
    function validarMesAtualApont($rows, competencia) {
    	
        let erros = [];

        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();
        
        const diaCompetencia = competencia.split("/")[0];
        const mesCompetencia = competencia.split("/")[1];

        $rows.each(function (index) {
            const linha = index + 1;
            const dataStr = $(this).find('.vf-data-apontamento').val();

            if (!dataStr) return;

            const [dia, mes, ano] = dataStr.split('/').map(Number);

            const dataInserida = ano + "/" + mes + "/" + dia;

            const data = new Date(dataInserida);

            if (data.getFullYear() !== anoAtual || 2 !== parseInt(mesCompetencia)) {//data.getMonth() + 1 !== parseInt(mesCompetencia)) {
                erros.push(`Linha ${linha}: Data fora do mês atual`);
            }

            if (parseInt(dia) > parseInt(diaCompetencia) && data.getMonth() + 1 === parseInt(mesCompetencia)) {
                erros.push(`Linha ${linha}: Data ultrapassou a competência`);
            }
        });

        return erros;
    }

    // =========================
    // Cancela apontamento
    // =========================
    function executarCancelamento(nrSolicitacao, motivo, modal) {

        var myLoading = FLUIGC.loading('#vf-tabela-consulta', {
            textMessage: 'Cancelando apontamento...'
        });

        myLoading.show();

        setTimeout(function () {
            var tipo = "matricula";

            var dados = {
                nrSolicitacao: nrSolicitacao,
                usuario: getUsuarioBase(tipo),
                motivo: motivo
            };

            TimesheetWorkflow.cancelarProcesso(dados, myLoading);

            $('#fluig-modal-cancelamento').modal('hide');
        }, 300);
    }

    // =========================
    // Edita apontamento
    // =========================
    function executarEdicao($modal) {
        var myLoading = FLUIGC.loading('#fluig-modal-edicao', {
            textMessage: 'Editando apontamento...'
        });

        myLoading.show();

        setTimeout(function () {
            var dadosOriginais = $modal.data('dados');

            var nrSolicitacao = dadosOriginais.nrSolicitacao;
            var statusAtual = dadosOriginais.status;

            // CAPTURA CAMPOS EDITADOS
            var nmProjeto = TimesheetServices.getTextoSelect2($modal.find('.vf-zoom-projeto'));
            var idProjeto = $modal.find('.vf-id-projeto-apontamento').val();
            var codProjeto = $modal.find('.vf-cod-projeto-apontamento').val();
            var nmTarefa = TimesheetServices.getTextoSelect2($modal.find('.vf-zoom-tarefa'));
            var codTarefa = $modal.find('.vf-cod-tarefa-apontamento').val();
            var idISM = $modal.find('.vf-idism-apontamento').val();
            var idTRF = $modal.find('.vf-idtrf-apontamento').val();
            var observacao = $modal.find('.vf-obs-apontamento').val();
            var data = $modal.find('#edit-data').val();
            var horas = $modal.find('#edit-horas').val();

            // REGRAS DE NEGÓCIO
            var choosedState = 5;
            var completeTask = false;
            var statusAprovGestor = statusAtual;
            var nmAprovador = dadosOriginais.aprovador;
            var dtAprovGestor = dadosOriginais.dataAprov;
            var hrAprovGestor = dadosOriginais.hrAprov;
            var justificativaGestor = dadosOriginais.justificativa;

            if (statusAtual.toLowerCase().includes("revisado")) {

                completeTask = true;
                statusAprovGestor = "Pendente aprovação";
            }

            if (statusAtual.toLowerCase().includes("pendente")) {
            	
                completeTask = false;
            }

            // MONTA PAYLOAD
            var payload = {
                processInstanceId: nrSolicitacao,
                usuarioExecucao: $('#matriculaUsuario').val(),
                choosedState: choosedState,
                completeTask: completeTask,
                origem: safeData($modal.data("origem")),
                contexto: safeData($modal.data("contexto")),

                campos: {
                    nmProjeto: nmProjeto,
                    idProjeto: idProjeto,
                    codProjeto: codProjeto,
                    nmTarefa: nmTarefa,
                    codTarefa: codTarefa,
                    idISM: idISM,
                    idTRF: idTRF,
                    observacao: observacao,
                    dtApontamento: data,
                    hrApontamento: horas,
                    nmAprovGestor: nmAprovador,
                    dtAprovGestor: dtAprovGestor,
                    hrAprovGestor: hrAprovGestor,
                    statusAprovGestor: statusAprovGestor,
                    justificativaGestor: justificativaGestor
                }
            };

            TimesheetWorkflow.editarProcesso(payload, myLoading);
        }, 300);
    }

    function safeData(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value);
    }

    // =========================
    // Exporta apontamentos para excel
    // =========================
    function exportarExcelDados(dados) {

        if (!dados || dados.length === 0) {
            FLUIGC.toast({
                title: "Atenção: ",
                message: "Não há dados para exportar",
                type: "warning",
                timeout: 5000
            });
            return;
        }

        // MAPEIA DADOS (define colunas)
        var linhas = dados.map(function (item) {
            return {
                "Solicitação": item.nrSolicitacao,
                "Data": item.data,
                "Nome Projeto": item.nmProjeto,
                "Projeto": item.codProjeto || item.idProjeto,
                "Tarefa": item.nmTarefa,
                "Código Tarefa": item.codTarefa,
                "Situação": item.status,
                "Horas": item.horas
            };
        });

        // CRIA PLANILHA
        var ws = XLSX.utils.json_to_sheet(linhas);

        // AUTO WIDTH (melhora UX)
        var colWidths = Object.keys(linhas[0]).map(function (key) {
            return { wch: key.length + 5 };
        });
        ws['!cols'] = colWidths;

        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Apontamentos");

        // NOME ARQUIVO COM FILTRO
        var mes = $('#filtro-mes').val() || '00';
        var ano = $('#filtro-ano').val() || '0000';

        var nomeArquivo = `apontamentos_${mes}_${ano}.xlsx`;

        XLSX.writeFile(wb, nomeArquivo);
    }

    // =========================
    // Obtém matricula Fluig ou cod RM
    // =========================
    function getUsuarioBase(tipo) {

        tipo = tipo || "matricula";

        var delegadoMatr = $('#delegar-apontamento-matr').val();
        var delegadoCod = $('#delegar-apontamento-codRM').val();

        var matricula = $('#matriculaUsuario').val();
        var codRM = $('#codRM').val();

        // MATRÍCULA (FLUIG)
        if (tipo === "matricula") {

            if (!delegadoMatr) {
                return matricula;
            }

            return delegadoMatr;
        }

        // CÓDIGO (RM)
        if (tipo === "codigo") {

            // SEM DELEGAÇÃO
            if (!delegadoCod) {
                return codRM;
            }

            // COM DELEGAÇÃO
            try {

                // 1 - BUSCA EMAIL
                var cCol = DatasetFactory.createConstraint(
                    "colleaguePK.colleagueId",
                    delegadoMatr,
                    delegadoMatr,
                    ConstraintType.MUST
                );

                var dsColleague = DatasetFactory.getDataset(
                    "colleague",
                    ["mail"],
                    [cCol],
                    null
                );

                if (!dsColleague || !dsColleague.values || dsColleague.values.length === 0) {
                    console.error("Colleague não encontrado:", delegadoMatr);
                    return "";
                }

                var email = dsColleague.values[0].mail;

                if (!email) {
                    console.error("Email não encontrado para:", delegadoMatr);
                    return "";
                }

                // 2 - BUSCA CODIGO RM
                var cUser = DatasetFactory.createConstraint(
                    "EMAIL",
                    email,
                    email,
                    ConstraintType.MUST
                );

                var dsUser = DatasetFactory.getDataset(
                    "ds_ts_usuario",
                    null,
                    [cUser],
                    null
                );

                if (!dsUser || !dsUser.values || dsUser.values.length === 0) {
                    console.error("Usuário RM não encontrado:", email);
                    return "";
                }

                return dsUser.values[0].CODIGO;

            } catch (e) {
                console.error("Erro ao obter código RM:", e);
                return "";
            }
        }

        return "";
    }

    function clearCache() {
    	
        cacheDataset = {};
    }

    // =========================
    // Obtém aprovadores do projeto
    // =========================
    function obterAprovador(codProjeto) {
        try {
            if (!codProjeto || String(codProjeto).trim() === "") {
                return retornoErroAprovador("Projeto não informado para buscar aprovadores.");
            }

            var constraints = [];
            constraints.push(DatasetFactory.createConstraint("CODPRJ",codProjeto,codProjeto,ConstraintType.MUST));

            var dsAprovador = TimesheetDataset.getDataset("ds_ts_aprovador_projeto",constraints);

            if (!dsAprovador || !dsAprovador.values || dsAprovador.values.length === 0) {
                return retornoErroAprovador(
                    "Aprovadores não encontrados para o projeto: " + codProjeto
                );
            }

            var primeiraLinha = dsAprovador.values[0] || {};
            var erro = primeiraLinha.ERRO || "";

            if (String(erro).trim() !== "") {
                return retornoErroAprovador(String(erro).trim());
            }

            var aprovadores = primeiraLinha.APROVADORES || "";

            if (String(aprovadores).trim() === "") {
                return retornoErroAprovador(
                    "Nenhum aprovador configurado/localizado para o projeto: " + codProjeto
                );
            }
            
            var matriculaGestor = primeiraLinha.GESTOR || "";
            var nomeGestor = buscarNomeUsuarioFluigPorMatricula(matriculaGestor);

            return {
                success: true,
                aprovadores: String(aprovadores).trim(),
                gestor: String(nomeGestor).trim(),
                message: ""
            };

        } catch (e) {
        	
            return retornoErroAprovador(
                "Erro inesperado ao buscar aprovadores do projeto "
                + codProjeto
                + ": "
                + getMensagemErro(e)
            );
        }
    }
    
    function buscarNomeUsuarioFluigPorMatricula(matricula) {
        matricula = String(matricula || "").trim();

        if (matricula === "") {
            return "";
        }

        var constraints = [];
        constraints.push(DatasetFactory.createConstraint("colleaguePK.colleagueId",matricula,matricula,ConstraintType.MUST));

        var ds = TimesheetDataset.getDataset("colleague", constraints);

        if (!ds || !ds.values || ds.values.length === 0) {
            return "";
        }

        return ds.values[0].colleagueName || "";
    }

    function retornoErroAprovador(mensagem) {
    	
        return {
            success: false,
            aprovadores: "",
            message: String(mensagem || "Erro não identificado ao buscar aprovadores.")
        };
    }

    function getMensagemErro(e) {
    	
        if (!e) {
            return "Erro não identificado.";
        }

        if (e.message) {
            return e.message;
        }

        return String(e);
    }

    // =========================
    // Valida se usuário possui papel de responsavel
    // =========================
    function validarPermissaoDelegacao() {

        var matricula = $("#matriculaUsuario").val();

        if (!matricula) {
            console.warn("Matrícula não encontrada");
            $('.vf-row-delegar').hide();
            return false;
        }

        var constraints = [];
        constraints.push(DatasetFactory.createConstraint("workflowColleagueRolePK.colleagueId", matricula, matricula, ConstraintType.MUST));

        var dataset = TimesheetDataset.getDataset('workflowColleagueRole', constraints);

        var possuiPermissao = false;

        // Percorre retorno
        if (dataset && dataset.values && dataset.values.length > 0) {
            dataset.values.forEach(function (item) {

                var roleId = (item["workflowColleagueRolePK.roleId"] || "").trim();

                if (roleId === "ResponsaveisTimesheet") {
                    possuiPermissao = true;
                }
            });
        }

        // Exibe/Oculta área
        if (!possuiPermissao) {
            $('.vf-row-delegar').hide();

        }

        return possuiPermissao;
    }

    // =========================
    // Formata datas e dias
    // =========================
    function vfParseDate(dateStr) {

        if (!dateStr) return null;

        const parts = dateStr.split('/');

        if (parts.length !== 3) return null;

        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    function vfFormatDate(date) {

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    }
    function vfAddDays(date, days) {

        const result = new Date(date);

        result.setDate(result.getDate() + days);

        return result;
    }

    // =========================
    // Formata data
    // =========================
    function formatarDataBR(dataISO) {
    	
        var partes = dataISO.split("-");
        return partes[2] + "/" + partes[1] + "/" + partes[0];
    }

    // =========================
    // Bloqueia datas que não podem ser selecionadas
    // =========================
    function isDataBloqueada(data, jornada) {

        jornada = jornada || getJornadaPadrao();

        var limiteHorasDia = obterLimiteHorasDiaDecimal(jornada);
        var horasApontadas = horasApontadasPorDia[data] || 0;
        var horasAusencias = horasAusenciasPorDia[data] || 0;
        var horasTotal = horasApontadas + horasAusencias;

        // Fora da jornada
        if (!isDiaPermitidoJornada(data, jornada)) return true;

        // Férias
        if (datasFerias.includes(data)) return true;

        // Feriado
        if (datasFeriados.includes(data)) return true;

        // Atestado integral conforme limite diário da jornada
        if (datasAtestado.includes(data) && horasAusencias >= limiteHorasDia) return true;

        // Total do dia conforme limite diário da jornada
        if (horasTotal >= limiteHorasDia) return true;

        return false;
    }

    // =========================
    // Bloqueia datas duplicadas no apontamento do meu painel
    // =========================
    function validarDatasDuplicadas($rows) {
        const datas = {};
        const duplicadas = [];

        $rows.each(function (index) {
            const data = $(this).find('.vf-data').val();

            if (!data) return; // ignora vazio (ou valida separado)

            if (datas[data]) {
                duplicadas.push(data);

            } else {
                datas[data] = true;
            }
        });

        return [...new Set(duplicadas)]; // remove duplicadas repetidas
    }

    // =========================
    // Valida preenchimento dos campos
    // =========================
    function validarCampos($rows) {
        let erros = [];

        var horasFaltantesStr = $('#ts-horas-faltantes').text();
        var horasFaltantesMes = horaParaDecimal(horasFaltantesStr);
        var totalDigitadoMes = 0;
        var jornada = obterJornadaParaPainel();
        var limiteHorasDia = obterLimiteHorasDiaDecimal(jornada);
        var limiteMinutosDia = Math.round(limiteHorasDia * 60);

        $rows.each(function (index) {
            const linha = index + 1;
            const data = $(this).find('.vf-data').val();
            const horas = $(this).find('.vf-horas').val();
            const horasAtuais = $(this).find('.vf-hora-atual').val();

            // DATA OBRIGATÓRIA
            if (!data) {
                erros.push(`Linha ${linha}: Data não informada`);
            }

            validarDataDentroDaJornada(data, jornada, linha, erros);

            // HORA OBRIGATÓRIA
            if (!horas) {
                erros.push(`Linha ${linha} com data ${data}: Horas não informadas`);
            }

            // FORMATO HH:MM
            if (!/^\d{2}:\d{2}$/.test(horas)) {
                erros.push(`Linha ${linha} com data ${data}: Formato de hora inválido (use HH:MM)`);
            }

            // LIMITE DIÁRIO CONFORME JORNADA
            const [h, m] = horas.split(":").map(Number);
            var minutosInformados = (h * 60) + m;

            if (minutosInformados > limiteMinutosDia) {
                erros.push(
                    `Linha ${linha} com data ${data}: Não pode ultrapassar ${jornada.horasDia} horas`
                );
            }

            if (h === 0 && m === 0) {
                erros.push(`Linha ${linha} com data ${data}: Horas zeradas`);
            }

            var horasDigitadas = horaParaDecimal(horas);

            totalDigitadoMes += horasDigitadas;

            if (horasAtuais) {

                var minutosAtuais = horaParaMinutos(horasAtuais);
                var minutosDigitados = horaParaMinutos(horas);
                var totalMinutos = minutosAtuais + minutosDigitados;
                var limiteMinutos = limiteMinutosDia;

                if (totalMinutos > limiteMinutos) {

                    var minutosRestantes = limiteMinutos - minutosAtuais;
                    var horasRestantes = minutosParaHora(minutosRestantes);

                    erros.push(
                        `Linha ${linha} com data ${data}: Você pode apontar somente ${horasRestantes}`
                    );
                }
            }

            // VALIDAÇÃO MENSAL
            if (totalDigitadoMes > horasFaltantesMes) {
                let restante = decimalParaHora(horasFaltantesMes);

                if(horasFaltantesMes > 0){
                	
                	erros.push(
                        `Total mensal excedido: você pode apontar somente ${restante} no mês`
                    );
                	
                } else{
                	
                	erros.push(
                        `Total mensal excedido: você não pode mais apontar nessa competência`
                    );
                } 
            }
        });

        return erros;
    }

    // =========================
    // Converte minutos para HH:MM
    // =========================
    function minutosParaHora(minutos) {

        minutos = parseInt(minutos || 0, 10);

        var horas = Math.floor(minutos / 60);
        var mins = minutos % 60;

        return (
            String(horas).padStart(2, '0') + ':' + String(mins).padStart(2, '0')
        );
    }

    // =========================
    // Valida inserção de apontamento
    // =========================
    function validarAddLinha() {
    	
        let erros = [];

        if ($('#vf-table-horas tbody tr').length === 0) {
            erros.push('Favor inserir pelo menos uma linha de apontamento');
        }

        return erros;
    }

    // =========================
    // BLoqueia inserção de data fora da competencia atual
    // =========================
    function validarMesAtual($rows, competencia) {
    	
        let erros = [];

        const hoje = new Date();
        const diaAtual = hoje.getDate();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();
        
        const diaCompetencia = competencia.split("/")[0];
        const mesCompetencia = competencia.split("/")[1];

        $rows.each(function (index) {
            const linha = index + 1;
            const dataStr = $(this).find('.vf-data').val();

            if (!dataStr) return;

            const [dia, mes, ano] = dataStr.split('/').map(Number);
            const dataInserida = ano + "/" + mes + "/" + dia;
            const data = new Date(dataInserida);

            if (data.getFullYear() !== anoAtual || data.getMonth() + 1 !== parseInt(mesCompetencia)) {
                erros.push(`Linha ${linha}: Data fora da competência atual`);
            }

            //if (parseInt(dia) > parseInt(diaCompetencia) && data.getMonth() + 1 === mesAtual) {
             //   erros.push(`Linha ${linha}: Data fora da competência atual`);
            //}

            if (diaAtual > parseInt(diaCompetencia) && data.getMonth() + 1 === parseInt(mesCompetencia)) {
                erros.push(`Linha ${linha}: Competência atual finalizou, aguardar nova competência para novos apontamentos`);
            }
        });

        return erros;
    }

    // =========================
    // Valida total de horas apontado para o projeto/tarefa
    // =========================
    function validaTotalHoras(codigo, competencia, idProjeto, idTarefa, hrPrevista, $rows) {
    	
        let erros = [];
        competencia = competencia.split("/")[1] + "/" + competencia.split("/")[2];

        var constraints = [];
        constraints.push(DatasetFactory.createConstraint("CODIGO", codigo, codigo, ConstraintType.MUST));
        constraints.push(DatasetFactory.createConstraint("COMPETENCIA", competencia, competencia, ConstraintType.MUST));
        constraints.push(DatasetFactory.createConstraint("CODPROJETO", idProjeto, idProjeto, ConstraintType.MUST));
        constraints.push(DatasetFactory.createConstraint("IDTAREFA", idTarefa, idTarefa, ConstraintType.MUST));

        var ds = TimesheetDataset.getDataset('ds_ts_horas_por_projeto_tarefa', constraints);

        if (!ds || !ds.values || ds.values.length === 0) {
            erros.push("Não foi possível consultar horas já apontadas.");
            return erros;
        }

        var erroDataset = ds.values[0].ERRO;

        if (erroDataset && erroDataset !== "") {
            erros.push(erroDataset);
            return erros;
        }

        var totalHoras = parseFloat(ds.values[0].HORAS) || 0;

        var calculoHoras = 0;
        let linha = 0;

        $rows.each(function (index) {
            linha = index + 1;
            const hora = $(this).find('.vf-horas').val();
            const data = $(this).find('.vf-data').val();

            if (!hora) return;

            calculoHoras += TimesheetServices.horaParaDecimal(hora);

            if (calculoHoras + totalHoras > parseInt(hrPrevista)) {

                erros.push(
                    `Linha ${linha} do dia ${data}: Ultrapassou o limite de horas para a tarefa.\n` +
                    `Previstas: ${hrPrevista}h | ` +
                    `Já apontadas: ${totalHoras.toFixed(2)}h | ` +
                    `Tentando adicionar: ${calculoHoras.toFixed(2)}h`
                );
            }
        });

        return erros;
    }
    
    function obterCodRMParaApontamento() {

        var codRMWidget = String($("#codRM").val() || "").trim();

        var matriculaDelegada = String($("#delegar-apontamento-matr").val() || "").trim();

        // =====================================================
        // Cenário 3:
        // Existe delegação preenchida.
        // O codRM deve ser do usuário delegado.
        // =====================================================
        if (matriculaDelegada) {

            var emailDelegado = obterEmailPorMatriculaFluig(matriculaDelegada);

            if (!emailDelegado) {
                throw "Não foi possível localizar o e-mail do usuário delegado: " + matriculaDelegada;
            }

            var codRMDelegado = carregarCodUsuario(emailDelegado);

            if (!codRMDelegado) {
                throw "Não foi possível localizar o código RM do usuário delegado: " + emailDelegado;
            }

            return codRMDelegado;
        }

        // =====================================================
        // Cenários 1 e 2:
        // Sem delegação, usa o codRM da própria widget.
        // =====================================================
        if (!codRMWidget) {
            throw "Código RM do usuário não encontrado na widget.";
        }

        return codRMWidget;
    }
    
    function obterEmailPorMatriculaFluig(matricula) {

        if (!matricula) {
            return "";
        }

        var constraints = [
            DatasetFactory.createConstraint(
                "colleaguePK.colleagueId",
                String(matricula),
                String(matricula),
                ConstraintType.MUST
            )
        ];

        var ds = DatasetFactory.getDataset(
            "colleague",
            null,
            constraints,
            null
        );

        if (!ds || !ds.values || ds.values.length === 0) {
            return "";
        }

        return String(ds.values[0].mail || ds.values[0].email || "").trim();
    }
    

    // =========================
    // Jornada do colaborador
    // =========================
    function obterJornadaColaborador(chapa) {

        chapa = String(chapa || "").trim();

        if (chapa === "") {
            return getJornadaPadrao("CHAPA não informada para consulta da jornada.");
        }

        var cacheKey = "jornada_" + chapa;

        if (cacheDataset[cacheKey]) {
            return cacheDataset[cacheKey];
        }

        try {
            var constraints = [];
            constraints.push(
                DatasetFactory.createConstraint(
                    "CHAPA",
                    chapa,
                    chapa,
                    ConstraintType.MUST
                )
            );

            var ds = TimesheetDataset.getDataset("ds_ts_jornada_colaborador", constraints);

            if (!ds || !ds.values || ds.values.length === 0) {
                cacheDataset[cacheKey] = getJornadaPadrao(
                    "Jornada não localizada para a CHAPA " + chapa + "."
                );

                return cacheDataset[cacheKey];
            }

            var row = ds.values[0] || {};
            var status = String(row.STATUS || "").trim();

            if (status !== "OK") {
                cacheDataset[cacheKey] = getJornadaPadrao(
                    row.MESSAGE || ("Dataset de jornada retornou status " + status + ".")
                );

                return cacheDataset[cacheKey];
            }

            var diasPermitidos = parseJsonDiasPermitidos(row.DIAS_PERMITIDOS_JSON);

            if (diasPermitidos.length === 0) {
                diasPermitidos = [1, 2, 3, 4, 5];
            }

            cacheDataset[cacheKey] = {
                success: true,
                message: "",
                chapa: String(row.CHAPA || chapa).trim(),
                nome: String(row.NOME || "").trim(),
                codHorario: String(row.CODHORARIO || "").trim(),
                descricaoHorario: String(row.DESCRICAO_HORARIO || "").trim(),
                diasApontamento: String(row.DIAS_APONTAMENTO || "").trim(),
                diasSemana: String(row.DIAS_SEMANA || "").trim(),
                horasDia: String(row.HORAS_DIA || "08:00").trim(),
                horasDiaDecimal: horaParaDecimal(String(row.HORAS_DIA || "08:00").trim()),
                diasPermitidos: diasPermitidos
            };

            return cacheDataset[cacheKey];

        } catch (e) {
            console.error("Erro ao consultar jornada do colaborador", e);

            cacheDataset[cacheKey] = getJornadaPadrao(
                e && e.message ? e.message : String(e)
            );

            return cacheDataset[cacheKey];
        }
    }

    function getJornadaPadrao(message) {

        return {
            success: false,
            message: String(message || ""),
            chapa: "",
            nome: "",
            codHorario: "",
            descricaoHorario: "",
            diasApontamento: "5",
            diasSemana: "SEGUNDA A SEXTA",
            horasDia: "08:00",
            horasDiaDecimal: 8,
            diasPermitidos: [1, 2, 3, 4, 5]
        };
    }

    function parseJsonDiasPermitidos(json) {

        var texto = String(json || "").trim();
        var dias = [];

        if (texto === "") {
            return dias;
        }

        texto = texto.replace("[", "").replace("]", "");
        var partes = texto.split(",");

        for (var i = 0; i < partes.length; i++) {
            var dia = parseInt(String(partes[i] || "").trim(), 10);

            if (!isNaN(dia) && dia >= 0 && dia <= 6) {
                dias.push(dia);
            }
        }

        return dias;
    }

    function isDiaPermitidoJornada(data, jornada) {

        jornada = jornada || getJornadaPadrao();

        var diasPermitidos = jornada.diasPermitidos || [1, 2, 3, 4, 5];
        var dataObj;

        if (data instanceof Date) {
            dataObj = data;

        } else if (String(data || "").indexOf("/") >= 0) {
            var partesBR = String(data || "").split("/");
            dataObj = new Date(
                parseInt(partesBR[2], 10),
                parseInt(partesBR[1], 10) - 1,
                parseInt(partesBR[0], 10)
            );

        } else {
            dataObj = new Date(String(data || "") + "T00:00:00");
        }

        var diaSemana = dataObj.getDay();

        for (var i = 0; i < diasPermitidos.length; i++) {
            if (parseInt(diasPermitidos[i], 10) === diaSemana) {
                return true;
            }
        }

        return false;
    }

    function obterLimiteHorasDiaDecimal(jornada) {

        jornada = jornada || getJornadaPadrao();

        if (jornada.horasDiaDecimal !== undefined && jornada.horasDiaDecimal !== null) {
            return parseFloat(jornada.horasDiaDecimal) || 8;
        }

        return horaParaDecimal(jornada.horasDia || "08:00");
    }

    function obterJornadaParaPainel() {

        var chapa = String($("#codRM").val() || "").trim();

        return obterJornadaColaborador(chapa);
    }

    function obterJornadaParaApontamento() {

        try {
            return obterJornadaColaborador(obterCodRMParaApontamento());

        } catch (e) {
            console.error("Erro ao obter jornada para apontamento", e);

            return getJornadaPadrao(e && e.message ? e.message : String(e));
        }
    }

    function validarDataDentroDaJornada(data, jornada, linha, erros) {

        if (!data) {
            return;
        }

        if (!isDiaPermitidoJornada(data, jornada)) {
            erros.push(
                "Linha " + linha + " com data " + data
                + ": Data fora da jornada do colaborador. Dias permitidos: "
                + (jornada.diasSemana || "não informado")
            );
        }
    }


    function isFinalDeSemana(data) {
    	
        var dataObj;

        if (data instanceof Date) {
            dataObj = data;
            
        } else {
            dataObj = new Date(data + "T00:00:00");
        }

        var diaSemana = dataObj.getDay();

        return diaSemana === 0 || diaSemana === 6;
    } 

    return {
	    removerLinhasPorData: removerLinhasPorData,
	    renumerarTabelaHorasPainel: renumerarTabelaHorasPainel,
	    renumerarTabelaHorasApontamento: renumerarTabelaHorasApontamento,
	    renumerarTabelasHoras: renumerarTabelasHoras,
        carregarCodUsuario: carregarCodUsuario,
        carregaMesAno: carregaMesAno,
        campoTemplate: campoTemplate,
        formatProjeto: formatProjeto,
        formatTarefa: formatTarefa,
        formatColaborador: formatColaborador,
        formatSelection: formatSelection,
        consultarProjetosTarefas: consultarProjetosTarefas,
        consultarProjetos: consultarProjetos,
        executarAprovacaoLote: executarAprovacaoLote,
        executarAprovacao: executarAprovacao,
        buscarPendencias: buscarPendencias,
        iniciarAprovMassiva: iniciarAprovMassiva,
        atualizarBarraEETA: atualizarBarraEETA,
        consultarMasterStatus: consultarMasterStatus,
        consultarMasterStatusViaTotal: consultarMasterStatusViaTotal,
        consultarProgressoSnapshot: consultarProgressoSnapshot,
        consultarControle: consultarControle,
        recuperarProcessamentoAtivo: recuperarProcessamentoAtivo,
        existeProcessamentoAtivo: existeProcessamentoAtivo,
        formatarDataHistorico: formatarDataHistorico,
        getTextoSelect2: getTextoSelect2,
        validarAddLinhaApont: validarAddLinhaApont,
        validaTotalHorasApont: validaTotalHorasApont,
        horaParaDecimal: horaParaDecimal,
        validarCamposApont: validarCamposApont,
        decimalParaHora: decimalParaHora,
        validarMesAtualApont: validarMesAtualApont,
        horaParaMinutos: horaParaMinutos,
        getStatusClass: getStatusClass,
        executarCancelamento: executarCancelamento,
        executarEdicao: executarEdicao,
        exportarExcelDados: exportarExcelDados,
        getUsuarioBase: getUsuarioBase,
        clearCache: clearCache,
        obterAprovador: obterAprovador,
        validarPermissaoDelegacao: validarPermissaoDelegacao,
        vfParseDate: vfParseDate,
        vfFormatDate: vfFormatDate,
        vfAddDays: vfAddDays,
        formatarDataBR: formatarDataBR,
        isDataBloqueada: isDataBloqueada,
        validarDatasDuplicadas: validarDatasDuplicadas,
        validarCampos: validarCampos,
        minutosParaHora: minutosParaHora,
        validarAddLinha: validarAddLinha,
        validarMesAtual: validarMesAtual,
        validaTotalHoras: validaTotalHoras,
        obterCodRMParaApontamento: obterCodRMParaApontamento,
        obterEmailPorMatriculaFluig: obterEmailPorMatriculaFluig,
        obterJornadaColaborador: obterJornadaColaborador,
        getJornadaPadrao: getJornadaPadrao,
        isDiaPermitidoJornada: isDiaPermitidoJornada,
        obterLimiteHorasDiaDecimal: obterLimiteHorasDiaDecimal,
        obterJornadaParaPainel: obterJornadaParaPainel,
        obterJornadaParaApontamento: obterJornadaParaApontamento,
        isFinalDeSemana: isFinalDeSemana
    };
})();