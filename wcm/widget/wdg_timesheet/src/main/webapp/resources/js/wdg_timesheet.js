var MyWidget = SuperWidget.extend({

    init: function () {
    	
        TimesheetUI.initHeader();
        TimesheetUI.initRouter(this);
        TimesheetUI.initSidebar();
        TimesheetUI.initTabelaEventos();
        TimesheetUI.ocultaMenus();
        TimesheetServices.validarPermissaoDelegacao();
        
        var viewInicial = "painel";//localStorage.getItem("tsViewAtual") || "painel";
        this.abrirView(viewInicial);
    },

    bindings: {
        local: {
            'execute': ['click_executeAction']
        }
    },

    executeAction: function (htmlElement, event) {
    	
        console.log('Ação executada:', htmlElement, event);
    },

    // =========================
    // Carrega o menu selecionado
    // =========================
    abrirView: function (view) {

        view = view || "painel";

        // Persiste a view ativa para refresh/F5.
        localStorage.setItem("tsViewAtual", view);

        $('.ts-menu-item').removeClass('active');
        $('.ts-menu-item[data-view="' + view + '"]').addClass('active');

        TimesheetUI.abrirView(view);
        this.onViewOpen(view);
    },

    // =========================
    // Abre o menu selecionado
    // =========================
    onViewOpen: function (view) {
    	
        switch (view) {
            case 'painel':
                TimesheetPainel.carregarPainel();
                break;

            case 'apontamento':
                var loadingApont = FLUIGC.loading('#divApontamentos', {
                    textMessage: 'Carregando...'
                });

                loadingApont.show();

                setTimeout(function () {
                    try {
                        TimesheetApontamento.carregaFiltroInicial();

                    } catch (e) {
                        console.error(e);

                        FLUIGC.toast({
                            title: 'Erro: ',
                            message: e.message || e,
                            type: 'danger'
                        });

                    } finally {
                        loadingApont.hide();
                    }

                }, 500);

                break;

            case 'aprovacoes':
                var loadingAprov = FLUIGC.loading('#divAprovacao', {
                    textMessage: 'Carregando...'
                });

                loadingAprov.show();

                setTimeout(function () {
                    try {
                        TimesheetAprovacao.carregaFiltroInicial();
                        TimesheetAprovacao.carregarCompetencia();
                        TimesheetAprovacao.carregaHorasAprovacao();
                        TimesheetAprovacao.carregaProjetos();
                        TimesheetAprovacao.initSelectProjetoAprov();
                        TimesheetAprovacao.initSelectTarefaAprov();
                        TimesheetAprovacao.initSelectColaboradorAprov();

                    } catch (e) {
                        console.error(e);

                        FLUIGC.toast({
                            title: 'Erro: ',
                            message: e.message || e,
                            type: 'danger'
                        });

                    } finally {
                        loadingAprov.hide();
                    }

                }, 500);

                break;

            case 'relatorios':
                var loadingRel = FLUIGC.loading('#divRelatorios', {
                    textMessage: 'Carregando...'
                });

                loadingRel.show();

                setTimeout(function () {
                    try {
                        TimesheetRelatorios.onViewOpen();
                        TimesheetRelatorioInfoUsuarios.onViewOpen();

                    } catch (e) {
                        console.error(e);

                        FLUIGC.toast({
                            title: 'Erro: ',
                            message: e.message || e,
                            type: 'danger'
                        });

                    } finally {
                        loadingRel.hide();
                    }

                }, 300);

                break;

            case 'aprovacao-massiva':
            	 var loadingAprovMass = FLUIGC.loading('#divAprovacaoMassiva', {
                     textMessage: 'Carregando...'
                 });

            	 loadingAprovMass.show();
                 
            	 setTimeout(function () {
                     try {
		                TimesheetServices.recuperarProcessamentoAtivo();
		                TimesheetAprovacaoMassiva.carregarHistorico();
		                
                     } catch (e) {
                         console.error(e);

                         FLUIGC.toast({
                             title: 'Erro: ',
                             message: e.message || e,
                             type: 'danger'
                         });

                     } finally {
                    	 loadingAprovMass.hide();
                     }

                 }, 500);
            	 
                break;
        }
    }
});