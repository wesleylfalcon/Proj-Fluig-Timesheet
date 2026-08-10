var TimesheetRelatorioInfoUsuarios = (function () {

    var dados = [];
    var pagina = 1;
    var pageSize = 10;
    var cacheDetalhes = {};
function onViewOpen() {
    carregarMesAnoInfoUsuarios();
    initSelectColaboradorInfoUsuarios();
}

    
    function initSelectColaboradorInfoUsuarios() {
        var $select = $("#filtro-rel-info-colab");

        if (!$select.length) {
            return;
        }

        if ($select.hasClass("select2-hidden-accessible")) {
            $select.select2("destroy");
        }

        $select.select2({
            placeholder: "Selecione ou busque o colaborador...",
            width: "100%",
            allowClear: true,

            language: {
                searching: function () {
                    return "Carregando colaboradores...";
                },
                noResults: function () {
                    return "Nenhum colaborador encontrado";
                }
            },

            ajax: {
                delay: 300,

                transport: function (params, success, failure) {
                    try {
                        var term = String((params.data && params.data.term) || "").toLowerCase();
                        var dataset = TimesheetDataset.getDataset("ds_ts_colaboradores", []);
                        var results = [];

                        if (dataset && dataset.values) {
                            results = dataset.values
                                .filter(function (item) {
                                    var nome = String(item.nome || "").toLowerCase();
                                    var matricula = String(item.matricula || "").toLowerCase();

                                    return !term ||
                                        nome.indexOf(term) >= 0 ||
                                        matricula.indexOf(term) >= 0;
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
                        console.error("Erro ao buscar colaboradores do relatório Info Usuários:", e);
                        failure();
                    }
                }
            },

            templateResult: TimesheetServices.formatColaborador,
            templateSelection: TimesheetServices.formatSelection
        });

        $select.off("select2:select.infoUsuarios");
        $select.on("select2:select.infoUsuarios", function (e) {
            var data = e.params.data;
            $("#filtro-rel-info-cod-colab").val(data.id);
        });

        $select.off("select2:clear.infoUsuarios");
        $select.on("select2:clear.infoUsuarios", function () {
            $("#filtro-rel-info-cod-colab").val("");
        });
    }
function carregarMesAnoInfoUsuarios() {
    try {
        var competencia = "";

        if (TimesheetServices && typeof TimesheetServices.carregaMesAno === "function") {
            competencia = TimesheetServices.carregaMesAno();
        }

        if (!competencia || !/^\d{1,2}\/\d{4}$/.test(competencia)) {
            competencia = obterCompetenciaAtualFallback();
        }

        var partes = competencia.split("/");
        var mes = pad2(partes[0]);
        var ano = partes[1];

        $("#filtro-rel-info-mes").val(mes);
        $("#filtro-rel-info-ano").val(ano);

    } catch (e) {
        console.error("Erro ao carregar competência atual no relatório Info Usuários", e);

        var competenciaFallback = obterCompetenciaAtualFallback();
        var partesFallback = competenciaFallback.split("/");

        $("#filtro-rel-info-mes").val(partesFallback[0]);
        $("#filtro-rel-info-ano").val(partesFallback[1]);
    }
}

function obterCompetenciaAtualFallback() {
    var hoje = new Date();
    return pad2(hoje.getMonth() + 1) + "/" + hoje.getFullYear();
}


    function consultar() {
        var filtros = obterFiltros();

        if (!validarFiltros(filtros)) {
            return;
        }

        var loading = FLUIGC.loading("#panelRelatorioInfoUsuarios", {
            textMessage: "Consultando informações dos usuários..."
        });

        loading.show();

        setTimeout(function () {
            try {
                var ds = TimesheetDataset.getDataset(
                    "ds_ts_relatorio_info_usuarios",
                    montarConstraints(filtros)
                );

                if (!ds || !ds.values || ds.values.length === 0) {
                    dados = [];
                    cacheDetalhes = {};
                    render();

                    FLUIGC.toast({
                        title: "Atenção: ",
                        message: "Nenhum registro encontrado para os filtros informados.",
                        type: "warning",
                        timeout: 5000
                    });

                    return;
                }

                if (ds.values[0].STATUS === "ERRO") {
                    dados = [];
                    cacheDetalhes = {};
                    render();

                    FLUIGC.toast({
                        title: "Erro: ",
                        message: ds.values[0].MESSAGE || "Erro ao consultar relatório.",
                        type: "danger",
                        timeout: 7000
                    });

                    return;
                }

                dados = ds.values.filter(function (row) {
                    return row.STATUS !== "ERRO";
                });

                pagina = 1;
                cacheDetalhes = {};
                render();

            } catch (e) {
                FLUIGC.toast({
                    title: "Erro: ",
                    message: e.message || String(e),
                    type: "danger",
                    timeout: 7000
                });

            } finally {
                loading.hide();
            }
        }, 100);
    }

    function obterFiltros() {

        var mes = $("#filtro-rel-info-mes").val();
        var ano = $("#filtro-rel-info-ano").val();

        var colaborador =
            $("#filtro-rel-info-cod-colab").val() ||
            $("#filtro-rel-info-colab").val() ||
            "";

        return {
            colaborador: colaborador,
            mes: mes,
            ano: ano,
            competencia: mes && ano ? mes + "/" + ano : ""
        };
    }

    function validarFiltros(filtros) {
        if (!filtros.mes) {
            FLUIGC.toast({
                title: "Atenção: ",
                message: "Informe o mês.",
                type: "warning",
                timeout: 5000
            });
            return false;
        }

        if (!filtros.ano || !/^\d{4}$/.test(String(filtros.ano))) {
            FLUIGC.toast({
                title: "Atenção: ",
                message: "Informe o ano no formato AAAA.",
                type: "warning",
                timeout: 5000
            });
            return false;
        }

        if (!/^\d{2}\/\d{4}$/.test(filtros.competencia)) {
            FLUIGC.toast({
                title: "Atenção: ",
                message: "Competência inválida.",
                type: "warning",
                timeout: 5000
            });
            return false;
        }

        return true;
    }

    function montarConstraints(filtros) {
        var constraints = [];

        constraints.push(
            DatasetFactory.createConstraint(
                "COMPETENCIA",
                filtros.competencia,
                filtros.competencia,
                ConstraintType.MUST
            )
        );

        if (filtros.colaborador) {
            constraints.push(
                DatasetFactory.createConstraint(
                    "COLABORADOR",
                    filtros.colaborador,
                    filtros.colaborador,
                    ConstraintType.MUST
                )
            );
        }

        return constraints;
    }

    function render() {
        $("#panelResultadoInfoUsuarios").show();

        renderTabela();
        renderPaginacao();

        var possuiDados = dados.length > 0;
        var possuiPendencias = obterUsuariosComPendencia().length > 0;

        $("#btnExportarInfoUsuarios").prop("disabled", !possuiDados);
        $("#btnAlertarPendenciasInfoUsuarios").prop("disabled", !possuiPendencias);
    }

    function renderTabela() {
        var $tbody = $("#tblInfoUsuarios tbody");
        $tbody.empty();

        if (!dados || dados.length === 0) {
            $tbody.append(
                "<tr>" +
                    "<td colspan='7' class='text-center' style='padding:20px;'>" +
                    	"<i class='flaticon flaticon-info icon-md'></i><br>" +
                        "Nenhum registro encontrado." +
                    "</td>" +
                "</tr>"
            );
            return;
        }

        var inicio = (pagina - 1) * pageSize;
        var fim = Math.min(inicio + pageSize, dados.length);

        for (var i = inicio; i < fim; i++) {
            var row = dados[i];
            var numeroLinha = i + 1;

            var matricula = safe(row.MATRICULA);
            var chapa = safe(row.CHAPA);
            var colaborador = safe(row.COLABORADOR);
            var horasDisponiveis = formatarDecimalBR(row.HORAS_DISPONIVEIS);
            var horasApontadas = formatarDecimalBR(row.HORAS_APONTADAS);
            var horasPendentes = formatarDecimalBR(row.HORAS_PENDENTES);
            var ausencias = formatarDecimalBR(row.AUSENCIAS);
            var qtdConflitos = parseInt(row.QTD_CONFLITOS || "0", 10);
            var temConflito = safe(row.TEM_CONFLITO) === "SIM" || qtdConflitos > 0;

            var labelAusencias = montarLabelAusencias(ausencias, qtdConflitos, temConflito);
            var disabledExpandir = temConflito ? "" : "disabled";

            var html =
                "<tr class='ts-info-usuario-row' " +
                    "data-index='" + i + "' " +
                    "data-matricula='" + escapeHtml(matricula) + "' " +
                    "data-chapa='" + escapeHtml(chapa) + "'>" +

                    "<td>" + numeroLinha + "</td>" +
                    "<td>" + escapeHtml(colaborador) + "</td>" +
                    "<td>" + horasDisponiveis + "</td>" +
                    "<td>" + horasApontadas + "</td>" +
                    "<td>" + montarLabelPendencia(horasPendentes) + "</td>" +
                    "<td>" + labelAusencias + "</td>" +
                    "<td>" +
                        "<button type='button' class='btn btn-default btn-xs btn-expandir-info-usuario' " + disabledExpandir + ">" +
                            "<i class='flaticon flaticon-chevron-down icon-xs'></i> Detalhes" +
                        "</button>" +
                    "</td>" +
                "</tr>";

            $tbody.append(html);
        }
    }

    function montarLabelPendencia(valor) {
        var decimal = converterDecimalBR(valor);

        if (decimal > 0) {
            return "<span class='label label-warning'>" + formatarDecimalBR(valor) + "</span>";
        }

        return "<span class='label label-success'>0,00</span>";
    }

    function montarLabelAusencias(ausencias, qtdConflitos, temConflito) {
        if (temConflito) {
            return "<span class='label label-danger'>" + qtdConflitos + " conflito(s)</span>";
        }

        if (converterDecimalBR(ausencias) > 0) {
            return "<span class='label label-info'>" + ausencias + "</span>";
        }

        return "<span class='label label-default'>0,00</span>";
    }

    function renderPaginacao() {
        var totalPaginas = Math.ceil(dados.length / pageSize);
        var paginaAtual = pagina;
        var $container = $("#vf-paginacao-info-usuarios");

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
            '<select id="vf-page-size-info-usuarios" class="form-control input-sm" style="width:60px; display:inline-block;">' +
            '   <option value="10">10</option>' +
            '   <option value="25">25</option>' +
            '   <option value="50">50</option>' +
            '   <option value="100">100</option>' +
            '</select>'
        );

        $("#vf-page-size-info-usuarios").val(pageSize);

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

            pagina = page;
            render();
        });

        $("#vf-page-size-info-usuarios").off("change").on("change", function () {
            pageSize = parseInt($(this).val(), 10) || 10;
            pagina = 1;
            render();
        });
    }

    function expandirLinha($btn) {
        $btn = $btn && $btn.jquery ? $btn : $(this);

        var $tr = $btn.closest("tr");
        var index = parseInt($tr.attr("data-index"), 10);
        var row = dados[index];

        if (!row) {
            return;
        }

        var detalheId = "det-info-" + index;
        var filtros = obterFiltros();
        var cacheKey = safe(row.MATRICULA) + "|" + safe(row.CHAPA) + "|" + filtros.competencia;
        var $detalheExistente = $("#" + detalheId);

        if ($detalheExistente.length > 0) {
            $detalheExistente.remove();
            delete cacheDetalhes[cacheKey];

            $btn.html("<i class='flaticon flaticon-chevron-down icon-xs'></i> Detalhes");
            return;
        }

        delete cacheDetalhes[cacheKey];

        $btn.html("<i class='flaticon flaticon-chevron-up icon-xs'></i> Ocultar");

        carregarDetalhesLinha($tr, detalheId, row);
    }

    function carregarDetalhesLinha($tr, detalheId, row) {
        var loadingHtml =
            "<tr id='" + detalheId + "' class='ts-info-usuario-detalhe'>" +
                "<td colspan='7'>" +
                    "<div class='text-center text-muted'>Carregando detalhes...</div>" +
                "</td>" +
            "</tr>";

        $("#" + detalheId).remove();
        $tr.after(loadingHtml);

        setTimeout(function () {
            try {
                var filtros = obterFiltros();

                var constraints = [];
                constraints.push(DatasetFactory.createConstraint("MATRICULA", safe(row.MATRICULA), safe(row.MATRICULA), ConstraintType.MUST));
                constraints.push(DatasetFactory.createConstraint("CHAPA", safe(row.CHAPA), safe(row.CHAPA), ConstraintType.MUST));
                constraints.push(DatasetFactory.createConstraint("COMPETENCIA", filtros.competencia, filtros.competencia, ConstraintType.MUST));

                var ds = TimesheetDataset.getDataset(
                    "ds_ts_relatorio_info_usuarios_detalhe",
                    constraints
                );

                var detalhes = [];

                if (ds && ds.values && ds.values.length > 0) {
                    if (ds.values[0].STATUS === "ERRO") {
                        throw ds.values[0].MESSAGE || "Erro ao consultar detalhe do relatório Info Usuários.";
                    }

                    detalhes = ds.values;
                }

                var cacheKey = safe(row.MATRICULA) + "|" + safe(row.CHAPA) + "|" + filtros.competencia;
                cacheDetalhes[cacheKey] = detalhes;

                $("#" + detalheId).remove();
                inserirLinhaDetalhe($tr, detalheId, detalhes);

            } catch (e) {
                $("#" + detalheId).find("td").html(
                    "<div class='alert alert-danger'>Erro ao carregar detalhes: " +
                    escapeHtml(e.message || String(e)) +
                    "</div>"
                );
            }
        }, 100);
    }

    function atualizarDetalhesAbertos() {
        var $detalhes = $(".ts-info-usuario-detalhe");

        if ($detalhes.length === 0) {
            cacheDetalhes = {};
            return;
        }

        cacheDetalhes = {};

        $detalhes.each(function () {
            var $detalhe = $(this);
            var detalheId = $detalhe.attr("id");
            var $trPrincipal = $detalhe.prev(".ts-info-usuario-row");
            var index = parseInt($trPrincipal.attr("data-index"), 10);
            var row = dados[index];

            if (!row) {
                $detalhe.remove();
                return;
            }

            carregarDetalhesLinha($trPrincipal, detalheId, row);
        });
    }

    function inserirLinhaDetalhe($tr, detalheId, detalhes) {
        var html =
            "<tr id='" + detalheId + "' class='ts-info-usuario-detalhe'>" +
                "<td colspan='7'>" +
                    montarTabelaDetalhe(detalhes) +
                "</td>" +
            "</tr>";

        $tr.after(html);
    }

function montarTabelaDetalhe(detalhes) {
    if (!detalhes || detalhes.length === 0) {
        return "<div class='alert alert-info'>Nenhum conflito encontrado para este colaborador.</div>";
    }

    var html =
        "<div class='ts-info-detalhe-wrapper'>" +
            "<strong>Conflitos Ausência x Apontamento</strong>" +
            "<br><br>" +
            "<table class='table table-condensed table-bordered ts-info-detalhe-table'>" +
                "<thead>" +
                    "<tr>" +
                        "<th>Data ausência</th>" +
                        "<th>Horas ausência</th>" +
                        "<th>Data apontada</th>" +
                        "<th>Horas apontadas</th>" +
                        "<th>Detalhe</th>" +
                        "<th style='width:260px;'>Ações</th>" +
                    "</tr>" +
                "</thead>" +
                "<tbody>";

    for (var i = 0; i < detalhes.length; i++) {
        var row = detalhes[i];
        var atividadeAtual = safe(row.ATIVIDADE_ATUAL || row.atividadeAtual);

        var podeAjustar = safe(row.ACAO_AJUSTAR || "SIM") !== "NAO";
        var podeRevisar = safe(row.ACAO_REVISAR || "SIM") !== "NAO" && atividadeAtual !== "14";
        var podeCancelar = safe(row.ACAO_CANCELAR || "SIM") !== "NAO";

        var botoes = "";

        if (podeAjustar) {
            botoes +=
                "<button type='button' class='btn btn-info btn-xs btn-ajustar-conflito-info' " +
                    "data-solicitacao='" + escapeHtml(row.NR_SOLICITACAO || "") + "'>" +
                    "<i class='flaticon flaticon-edit icon-xs'></i>" +
                "</button> ";
        }

        if (podeRevisar) {
            botoes +=
                "<button type='button' class='btn btn-warning btn-xs btn-revisar-conflito-info' " +
                    "data-solicitacao='" + escapeHtml(row.NR_SOLICITACAO || "") + "'>" +
                    "<i class='flaticon flaticon-undo icon-xs'></i>" +
                "</button> ";
        }

        if (podeCancelar) {
            botoes +=
                "<button type='button' class='btn btn-danger btn-xs btn-cancelar-conflito-info' " +
                    "data-solicitacao='" + escapeHtml(row.NR_SOLICITACAO || "") + "'>" +
                    "<i class='flaticon flaticon-trash icon-xs'></i>" +
                "</button>";
        }

        if (botoes === "") {
            botoes = "<span class='text-muted'>Sem ações disponíveis</span>";
        }

        html +=
            "<tr>" +
                "<td>" + escapeHtml(row.DATA_AUSENCIA || "") + "</td>" +
                "<td><span class='ts-info-horas-ausencia'>" + formatarDecimalBR(row.HORAS_AUSENCIA) + "</span></td>" +
                "<td>" + escapeHtml(row.DATA_APONTADA || "") + "</td>" +
                "<td><span class='ts-info-horas-apontadas'>" + formatarDecimalBR(row.HORAS_APONTADAS) + "</span></td>" +
                "<td>" + escapeHtml(row.DETALHE || "") + "</td>" +
                "<td class='ts-info-detalhe-acoes'>" + botoes + "</td>" +
            "</tr>";
    }

    html +=
                "</tbody>" +
            "</table>" +
        "</div>";

    return html;
}



function alertarPendencias() {
        var pendentes = obterUsuariosComPendencia();

        if (pendentes.length === 0) {
            FLUIGC.toast({
                title: "Atenção: ",
                message: "Nenhum colaborador com horas pendentes.",
                type: "warning",
                timeout: 5000
            });
            return;
        }

        FLUIGC.message.confirm({
            message: "Deseja alertar " + pendentes.length + " colaborador(es) com horas pendentes?",
            title: "Alertar pendências",
            labelYes: "Sim, alertar",
            labelNo: "Cancelar"
        }, function (result) {
            if (!result) {
                return;
            }

            enviarAlertasPendencia(pendentes);
        });
    }

    function enviarAlertasPendencia(pendentes) {
        var filtros = obterFiltros();

        var payload = {
            competencia: filtros.competencia,
            usuarios: pendentes.map(function (row) {
                return {
                    matricula: safe(row.MATRICULA),
                    colaborador: safe(row.COLABORADOR),
                    email: safe(row.EMAIL),
                    chapa: safe(row.CHAPA),
                    horasPendentes: formatarDecimalBR(row.HORAS_PENDENTES)
                };
            })
        };

        var loading = FLUIGC.loading("#panelRelatorioInfoUsuarios", {
            textMessage: "Enviando alertas de pendência..."
        });

        loading.show();

        setTimeout(function () {
            try {
                var constraints = [];
                constraints.push(
                    DatasetFactory.createConstraint(
                        "COMPETENCIA",
                        filtros.competencia,
                        filtros.competencia,
                        ConstraintType.MUST
                    )
                );
                constraints.push(
                    DatasetFactory.createConstraint(
                        "USUARIOS_JSON",
                        JSON.stringify(payload.usuarios),
                        JSON.stringify(payload.usuarios),
                        ConstraintType.MUST
                    )
                );

                var ds = TimesheetDataset.getDataset(
                    "ds_ts_alertar_pendencias_info_usuarios",
                    constraints
                );

                if (!ds || !ds.values || ds.values.length === 0) {
                    throw "Dataset de alerta não retornou dados.";
                }

                if (ds.values[0].STATUS === "ERRO") {
                    throw ds.values[0].MESSAGE || "Erro ao enviar alertas.";
                }

                FLUIGC.toast({
                    title: "Sucesso: ",
                    message: ds.values[0].MESSAGE || "Alertas enviados com sucesso.",
                    type: "success",
                    timeout: 5000
                });

            } catch (e) {
                FLUIGC.toast({
                    title: "Erro: ",
                    message: e.message || String(e),
                    type: "danger",
                    timeout: 7000
                });

            } finally {
                loading.hide();
            }
        }, 100);
    }

    function obterUsuariosComPendencia() {
        return dados.filter(function (row) {
            return converterDecimalBR(row.HORAS_PENDENTES) > 0;
        });
    }

    function exportar() {
        if (!dados || dados.length === 0) {
            FLUIGC.toast({
                title: "Atenção: ",
                message: "Não há dados para exportar.",
                type: "warning",
                timeout: 5000
            });
            return;
        }

        var linhas = [];

        linhas.push([
            "#",
            "Colaborador",
            "Horas disponíveis",
            "Horas apontadas",
            "Horas pendentes",
            "Ausências"
        ]);

        for (var i = 0; i < dados.length; i++) {
            var row = dados[i];

            linhas.push([
                i + 1,
                safe(row.COLABORADOR),
                formatarDecimalBR(row.HORAS_DISPONIVEIS),
                formatarDecimalBR(row.HORAS_APONTADAS),
                formatarDecimalBR(row.HORAS_PENDENTES),
                formatarDecimalBR(row.AUSENCIAS)
            ]);
        }

        var csv = linhas.map(function (linha) {
            return linha.map(function (coluna) {
                return '"' + String(coluna || "").replace(/"/g, '""') + '"';
            }).join(";");
        }).join("\n");

        var blob = new Blob(["\ufeff" + csv], {
            type: "text/csv;charset=utf-8;"
        });

        var link = document.createElement("a");
        var filtros = obterFiltros();

        link.href = URL.createObjectURL(blob);
        link.download = "relatorio_info_usuarios_" + filtros.competencia.replace("/", "_") + ".csv";
        link.click();
    }
    function tratarAjusteSucesso(payload, row) {
        atualizarDetalhesAbertos();
    }

    function limparDetalhesAbertos() {
        $(".ts-info-usuario-detalhe").remove();

        $(".btn-expandir-info-usuario").each(function () {
            $(this).html("<i class='flaticon flaticon-chevron-down icon-xs'></i> Detalhes");
        });
    }

    function ajustarConflito($btn) {
        $btn = $btn && $btn.jquery ? $btn : $(this);
        var nrSolicitacao = $btn.attr("data-solicitacao");

        if (!nrSolicitacao) {
            FLUIGC.toast({
                title: "Atenção: ",
                message: "Solicitação não localizada para ajuste.",
                type: "warning",
                timeout: 5000
            });
            return;
        }

        try {
            var dados = buscarDadosSolicitacaoParaAjuste(nrSolicitacao);

            if (!dados) {
                FLUIGC.toast({
                    title: "Atenção: ",
                    message: "Não foi possível carregar os dados da solicitação " + nrSolicitacao + ".",
                    type: "warning",
                    timeout: 5000
                });
                return;
            }

            if (!TimesheetApontamento || typeof TimesheetApontamento.abrirModalEdicao !== "function") {
                throw "Função TimesheetApontamento.abrirModalEdicao não encontrada.";
            }

            TimesheetApontamento.abrirModalEdicao(dados);

            marcarModalEdicaoInfoUsuarios(nrSolicitacao);

        } catch (e) {
            FLUIGC.toast({
                title: "Erro: ",
                message: e.message || String(e),
                type: "danger",
                timeout: 7000
            });
        }
    }

    function marcarModalEdicaoInfoUsuarios(nrSolicitacao) {
        var aplicarMarcacao = function () {
            $("#fluig-modal-edicao")
                .data("origem", "INFO_USUARIOS")
                .data("contexto", "RELATORIO_INFO_USUARIOS")
                .data("nrSolicitacaoInfoUsuarios", nrSolicitacao);
        };

        aplicarMarcacao();

        setTimeout(function () {
            aplicarMarcacao();
        }, 200);
    }

    function buscarDadosSolicitacaoParaAjuste(nrSolicitacao) {
        var constraints = [];

        constraints.push(
            DatasetFactory.createConstraint(
                "SOLICITACAO",
                nrSolicitacao,
                nrSolicitacao,
                ConstraintType.MUST
            )
        );

        var ds = TimesheetDataset.getDataset("ds_ts_consultar_solicitacao", constraints);

        if (!ds || !ds.values || ds.values.length === 0) {
            return null;
        }

        var row = ds.values[0];

        if (safe(row.erro) !== "") {
            throw row.erro;
        }

        return {
            nrSolicitacao: safe(row.nrSolicitacao || nrSolicitacao),
            data: safe(row.dtApontamento),
            nmProjeto: safe(row.nmProjeto),
            idProjeto: safe(row.idProjeto),
            codProjeto: safe(row.codProjeto || row.idProjeto),
            nmTarefa: safe(row.nmTarefa),
            codTarefa: safe(row.codTarefa),
            idISM: safe(row.idISM),
            idTRF: safe(row.idTRF),
            observacao: safe(row.observacao),
            status: safe(row.statusAprovGestor),
            horas: safe(row.hrApontamento),
            aprovador: safe(row.nmAprovGestor),
            dataAprov: safe(row.dtAprovGestor),
            hrAprov: safe(row.hrAprovGestor),
            statusAprov: safe(row.statusAprovGestor),
            justificativa: safe(row.justificativaGestor)
        };
    }

    function revisarConflito($btn) {
        $btn = $btn && $btn.jquery ? $btn : $(this);
        var nrSolicitacao = $btn.attr("data-solicitacao");

        if (!nrSolicitacao) {
            FLUIGC.toast({
                title: "Atenção: ",
                message: "Solicitação não localizada para revisão.",
                type: "warning",
                timeout: 5000
            });
            return;
        }

        FLUIGC.modal({
            title: "Revisar apontamento",
            content:
                "<div>" +
                    "<p>Esta ação devolverá o apontamento para revisão do colaborador.</p>" +
                    "<div class='form-group'>" +
                        "<label>Justificativa *</label>" +
                        "<textarea id='txt-justificativa-revisao-info' class='form-control' rows='3' " +
                            "placeholder='Informe o motivo da revisão...'>Apontamento realizado em data com ausência. Favor revisar.</textarea>" +
                    "</div>" +
                "</div>",
            id: "fluig-modal-revisao-info",
            size: "small",
            actions: [
                {
                    label: "Cancelar",
                    autoClose: true
                },
                {
                    label: "Revisar",
                    bind: "data-confirmar-revisao-info",
                    classType: "btn-warning"
                }
            ]
        });

        $("#fluig-modal-revisao-info").data("nrSolicitacao", nrSolicitacao);
    }

    function confirmarRevisaoConflito() {
        var $modal = $("#fluig-modal-revisao-info");
        var nrSolicitacao = $modal.data("nrSolicitacao");
        var justificativa = $("#txt-justificativa-revisao-info").val();

        if (!justificativa || String(justificativa).trim() === "") {
            FLUIGC.toast({
                title: "Atenção: ",
                message: "Informe a justificativa da revisão.",
                type: "warning",
                timeout: 5000
            });
            return;
        }

        executarRevisaoConflito(nrSolicitacao, justificativa);
    }

    function executarRevisaoConflito(nrSolicitacao, justificativa) {
        var loading = FLUIGC.loading("#panelRelatorioInfoUsuarios", {
            textMessage: "Enviando apontamento para revisão..."
        });

        loading.show();

        setTimeout(function () {
            try {
                var payload = {
                    processInstanceId: nrSolicitacao,
                    usuarioExecucao: obterUsuarioExecucaoInfoUsuarios(),
                    acao: "REVISAR",
                    choosedState: 7,
                    completeTask: true,
                    campos: {
                        nmAprovGestor: $("#ts-usuario").text() || obterUsuarioExecucaoInfoUsuarios(),
                        dtAprovGestor: obterDataAtualBR(),
                        hrAprovGestor: obterHoraAtual(),
                        statusAprovGestor: "Revisado",
                        justificativaGestor: justificativa || ""
                    }
                };

                var constraints = [];

                constraints.push(
                    DatasetFactory.createConstraint(
                        "DATA",
                        JSON.stringify(payload),
                        JSON.stringify(payload),
                        ConstraintType.MUST
                    )
                );

                var ds = TimesheetDataset.getDataset("ds_ts_aprovar_solicitacao", constraints);

                if (!ds || !ds.values || ds.values.length === 0) {
                    throw "Dataset de revisão não retornou dados.";
                }

                if (ds.values[0].STATUS === "ERRO") {
                    throw ds.values[0].MESSAGE || "Erro ao revisar solicitação.";
                }

                FLUIGC.toast({
                    title: "Sucesso: ",
                    message: "Solicitação " + nrSolicitacao + " enviada para revisão.",
                    type: "success",
                    timeout: 5000
                });

                $("#fluig-modal-revisao-info").modal("hide");
                atualizarDetalhesAbertos();

            } catch (e) {
                FLUIGC.toast({
                    title: "Erro: ",
                    message: e.message || String(e),
                    type: "danger",
                    timeout: 7000
                });

            } finally {
                loading.hide();
            }
        }, 300);
    }

    function cancelarConflito($btn) {
        $btn = $btn && $btn.jquery ? $btn : $(this);
        var nrSolicitacao = $btn.attr("data-solicitacao");

        if (!nrSolicitacao) {
            FLUIGC.toast({
                title: "Atenção: ",
                message: "Solicitação não localizada para cancelamento.",
                type: "warning",
                timeout: 5000
            });
            return;
        }

        FLUIGC.modal({
            title: "Cancelar apontamento",
            content:
                "<div>" +
                    "<p>Tem certeza que deseja cancelar este apontamento?</p>" +
                    "<div class='form-group'>" +
                        "<label>Motivo do cancelamento *</label>" +
                        "<textarea id='txt-motivo-cancelamento-info' class='form-control' rows='3' " +
                            "placeholder='Informe o motivo do cancelamento...'>Cancelado pelo relatório Info Usuários devido a conflito entre ausência e apontamento.</textarea>" +
                    "</div>" +
                "</div>",
            id: "fluig-modal-cancelamento-info",
            size: "small",
            actions: [
                {
                    label: "Não",
                    autoClose: true
                },
                {
                    label: "Sim",
                    bind: "data-confirmar-cancelamento-info",
                    classType: "btn-danger"
                }
            ]
        });

        $("#fluig-modal-cancelamento-info").data("nrSolicitacao", nrSolicitacao);
    }

    function confirmarCancelamentoConflito() {
        var $modal = $("#fluig-modal-cancelamento-info");
        var nrSolicitacao = $modal.data("nrSolicitacao");
        var motivo = $("#txt-motivo-cancelamento-info").val();

        if (!motivo || String(motivo).trim() === "") {
            FLUIGC.toast({
                title: "Atenção: ",
                message: "Informe o motivo do cancelamento.",
                type: "warning",
                timeout: 5000
            });
            return;
        }

        executarCancelamentoConflito(nrSolicitacao, motivo);
    }

    function executarCancelamentoConflito(nrSolicitacao, motivo) {
        var loading = FLUIGC.loading("#panelRelatorioInfoUsuarios", {
            textMessage: "Cancelando apontamento..."
        });

        loading.show();

        setTimeout(function () {
            try {
                var usuarioExecucao = obterUsuarioExecucaoInfoUsuarios();

                if (!usuarioExecucao) {
                    throw "Não foi possível identificar o usuário de execução.";
                }

                var constraints = [];

                constraints.push(
                    DatasetFactory.createConstraint(
                        "SOLICITACAO",
                        nrSolicitacao,
                        nrSolicitacao,
                        ConstraintType.MUST
                    )
                );

                constraints.push(
                    DatasetFactory.createConstraint(
                        "USUARIO",
                        usuarioExecucao,
                        usuarioExecucao,
                        ConstraintType.MUST
                    )
                );

                constraints.push(
                    DatasetFactory.createConstraint(
                        "MOTIVO",
                        motivo,
                        motivo,
                        ConstraintType.MUST
                    )
                );

                var ds = TimesheetDataset.getDataset("ds_ts_cancela_solicitacao", constraints);

                if (!ds || !ds.values || ds.values.length === 0) {
                    throw "Dataset de cancelamento não retornou dados.";
                }

                if (ds.values[0].STATUS === "ERRO") {
                    throw ds.values[0].MESSAGE || "Erro ao cancelar apontamento.";
                }

                FLUIGC.toast({
                    title: "Sucesso: ",
                    message: "Solicitação " + nrSolicitacao + " cancelada com sucesso.",
                    type: "success",
                    timeout: 5000
                });

                $("#fluig-modal-cancelamento-info").modal("hide");
                limparDetalhesAbertos();
                cacheDetalhes = {};
                consultar();

            } catch (e) {
                FLUIGC.toast({
                    title: "Erro: ",
                    message: e.message || String(e),
                    type: "danger",
                    timeout: 7000
                });

            } finally {
                loading.hide();
            }
        }, 300);
    }

    function obterUsuarioExecucaoInfoUsuarios() {
        var usuario = "";

        if ($("#matriculaUsuario").length) {
            usuario = $("#matriculaUsuario").val();
        }

        if (!usuario && typeof WCMAPI !== "undefined") {
            usuario = WCMAPI.userCode;
        }

        return usuario || "";
    }

    function obterDataAtualBR() {
        var agora = new Date();
        return pad2(agora.getDate()) + "/" + pad2(agora.getMonth() + 1) + "/" + agora.getFullYear();
    }

    function obterHoraAtual() {
        var agora = new Date();
        return pad2(agora.getHours()) + ":" + pad2(agora.getMinutes());
    }

    function formatarDecimalBR(valor) {
        if (valor === null || valor === undefined || valor === "") {
            return "0,00";
        }

        var numero = converterDecimalBR(valor);

        return numero.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function converterDecimalBR(valor) {
        if (valor === null || valor === undefined || valor === "") {
            return 0;
        }

        if (typeof valor === "number") {
            return valor;
        }

        var str = String(valor)
            .replace(/\./g, "")
            .replace(",", ".");

        var numero = parseFloat(str);

        if (isNaN(numero)) {
            return 0;
        }

        return numero;
    }

    function safe(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value);
    }

    function escapeHtml(value) {
        return safe(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function pad2(value) {
        value = parseInt(value, 10);

        if (value < 10) {
            return "0" + value;
        }

        return String(value);
    }

    return {
        onViewOpen: onViewOpen,
        consultar: consultar,
        alertarPendencias: alertarPendencias,
        exportar: exportar,
        expandirLinha: expandirLinha,
        ajustarConflito: ajustarConflito,
        revisarConflito: revisarConflito,
        confirmarRevisaoConflito: confirmarRevisaoConflito,
        cancelarConflito: cancelarConflito,
        confirmarCancelamentoConflito: confirmarCancelamentoConflito,
        tratarAjusteSucesso: tratarAjusteSucesso
    };

})();