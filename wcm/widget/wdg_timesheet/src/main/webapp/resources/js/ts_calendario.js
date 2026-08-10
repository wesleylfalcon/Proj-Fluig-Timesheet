//Variáveis do calendário
var calendarioModal = null;
var calendar = null;
var datasLancadas = [];
var datasPendentes = [];
var datasFerias = [];
var datasAtestado = [];
var datasFeriados = [];
var horasApontadasPorDia = {};
var horasAusenciasPorDia = {};
var inputDataAtual = null;
var inputHoraAtual = null;

var TimesheetCalendario = (function () {

    // =========================
    // Abre calendário
    // =========================
    function abrirCalendario(config) {
    	
        calendarioModal = FLUIGC.modal({
            title: 'Selecionar Data',
            content: '<div id="vf-calendar-modal"></div>',
            id: 'fluig-modal-calendar',
            size: 'full'
        }, function (err, data) {
            if (!err) {
                initCalendarModal(config);
            }
        });
    }

    // =========================
    // Carrega dados de datas no calendário
    // =========================
    function initCalendarModal(config) {
    	
        config = config || {};
        var readOnly = config.readOnly || false;

        var el = document.getElementById('vf-calendar-modal');
        if (!el) return;

        // Dados simulados (depois vem dataset)
        carregarDatasCalendario(config);
        carregarAusenciasCalendario(config);

        var jornadaColaboradorAtual = carregarJornadaCalendario(config);
        var limiteHorasDia = TimesheetServices.obterLimiteHorasDiaDecimal(jornadaColaboradorAtual);

        var eventos = [];

        //Lançadas
        datasLancadas.forEach(function (data) {
            var horas = horasApontadasPorDia[data] || 0;

            eventos.push({
                title: TimesheetServices.decimalParaHora(horas),
                start: data,
                className: horas >= limiteHorasDia ? 'vf-lancado-full' : 'vf-lancado',
                extendedProps: {
                    tipo: 'apontamento',
                    horas: horas
                }
            });
        });

        //Pendentes
        datasPendentes.forEach(function (data) {
            var horas = horasApontadasPorDia[data] || 0;

            eventos.push({
                title: TimesheetServices.decimalParaHora(horas),
                start: data,
                className: horas >= limiteHorasDia ? 'vf-pendente-full' : 'vf-pendente',
                extendedProps: {
                    tipo: 'pendente',
                    horas: horas
                }
            });
        });

        //Férias
        datasFerias.forEach(function (data) {
            eventos.push({
                title: 'Férias',
                start: data,
                className: 'vf-ferias',
                extendedProps: {
                    tipo: 'ferias'
                }
            });
        });

        //Feriados
        datasFeriados.forEach(function (data) {
            eventos.push({
                title: 'Feriado',
                start: data,
                className: 'vf-feriado',
                extendedProps: {
                    tipo: 'feriado'
                }
            });
        });

        //Atestado
        datasAtestado.forEach(function (data) {
            var horas = horasAusenciasPorDia[data] || 0;

            eventos.push({
                title: 'Atestado Médico - ' + TimesheetServices.decimalParaHora(horas),
                start: data,
                className: horas >= limiteHorasDia ? 'vf-atestado-full' : 'vf-atestado',
                extendedProps: {
                    tipo: 'atestado',
                    horas: horas
                }
            });
        });

        //Renderiza o calendário
        calendar = new FullCalendar.Calendar(el, {
            initialView: 'dayGridMonth',
            locale: 'pt-br',
            height: 500,
            
            initialDate: obterInitialDateCompetencia(),
            
            weekends: true,

            displayEventTime: false,
            showNonCurrentDates: false,
            fixedWeekCount: false,

            selectable: !readOnly,
            editable: !readOnly,
            eventStartEditable: !readOnly,

            select: function (info) {
                if (readOnly) return false;
            },

            headerToolbar: {
                left: '',
                center: 'title',
                right: ''
            },

            //selectable: true,
            events: eventos,

            selectAllow: function (selectInfo) {
                if (readOnly) return false;

                if (!TimesheetServices.isDiaPermitidoJornada(selectInfo.start, jornadaColaboradorAtual)) {
                    return false;
                }

                return !TimesheetServices.isDataBloqueada(selectInfo.startStr, jornadaColaboradorAtual);
            },

            select: function (info) {
                if (readOnly) return false;
            },

            dateClick: function (info) {
                if (readOnly) return false;

                var data = info.dateStr;
                
                if (!TimesheetServices.isDiaPermitidoJornada(info.date, jornadaColaboradorAtual)) {
                    FLUIGC.toast({
                        title: 'Atenção: ',
                        message: 'Este dia não faz parte da jornada de apontamento do colaborador. Dias permitidos: '
                            + (jornadaColaboradorAtual.diasSemana || 'não informado') + '.',
                        type: 'warning',
                        timeout: 5000
                    });

                    return;
                }
                
                var horasApontadas = horasApontadasPorDia[data] || 0;
                var horasAusencias = horasAusenciasPorDia[data] || 0;
                var horasTotal = horasApontadas + horasAusencias;


                // REGRAS DE BLOQUEIO

                // 1. FÉRIAS (sempre prioridade máxima)
                if (datasFerias.includes(data)) {
                    FLUIGC.toast({
                        title: 'Atenção: ',
                        message: 'Período de férias',
                        type: 'warning',
                        timeout: 5000
                    });

                    return;
                }

                // 2. FERIADOS (sempre prioridade máxima)
                if (datasFeriados.includes(data)) {
                    FLUIGC.toast({
                        title: 'Atenção: ',
                        message: 'Feriado',
                        type: 'warning',
                        timeout: 5000
                    });

                    return;
                }

                // 3. ATESTADO
                if (datasAtestado.includes(data)) {
                    if (horasAusencias >= limiteHorasDia) {
                        FLUIGC.toast({
                            title: 'Atenção: ',
                            message: 'Atestado médico',
                            type: 'warning',
                            timeout: 5000
                        });

                        return;
                    }
                    //se for parcial, continua (NÃO BLOQUEIA)
                }

                // 4. LIMITE DE HORAS
                if (horasTotal >= limiteHorasDia) {
                    FLUIGC.toast({
                        title: 'Atenção: ',
                        message: 'Limite de ' + jornadaColaboradorAtual.horasDia + ' já atingido',
                        type: 'warning',
                        timeout: 5000
                    });

                    return;
                }

                // PERMITIDO
                if (inputDataAtual) {
                    inputDataAtual.val(TimesheetServices.formatarDataBR(data));
                }

                if (inputHoraAtual) {
                    inputHoraAtual.val(horasTotal);
                }

                calendarioModal.remove();
            },

            eventContent: function (arg) {

                var tipo = arg.event.extendedProps.tipo;
                var horas = arg.event.extendedProps.horas;

                var horasFormatadas = TimesheetServices.decimalParaHora(horas);

                if (tipo === 'apontamento' || tipo === 'pendente') {

                    return {
                        html:
                            '<div style="font-weight:bold;">' +
                            horasFormatadas +
                            '</div>'
                    };
                }

                if (tipo === 'atestado') {

                    return {
                        html:
                            '<div style="font-size:11px;">' +
                            'Atestado<br>' +
                            horasFormatadas +
                            '</div>'
                    };
                }

                return true;
            },

            dayCellDidMount: function (info) {
                if (!TimesheetServices.isDiaPermitidoJornada(info.date, jornadaColaboradorAtual)) {
                    $(info.el).addClass("ts-dia-jornada-bloqueada");
                    $(info.el).attr("title", "Fora da jornada de apontamento");
                }
            },

            eventDidMount: function (info) {

                var tipo = info.event.extendedProps.tipo;
                var horas = info.event.extendedProps.horas;

                var horasFormatadas = TimesheetServices.decimalParaHora(horas);

                if (tipo === 'apontamento' || tipo === 'pendente') {

                    $(info.el).attr(
                        "title",
                        horasFormatadas + " apontadas"
                    );
                }

                if (tipo === 'atestado') {

                    $(info.el).attr(
                        "title",
                        "Atestado: " + horasFormatadas
                    );
                }

                if (tipo === 'ferias') {
                    $(info.el).attr("title", "Férias");
                }

                if (tipo === 'feriado') {
                    $(info.el).attr("title", "Feriado");
                }
            }          
            
        });

        calendar.render();
    }  
    
    function obterInitialDateCompetencia() {

        var competencia = TimesheetServices.carregaMesAno();

        var partes = String(competencia || "").split("/");

        if (partes.length !== 2) {
            return new Date();
        }

        var mes = partes[0];
        var ano = partes[1];

        if (mes.length === 1) {
            mes = "0" + mes;
        }

        return ano + "-" + mes + "-01";
    }
    
    function getMatriculaCalendario(config) {

        config = config || {};

        var usuarioBase = config.usuarioBase || "delegacao";

        // Sempre usuário logado, ignorando delegação
        if (usuarioBase === "logado") {
            return String($("#matriculaUsuario").val() || "").trim();
        }

        // Delegado se houver; se não houver, usuário logado
        if (usuarioBase === "delegacao") {
            return TimesheetServices.getUsuarioBase("matricula");
        }

        // Fallback seguro
        return String($("#matriculaUsuario").val() || "").trim();
    }

    // =========================
    // Carrega as datas da competencia atual
    // =========================
    function carregarDatasCalendario(config) {
    	
    	config = config || {};

        var codCompetencia = TimesheetServices.carregaMesAno();
        var matricula = getMatriculaCalendario(config);

        var constraints = [];
        constraints.push(DatasetFactory.createConstraint("CODIGO", matricula, matricula, ConstraintType.MUST));
        constraints.push(DatasetFactory.createConstraint("COMPETENCIA", codCompetencia, codCompetencia, ConstraintType.MUST));

        var ds = TimesheetDataset.getDataset('ds_ts_apontamentos_datas', constraints);

        datasLancadas = [];
        datasPendentes = [];
        horasApontadasPorDia = {};

        if (ds && ds.values) {
            ds.values.forEach(function (item) {
                var data = item.data;
                var status = (item.status || "").trim();
                var horas = TimesheetServices.horaParaDecimal(item.horas);

                // 1. Soma horas por dia
                if (!horasApontadasPorDia[data]) {
                    horasApontadasPorDia[data] = 0;
                }
                horasApontadasPorDia[data] += horas;

                // 2. Classificação por status (com prioridade)
                if (status === "Pendente aprovação") {
                    // remove de lançadas se existir
                    datasLancadas = datasLancadas.filter(function (d) {
                        return d !== data;
                    });

                    if (!datasPendentes.includes(data)) {
                        datasPendentes.push(data);
                    }

                } else if (status === "Aprovado") {
                    // só adiciona se NÃO estiver pendente
                    if (!datasPendentes.includes(data)) {
                        if (!datasLancadas.includes(data)) {
                            datasLancadas.push(data);
                        }
                    }
                }
            });
        }
    }

    // =========================
    // Carrega as ausências da competencia atual
    // =========================
    function carregarAusenciasCalendario(config) {
    	
    	config = config || {};

        var codCompetencia = TimesheetServices.carregaMesAno();
        var mesComp = codCompetencia.split("/")[0];
        var anoComp = codCompetencia.split("/")[1];
        var chapa = $("#delegar-apontamento-codRM").val() ? $("#delegar-apontamento-codRM").val() : $("#codRM").val();

        var constraints = [];
        constraints.push(DatasetFactory.createConstraint("CHAPA", chapa, chapa, ConstraintType.MUST));
        constraints.push(DatasetFactory.createConstraint("MES", mesComp, mesComp, ConstraintType.MUST));
        constraints.push(DatasetFactory.createConstraint("ANO", anoComp, anoComp, ConstraintType.MUST));

        var ds = TimesheetDataset.getDataset('ds_ts_ausencias', constraints);

        datasFerias = [];
        datasFeriados = [];
        datasAtestado = [];
        horasAusenciasPorDia = {};

        if (ds && ds.values) {
            ds.values.forEach(function (item) {

                var data = item.DATA;
                var status = (item.STATUS || "").trim();
                var horas = TimesheetServices.horaParaDecimal(item.HORAS);

                if (!horasAusenciasPorDia[data]) {
                    horasAusenciasPorDia[data] = 0;
                }

                horasAusenciasPorDia[data] += horas;

                if (status === "Férias") {
                    if (!datasFerias.includes(data)) {
                        datasFerias.push(data);
                    }
                }

                if (status === "Feriado") {
                    if (!datasFeriados.includes(data)) {
                        datasFeriados.push(data);
                    }
                }

                if (status === "Atestado") {
                    if (!datasAtestado.includes(data)) {
                        datasAtestado.push(data);
                    }
                }
            });
        }
    }

    function carregarJornadaCalendario(config) {

        config = config || {};

        var chapa = "";

        if (config.usuarioBase === "logado") {
            chapa = String($("#codRM").val() || "").trim();

        } else {
            try {
                chapa = TimesheetServices.obterCodRMParaApontamento();
            } catch (e) {
                chapa = String($("#delegar-apontamento-codRM").val() || $("#codRM").val() || "").trim();
            }
        }

        return TimesheetServices.obterJornadaColaborador(chapa);
    }

    return {
        abrirCalendario: abrirCalendario,
        initCalendarModal: initCalendarModal,
        carregarDatasCalendario: carregarDatasCalendario,
        carregarAusenciasCalendario: carregarAusenciasCalendario,
        carregarJornadaCalendario: carregarJornadaCalendario,
        getMatriculaCalendario: getMatriculaCalendario
    };

})();