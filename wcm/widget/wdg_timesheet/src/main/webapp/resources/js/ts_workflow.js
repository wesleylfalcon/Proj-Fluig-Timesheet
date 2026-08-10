var TimesheetWorkflow = (function () {

    // =========================
    // Cria um apontamento
    // =========================
    function iniciarProcesso(dados, myLoading, origem) {

        var grupos = {};

        dados.apontamentos.forEach(function (item) {
            var data = item.dtApontamento;

            if (!grupos[data]) {
                grupos[data] = [];
            }

            grupos[data].push(item);
        });

        Object.keys(grupos).forEach(function (data) {
            var payloadDia = {
                usuario: dados.usuario,
                codRM: dados.codRM,
                nome: dados.nome,
                competencia: dados.competencia,
                aprovadores: dados.aprovadores,
                gestor: dados.gestor,
                apontamentos: grupos[data]
            };

            iniciarSolicitacao(payloadDia, data, myLoading, origem);
        });

        FLUIGC.toast({
            title: 'Sucesso: ',
            message: 'Apontamentos enviados',
            type: 'success'
        });

        myLoading.hide();
    }

    function iniciarSolicitacao(payload, data, myLoading, origem) {

        var constraints = [];
        constraints.push(DatasetFactory.createConstraint("DATA", JSON.stringify(payload), null, ConstraintType.MUST));

        var ds = TimesheetDataset.getDataset('ds_ts_inicia_solicitacao', constraints);

        if (ds && ds.values.length > 0) {
            var row = ds.values[0];

            if (row.STATUS === "OK") {
                TimesheetServices.removerLinhasPorData(data, origem, payload);

            } else {
                FLUIGC.toast({
                    title: 'Erro no dia ' + data,
                    message: row.MESSAGE,
                    type: 'danger'
                });

                myLoading.hide();
            }
        }
    }


    // =========================
    // Edita um apontamento
    // =========================
    function editarProcesso(payload, myLoading) {

        var constraints = [];
        constraints.push(DatasetFactory.createConstraint("DATA", JSON.stringify(payload), null, ConstraintType.MUST));

        var ds = TimesheetDataset.getDataset("ds_ts_edita_solicitacao", constraints);

        if (ds && ds.values.length > 0) {
            var row = ds.values[0];

            if (row.STATUS === "OK") {
                FLUIGC.toast({
                    title: "Sucesso: ",
                    message: "Apontamento atualizado",
                    type: "success"
                });

                myLoading.hide();

                $('#fluig-modal-edicao').modal('hide');

                if (payload.origem === "INFO_USUARIOS") {
                    $(document).trigger("timesheet:infoUsuarios:ajusteSucesso", [
                        payload,
                        row
                    ]);
                } else {
                    ConsultaApontamentos.buscar();
                }

            } else {
                FLUIGC.toast({
                    title: "Erro: ",
                    message: row.MESSAGE,
                    type: "danger"
                });

                myLoading.hide();
            }
        }
    }


    // =========================
    // Aprova/Reprova/Revisa um apontamento
    // =========================
    function executarProcesso(payload, myLoading) {

        var constraints = [];
        constraints.push(DatasetFactory.createConstraint("DATA", JSON.stringify(payload), null, ConstraintType.MUST));

        var ds = TimesheetDataset.getDataset("ds_ts_aprovar_solicitacao", constraints);

        if (ds && ds.values.length > 0) {
            var row = ds.values[0];

            var acaoTexto = '';

            switch (payload.acao) {
                case 'APROVAR':
                    acaoTexto = 'aprovada';
                    break;

                case 'REPROVAR':
                    acaoTexto = 'reprovada';
                    break;

                case 'REVISAR':
                    acaoTexto = 'enviada para revisão';
                    break;

                default:
                    acaoTexto = 'processada';
            }

            if (row.STATUS === "OK") {
                FLUIGC.toast({
                    title: "Sucesso: ",
                    message: "Solicitação " + payload.processInstanceId + " " + acaoTexto,
                    type: "success"
                });

                $('#fluig-modal-aprovacao').modal('hide');

                ConsultaAprovacoes.buscar();

            } else {
                FLUIGC.toast({
                    title: "Erro: ",
                    message: row.MESSAGE,
                    type: "danger"
                });
            }
        }

        myLoading.hide();
    }

    // =========================
    // Cancela um apontamento
    // =========================
    function cancelarProcesso(dados, myLoading) {

        var constraints = [];
        constraints.push(DatasetFactory.createConstraint("SOLICITACAO", dados.nrSolicitacao, null, ConstraintType.MUST));
        constraints.push(DatasetFactory.createConstraint("USUARIO", dados.usuario, null, ConstraintType.MUST));
        constraints.push(DatasetFactory.createConstraint("MOTIVO", dados.motivo, null, ConstraintType.MUST));

        var ds = TimesheetDataset.getDataset('ds_ts_cancela_solicitacao', constraints);

        if (ds && ds.values.length > 0) {
            var row = ds.values[0];

            if (row.STATUS === "OK") {
                FLUIGC.toast({
                    title: 'Sucesso: ',
                    message: 'Solicitação ' + dados.nrSolicitacao + ' excluída com sucesso',
                    type: 'success'
                });

                ConsultaApontamentos.buscar();
                myLoading.hide();

            } else {
                FLUIGC.toast({
                    title: 'Erro: ',
                    message: row.MESSAGE,
                    type: 'danger'
                });

                myLoading.hide();
            }
        }
    }


    // =========================
    // Aprovação em lote
    // =========================
    function executarProcessoLote(payloads, myLoading) {

        var total = payloads.length;
        var sucesso = 0;
        var erro = 0;

        payloads.forEach(function (payload) {
            var constraints = [];
            constraints.push(DatasetFactory.createConstraint("DATA", JSON.stringify(payload), null, ConstraintType.MUST));

            var ds = TimesheetDataset.getDataset("ds_ts_aprovar_solicitacao", constraints);

            if (ds && ds.values.length > 0) {
                var row = ds.values[0];

                if (row.STATUS === "OK") {
                    sucesso++;

                } else {
                    erro++;
                }

            } else {
                erro++;
            }
        });

        // TEXTO AÇÃO
        var acao = payloads[0].acao;

        var textoAcao = '';

        switch (acao) {
            case 'APROVAR':
                textoAcao = 'aprovadas';
                break;

            case 'REPROVAR':
                textoAcao = 'reprovadas';
                break;

            case 'REVISAR':
                textoAcao = 'enviadas para revisão';
                break;

            default:
                textoAcao = 'processadas';
        }

        // TOAST
        FLUIGC.toast({
            title: erro > 0 ? 'Erro: ' : 'Sucesso: ',
            message: sucesso + ' solicitações ' + textoAcao + (erro > 0 ? (' | ' + erro + ' com erro') : ''),
            type: erro > 0 ? 'danger' : 'success'
        });

        $('#fluig-modal-aprovacao-lote').modal('hide');

        ConsultaAprovacoes.buscar();

        myLoading.hide();
    }

    return {
        iniciarProcesso: iniciarProcesso,
        executarProcesso: executarProcesso,
        cancelarProcesso: cancelarProcesso,
        editarProcesso: editarProcesso,
        executarProcessoLote: executarProcessoLote
    };
})();