var TimesheetRelatorios = (function () {

    var dados = [];
    var pagina = 1;
    var pageSize = 10;
    var tipoAtual = "analitico";
    var limiteSelect = 20;
    var inicializado = false;

    function init() {
        if (inicializado) {
            return;
        }

        inicializado = true;

        inicializarCalendarios();
        bindEventos();
    }
    
    function inicializarCalendarios() {
        try {
            if ($("#relDataInicio").data("calendar-loaded") !== true) {
                FLUIGC.calendar("#relDataInicio", {
                    language: "pt-br",
                    pickDate: true,
                    pickTime: false,
                    useCurrent: false,
                    sideBySide: false
                });

                $("#relDataInicio").data("calendar-loaded", true);
            }

            if ($("#relDataFim").data("calendar-loaded") !== true) {
                FLUIGC.calendar("#relDataFim", {
                    language: "pt-br",
                    pickDate: true,
                    pickTime: false,
                    useCurrent: false,
                    sideBySide: false
                });

                $("#relDataFim").data("calendar-loaded", true);
            }

        } catch (e) {
            console.error("Erro ao inicializar calendários dos relatórios", e);
        }
    }

    function onViewOpen() {
        init();

        try {
            var competencia = TimesheetServices.carregaMesAno();
            var periodo = obterPeriodoPorCompetencia(competencia);

            if (!$("#relDataInicio").val()) {
                $("#relDataInicio").val(periodo.dataInicio);
            }

            if (!$("#relDataFim").val()) {
                $("#relDataFim").val(periodo.dataFim);
            }

        } catch (e) {
            console.error("Erro ao carregar período da competência:", e);

            FLUIGC.toast({
                title: "Atenção: ",
                message: "Não foi possível carregar o período da competência atual.",
                type: "warning",
                timeout: 5000
            });
        }

        initSelectColaboradorRel();
        initSelectProjetoRel();
        initSelectTarefaRel();
    }
    
    function obterPeriodoPorCompetencia(competencia) {
        competencia = String(competencia || "").trim();

        if (!/^\d{2}\/\d{4}$/.test(competencia)) {
            throw "Competência inválida: " + competencia + ". Esperado MM/AAAA.";
        }

        var partes = competencia.split("/");
        var mes = parseInt(partes[0], 10);
        var ano = parseInt(partes[1], 10);

        if (isNaN(mes) || isNaN(ano) || mes < 1 || mes > 12) {
            throw "Competência inválida: " + competencia + ". Esperado MM/AAAA.";
        }

        var primeiroDia = new Date(ano, mes - 1, 1);
        var ultimoDia = new Date(ano, mes, 0);

        return {
            dataInicio: formatarDataBR(primeiroDia),
            dataFim: formatarDataBR(ultimoDia)
        };
    }

    function bindEventos() {
        $(document).off("click", "#btn-filtrar-rel");
        $(document).on("click", "#btn-filtrar-rel", function () {
            buscar();
        });

        $(document).off("click", "#btn-export-rel-excel");
        $(document).on("click", "#btn-export-rel-excel", function () {
            exportarExcel();
        });

        $(document).off("change", "#rel-tipo");
        $(document).on("change", "#rel-tipo", function () {
            tipoAtual = $(this).val() || "analitico";
            dados = [];
            pagina = 1;
            render();
            $("#btn-export-rel-excel").prop("disabled", true);
        });
    }

    function initSelectColaboradorRel() {
        var $select = $("#filtro-rel-colaborador");

        if ($select.hasClass("select2-hidden-accessible")) {
            $select.select2("destroy");
        }

        $select.attr("multiple", "multiple");

        $select.select2({
            placeholder: "Selecione ou busque um ou mais colaboradores...",
            width: "100%",
            allowClear: true,

            language: {
                searching: function () { return "Carregando colaboradores..."; },
                noResults: function () { return "Nenhum colaborador encontrado"; }
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

                                    return !term || nome.indexOf(term) >= 0 || matricula.indexOf(term) >= 0;
                                })
                                .slice(0, limiteSelect)
                                .map(function (item) {
                                    return {
                                        id: item.matricula,
                                        text: item.nome
                                    };
                                });
                        }

                        success({ results: results });

                    } catch (e) {
                        console.error("Erro ao buscar colaboradores do relatório:", e);
                        failure();
                    }
                }
            },

            templateResult: TimesheetServices.formatColaborador,
            templateSelection: TimesheetServices.formatSelection
        });

        $select.off("select2:select select2:unselect select2:clear");
        $select.on("select2:select select2:unselect select2:clear", function () {
            $("#filtro-cod-rel-colaborador").val(($select.val() || []).join(","));
        });
    }

    function initSelectProjetoRel() {
        var $select = $("#filtro-projeto-rel-aprov");

        if ($select.hasClass("select2-hidden-accessible")) {
            $select.select2("destroy");
        }

        $select.select2({
            placeholder: "Selecione ou busque o projeto...",
            width: "100%",
            allowClear: true,

            language: {
                searching: function () { return "Carregando projetos..."; },
                noResults: function () { return "Nenhum projeto encontrado"; }
            },

            ajax: {
                delay: 300,

                transport: function (params, success, failure) {
                    try {
                        var codUsuario = $("#codRM").val();
                        var term = String((params.data && params.data.term) || "").toLowerCase();
                        var constraints = [];

                        if (codUsuario) {
                            constraints.push(DatasetFactory.createConstraint("CODIGO", codUsuario, codUsuario, ConstraintType.MUST));
                        }

                        var cacheKey = "proj_rel_" + codUsuario;
                        var dataset = TimesheetServices.consultarProjetos(constraints, cacheKey);
                        var results = [];

                        if (dataset && dataset.values) {
                            results = dataset.values
                                .filter(function (item) {
                                    var nome = String(item.NOME || "").toLowerCase();
                                    var codigo = String(item.CODIGO || "").toLowerCase();
                                    var id = String(item.ID || "").toLowerCase();

                                    return !term || nome.indexOf(term) >= 0 || codigo.indexOf(term) >= 0 || id.indexOf(term) >= 0;
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
                        console.error("Erro ao buscar projetos do relatório:", e);
                        failure();
                    }
                }
            },

            templateResult: TimesheetServices.formatProjeto,
            templateSelection: TimesheetServices.formatSelection
        });

        $select.off("select2:select select2:clear");

        $select.on("select2:select", function (e) {
            var data = e.params.data;

            $("#filtro-cod-projeto-rel-aprov").val(data.codigo || "");
            $("#filtro-id-projeto-rel-aprov").val(data.id || "");
            $("#filtro-tarefa-rel-aprov").val(null).trigger("change");
            $("#filtro-cod-tarefa-rel-aprov").val("");
        });

        $select.on("select2:clear", function () {
            $("#filtro-cod-projeto-rel-aprov").val("");
            $("#filtro-id-projeto-rel-aprov").val("");
            $("#filtro-tarefa-rel-aprov").val(null).trigger("change");
            $("#filtro-cod-tarefa-rel-aprov").val("");
        });
    }

    function initSelectTarefaRel() {
        var $select = $("#filtro-tarefa-rel-aprov");

        if ($select.hasClass("select2-hidden-accessible")) {
            $select.select2("destroy");
        }

        $select.select2({
            placeholder: "Selecione ou busque a tarefa...",
            width: "100%",
            allowClear: true,

            language: {
                searching: function () { return "Carregando tarefas..."; },
                noResults: function () { return "Nenhuma tarefa encontrada"; }
            },

            ajax: {
                delay: 300,

                transport: function (params, success, failure) {
                    try {
                        var codUsuario = $("#codRM").val();
                        var projetoId = $("#filtro-id-projeto-rel-aprov").val();

                        if (!projetoId) {
                            success({ results: [] });
                            return;
                        }

                        var term = String((params.data && params.data.term) || "").toLowerCase();

                        var constraints = [];

                        if (codUsuario) {
                            constraints.push(DatasetFactory.createConstraint("CODIGO", codUsuario, codUsuario, ConstraintType.MUST));
                        }

                        constraints.push(DatasetFactory.createConstraint("IDPRJ", projetoId, projetoId, ConstraintType.MUST));

                        var cacheKey = "tar_rel_" + codUsuario + "_" + projetoId;
                        var dataset = TimesheetServices.consultarProjetosTarefas(constraints, cacheKey);
                        var results = [];

                        if (dataset && dataset.values) {
                            results = dataset.values
                                .filter(function (item) {
                                    var nome = String(item.NOME || "").toLowerCase();
                                    var codigo = String(item.CODIGO || "").toLowerCase();

                                    return !term || nome.indexOf(term) >= 0 || codigo.indexOf(term) >= 0;
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
                        console.error("Erro ao buscar tarefas do relatório:", e);
                        failure();
                    }
                }
            },

            templateResult: TimesheetServices.formatTarefa,
            templateSelection: TimesheetServices.formatSelection
        });

        $select.off("select2:select select2:clear");

        $select.on("select2:select", function (e) {
            $("#filtro-cod-tarefa-rel-aprov").val(e.params.data.id || "");
        });

        $select.on("select2:clear", function () {
            $("#filtro-cod-tarefa-rel-aprov").val("");
        });
    }

    function obterFiltros() {

        return {
            dataInicio: String($("#relDataInicio").val() || "").trim(),
            dataFim: String($("#relDataFim").val() || "").trim(),
            colaboradores: ($("#filtro-rel-colaborador").val() || []).join(","),
            projeto: String($("#filtro-cod-projeto-rel-aprov").val() || $("#filtro-id-projeto-rel-aprov").val() || "").trim(),
            tarefa: String($("#filtro-cod-tarefa-rel-aprov").val() || "").trim(),
            tipo: String($("#rel-tipo").val() || "analitico").trim()
        };
    }

    function validarFiltros(filtros) {
        if (!filtros.dataInicio || !filtros.dataFim) {
            FLUIGC.toast({
                title: "Erro: ",
                message: "Informe Data início e Data fim.",
                type: "danger"
            });

            return false;
        }

        if (!isDataBR(filtros.dataInicio) || !isDataBR(filtros.dataFim)) {
            FLUIGC.toast({
                title: "Erro: ",
                message: "As datas devem estar no formato DD/MM/AAAA.",
                type: "danger"
            });

            return false;
        }

        return true;
    }

    function montarConstraints(filtros) {
        var constraints = [];

        addConstraintIfValue(constraints, "DATA_INICIO", filtros.dataInicio);
        addConstraintIfValue(constraints, "DATA_FIM", filtros.dataFim);
        addConstraintIfValue(constraints, "CODCOLABORADORES", filtros.colaboradores);
        addConstraintIfValue(constraints, "PROJETO", filtros.projeto);
        addConstraintIfValue(constraints, "TAREFA", filtros.tarefa);

        return constraints;
    }

    function addConstraintIfValue(constraints, field, value) {
        value = String(value || "").trim();

        if (value !== "") {
            constraints.push(DatasetFactory.createConstraint(field, value, value, ConstraintType.MUST));
        }
    }

    function buscar() {
        var filtros = obterFiltros();

        if (!validarFiltros(filtros)) {
            return;
        }

        tipoAtual = filtros.tipo;
        pagina = 1;

        var loading = FLUIGC.loading("#divRelatorios", {
            textMessage: "Consultando relatório..."
        });

        loading.show();

        setTimeout(function () {
            try {
                var datasetName = tipoAtual === "sintetico"
                    ? "ds_ts_relatorio_horas_sintetico"
                    : "ds_ts_relatorio_horas_analitico";

                var ds = TimesheetDataset.getDataset(datasetName, montarConstraints(filtros));

                if (!ds || !ds.values || ds.values.length === 0) {
                    dados = [];
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
                    render();

                    FLUIGC.toast({
                        title: "Erro: ",
                        message: ds.values[0].MESSAGE || "Erro ao consultar relatório.",
                        type: "danger"
                    });

                    return;
                }

                dados = ds.values.filter(function (row) {
                    return row.STATUS !== "ERRO";
                });

                render();

                $("#btn-export-rel-excel").prop("disabled", dados.length === 0);

            } catch (e) {
                console.error(e);

                FLUIGC.toast({
                    title: "Erro: ",
                    message: e.message || String(e),
                    type: "danger"
                });

            } finally {
                loading.hide();
            }

        }, 100);
    }

    function render() {
        $("#tituloResultadoRelatorio").text(
            tipoAtual === "sintetico"
                ? "Relatório sintético"
                : "Relatório analítico"
        );

        if (tipoAtual === "sintetico") {
            renderTabelaSintetica();
        } else {
            renderTabelaAnalitica();
        }

        renderPaginacao();

        $("#panelResultadoRelatorio").show();
    }

    function renderTabelaAnalitica() {
        var inicio = (pagina - 1) * pageSize;
        var fim = inicio + pageSize;
        var pageData = dados.slice(inicio, fim);
        var $thead = $("#vf-tabela-relatorio thead");
        var $tbody = $("#vf-tabela-relatorio tbody");

        $thead.empty();
        $tbody.empty();

        $thead.append(
            "<tr>" +
            "   <th style='width:60px'>#</th>" +
            "   <th style='width:240px'>Projeto</th>" +
            "   <th style='width:180px'>Tarefa</th>" +
            "   <th style='width:220px'>Gestor do contrato</th>" +
            "   <th style='width:200px'>Usuário</th>" +
            "   <th style='width:180px'>Data Apontamento</th>" +
            "   <th style='width:150px'>Data Aprovação</th>" +
            "   <th style='width:150px'>Horas Informadas</th>" +
            "   <th style='width:150px'>Horas Aprovadas</th>" +
            "</tr>"
        );

        if (!pageData || pageData.length === 0) {
            $tbody.append(
                "<tr>" +
                "   <td colspan='9' class='text-center' style='padding:20px;'>" +
                "       <i class='flaticon flaticon-info icon-md'></i><br>" +
                "       Nenhum registro encontrado" +
                "   </td>" +
                "</tr>"
            );

            return;
        }

        for (var i = 0; i < pageData.length; i++) {
            var item = pageData[i];

            $tbody.append(
                "<tr>" +
                "   <td>" + escapeHtml(item.NUM_LINHA || "") + "</td>" +
                "   <td title='" + escapeHtml(item.PROJETO || "") + "'>" + escapeHtml(item.PROJETO || "") + "</td>" +
                "   <td title='" + escapeHtml(item.TAREFA || "") + "'>" + escapeHtml(item.TAREFA || "") + "</td>" +
                "   <td title='" + escapeHtml(item.GESTOR_CONTRATO || "") + "'>" + escapeHtml(item.GESTOR_CONTRATO || "") + "</td>" +
                "   <td title='" + escapeHtml(item.USUARIO || "") + "'>" + escapeHtml(item.USUARIO || "") + "</td>" +
                "   <td>" + escapeHtml(item.DATA_APROPRIACAO || "") + "</td>" +
                "   <td>" + escapeHtml(item.DATA_APROVACAO || "") + "</td>" +
                "   <td class='text-right'>" + escapeHtml(item.HORAS_INFORMADAS || "0,00") + "</td>" +
                "   <td class='text-right'>" + escapeHtml(item.HORAS_APROVADAS || "0,00") + "</td>" +
                "</tr>"
            );
        }
    }

    function renderTabelaSintetica() {
        var inicio = (pagina - 1) * pageSize;
        var fim = inicio + pageSize;
        var pageData = dados.slice(inicio, fim);
        var $thead = $("#vf-tabela-relatorio thead");
        var $tbody = $("#vf-tabela-relatorio tbody");

        $thead.empty();
        $tbody.empty();

        $thead.append(
            "<tr>" +
            "   <th rowspan='2' style='width:60px'>#</th>" +
            "   <th rowspan='2' style='width:230px'>Título</th>" +
            "   <th rowspan='2' style='width:250px'>Projeto</th>" +
            "   <th rowspan='2' style='width:220px'>Colaborador</th>" +
            "   <th colspan='2' class='text-center' style='width:250px'>TOTAL</th>" +
            "</tr>" +
            "<tr>" +
            "   <th style='width:110px'>Horas Informadas</th>" +
            "   <th style='width:110px'>Horas Aprovadas</th>" +
            "</tr>"
        );

        if (!pageData || pageData.length === 0) {
            $tbody.append(
                "<tr>" +
                "   <td colspan='6' class='text-center' style='padding:20px;'>" +
                "       <i class='flaticon flaticon-info icon-md'></i><br>" +
                "       Nenhum registro encontrado" +
                "   </td>" +
                "</tr>"
            );

            return;
        }

        for (var i = 0; i < pageData.length; i++) {
            var item = pageData[i];
            var isTotal = String(item.TITULO || "").indexOf("[TOT]") === 0;

            $tbody.append(
                "<tr class='" + (isTotal ? "ts-rel-total-row" : "") + "'>" +
                "   <td>" + escapeHtml(item.NUM_LINHA || "") + "</td>" +
                "   <td title='" + escapeHtml(item.TITULO || "") + "'>" + escapeHtml(item.TITULO || "") + "</td>" +
                "   <td title='" + escapeHtml(item.PROJETO || "") + "'>" + escapeHtml(item.PROJETO || "") + "</td>" +
                "   <td title='" + escapeHtml(item.USUARIO || "") + "'>" + escapeHtml(item.USUARIO || "") + "</td>" +
                "   <td class='text-right'>" + escapeHtml(item.HORAS_INFORMADAS || "0,00") + "</td>" +
                "   <td class='text-right'>" + escapeHtml(item.HORAS_APROVADAS || "0,00") + "</td>" +
                "</tr>"
            );
        }
    }

    function renderPaginacao() {
        var totalPaginas = Math.ceil(dados.length / pageSize);
        var paginaAtual = pagina;
        var $container = $("#vf-paginacao-relatorio");

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
            '<select id="vf-page-size-rel" class="form-control input-sm" style="width:60px; display:inline-block;">' +
            '   <option value="10">10</option>' +
            '   <option value="25">25</option>' +
            '   <option value="50">50</option>' +
            '   <option value="100">100</option>' +
            '</select>'
        );

        $("#vf-page-size-rel").val(pageSize);

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

        $("#vf-page-size-rel").off("change").on("change", function () {
            pageSize = parseInt($(this).val(), 10) || 10;
            pagina = 1;
            render();
        });
    }

    function exportarExcel() {
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

        if (tipoAtual === "sintetico") {
            linhas = dados.map(function (item) {
                return {
                    "#": item.NUM_LINHA || "",
                    "Título": item.TITULO || "",
                    "Projeto": item.PROJETO || "",
                    "Colaborador": item.USUARIO || "",
                    "Horas Informadas": item.HORAS_INFORMADAS || "0,00",
                    "Horas Aprovadas": item.HORAS_APROVADAS || "0,00"
                };
            });

        } else {
            linhas = dados.map(function (item) {
                return {
                    "#": item.NUM_LINHA || "",
                    "Projeto": item.PROJETO || "",
                    "Tarefa": item.TAREFA || "",
                    "Gestor do contrato": item.GESTOR_CONTRATO || "",
                    "Usuário": item.USUARIO || "",
                    "Data Apontamento": item.DATA_APROPRIACAO || "",
                    "Data Aprovação": item.DATA_APROVACAO || "",
                    "Horas Informadas": item.HORAS_INFORMADAS || "0,00",
                    "Horas Aprovadas": item.HORAS_APROVADAS || "0,00"
                };
            });
        }

        var ws = XLSX.utils.json_to_sheet(linhas);
        var wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            wb,
            ws,
            tipoAtual === "sintetico" ? "Sintetico" : "Analitico"
        );

        XLSX.writeFile(
            wb,
            "relatorio_horas_" + tipoAtual + "_" + getTimestampArquivo() + ".xlsx"
        );
    }

    function isDataBR(value) {
        return /^\d{2}\/\d{2}\/\d{4}$/.test(String(value || ""));
    }

    function formatarDataBR(data) {
        return ("0" + data.getDate()).slice(-2) + "/"
            + ("0" + (data.getMonth() + 1)).slice(-2) + "/"
            + data.getFullYear();
    }

    function getTimestampArquivo() {
        var d = new Date();

        return d.getFullYear()
            + ("0" + (d.getMonth() + 1)).slice(-2)
            + ("0" + d.getDate()).slice(-2)
            + "_"
            + ("0" + d.getHours()).slice(-2)
            + ("0" + d.getMinutes()).slice(-2);
    }

    function escapeHtml(value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    return {
        init: init,
        onViewOpen: onViewOpen,
        buscar: buscar,
        render: render,
        exportarExcel: exportarExcel
    };
})();
