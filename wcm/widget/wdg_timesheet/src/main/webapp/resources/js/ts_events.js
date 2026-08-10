$(document).on('click', '#btn-export-tarefas-excel', function () {

	TimesheetPainel.exportarTarefasExcel();
});


$(document).on('click', '#btn-atualiza-painel', function () {

	TimesheetPainel.carregarPainel();
});


$(document).on('click', '#ts-horas-aprovadas, #ts-horas-pendentes', function () {

	var status = $(this).attr('id') === 'ts-horas-aprovadas'
		? 'Aprovado'
		: 'Pendente aprovação';

	var titulo = status === 'Aprovado'
		? 'Aprovadas'
		: 'Pendentes';

	const codigo = $("#matriculaUsuario").val();

	var codCompetencia = TimesheetServices.carregaMesAno();

	var c1 = DatasetFactory.createConstraint("STATUS", status, status, ConstraintType.MUST);
	var c2 = DatasetFactory.createConstraint("CODIGO", codigo, codigo, ConstraintType.MUST);
	var c3 = DatasetFactory.createConstraint("COMPETENCIA", codCompetencia, codCompetencia, ConstraintType.MUST);

	var ds = DatasetFactory.getDataset("ds_ts_solicitacoes_por_status", null, [c1, c2, c3], null);

	TimesheetPainel.abrirDetalheHoras(ds, titulo);
});


$(document).on('click', '.vf-add-row', function () {

	const $lastRow = $('#vf-table-horas tbody tr:last');

	let novaData = '';
	let horas = '';
	let observacao = '';

	// Se existir linha anterior
	if ($lastRow.length) {

		const dataAtual = $lastRow.find('.vf-data').val();
		horas = $lastRow.find('.vf-horas').val();
		observacao = $lastRow.find('.vf-obs').val();

		// Incrementar data +1 dia
		if (dataAtual) {

			const parsedDate = TimesheetServices.vfParseDate(dataAtual);

			if (parsedDate) {

				const nextDate = TimesheetServices.vfAddDays(parsedDate, 1);

				novaData = TimesheetServices.vfFormatDate(nextDate);
			}
		}
	}

	const row = `
	  <tr>
		  <td data-label="#" class="vf-linha-numero text-center"></td>
		  
	      <td data-label="Data">
	          <div class="input-group">
	              <input 
	                  type="text" 
	                  class="form-control vf-data" 
	                  readonly
	                  value="${novaData}">
	                  
	              <span class="input-group-addon vf-open-calendar" style="cursor:pointer;">
	                  <i class="flaticon flaticon-calendar"></i>
	              </span>
	          </div>
	      </td>
	
	      <td data-label="Horas">
	          <input 
	              type="text" 
	              class="form-control vf-horas" 
	              placeholder="00:00"
	              value="${horas}">
	
	          <input type="hidden" class="form-control vf-hora-atual">
	      </td>
	
	      <td data-label="Situação">
	          <input 
	              type="text" 
	              class="form-control vf-situacao" 
	              value="Pendente aprovação" 
	              readonly>
	      </td>
	
	      <td data-label="Observação">
	          <input 
	              type="text" 
	              class="form-control vf-obs" 
	              placeholder="Inserir observações"
	              value="${observacao}">
	      </td>
	
	      <td data-label="">
	          <button class="btn btn-danger vf-remove">
	              <i class="flaticon flaticon-close icon-sm" aria-hidden="true"></i>
	          </button>
	      </td>
	  </tr>`;

	$('#vf-table-horas tbody').append(row);
	
	TimesheetServices.renumerarTabelaHorasPainel();

	// Aplicar máscara apenas na nova linha
	$('#vf-table-horas tbody tr:last .vf-horas').mask('00:00');
});


$(document).on('click', '.vf-remove', function () {
	
	$(this).closest('tr').remove();
	
	TimesheetServices.renumerarTabelaHorasPainel();
});


$(document).on('click', '[data-send]', function () {
	
	const $rows = $('#vf-table-horas tbody tr');
	const idUsuario = $('#matriculaUsuario').val();
	const codRM = $('#codRM').val();
	const competencia = $('#ts-fim-competencia').text();
	const idProjeto = $('#idProjeto').val();
	const codProjeto = $('#codProjeto').val();
	const idTarefa = $('#idTarefa').val();
	const idISM = $('#idISM').val();
	const idTRF = $('#idTRF').val();
	const hrPrevista = $('#hrPrevista').val();

	var myLoading = FLUIGC.loading('#modalTimesheet', {
		textMessage: 'Enviando apontamentos'
	});
	myLoading.show();

	setTimeout(function () {
		// VALIDA HORAS APONTADAS
		const errosHoras = TimesheetServices.validaTotalHoras(idUsuario, competencia, codProjeto, idTarefa, hrPrevista, $rows);

		if (errosHoras.length > 0) {
			FLUIGC.toast({
				title: "Erro: ",
				message: errosHoras.join("<br>"),
				type: "danger"
			});

			myLoading.hide();

			return;
		}

		// VALIDA MÊS ATUAL
		const errosMes = TimesheetServices.validarMesAtual($rows, competencia);

		if (errosMes.length > 0) {
			FLUIGC.toast({
				title: "Erro: ",
				message: errosMes.join("<br>"),
				type: "danger"
			});

			myLoading.hide();

			return;
		}

		// VALIDA INSERÇÃO DE LINHA
		const erroLinhas = TimesheetServices.validarAddLinha();

		if (erroLinhas.length > 0) {
			FLUIGC.toast({
				title: "Erro: ",
				message: erroLinhas.join("<br>"),
				type: "danger"
			});

			myLoading.hide();

			return;
		}

		// VALIDA CAMPOS
		const errosCampos = TimesheetServices.validarCampos($rows);

		if (errosCampos.length > 0) {
			FLUIGC.toast({
				title: "Erro: ",
				message: errosCampos.join("<br>"),
				type: "danger"
			});

			myLoading.hide();

			return;
		}

		// VALIDA DATAS DUPLICADAS
		const datasDuplicadas = TimesheetServices.validarDatasDuplicadas($rows);

		if (datasDuplicadas.length > 0) {
			FLUIGC.toast({
				title: "Erro: ",
				message: "Existe mais de um apontamento para a(s) data(s): <br>"
					+ datasDuplicadas.join("<br>"),
				type: "danger"
			});

			myLoading.hide();

			return;
		}

		const nmUsuario = $('#ts-usuario').text();
		let dtCompetencia = TimesheetServices.carregaMesAno();

		/*var retornoAprovador = TimesheetServices.obterAprovador(codProjeto);

		if (!retornoAprovador || retornoAprovador.success !== true) {
		    FLUIGC.toast({
		        title: "Erro: ",
		        message: retornoAprovador && retornoAprovador.message
		            ? retornoAprovador.message
		            : "Não foi possível obter os aprovadores do projeto " + idProjeto + ".",
		        type: "danger"
		    });

		    habilitarBotaoEnvioHoras();
		    
		    myLoading.hide();

		    return false;
		}

		var aprovador = retornoAprovador.aprovadores;
		var gestorContrato = retornoAprovador.gestor;*/
		var aprovador = "PS0108,AL04187,c4c0888e1b9a4840846cf3a6d19a7301,7a5f93fd5fa34b1d890c314e807383b5,389d76d65978460aabe7db6d21eac2ce";
		var gestorContrato = "WESLEY FALCON";

		const payload = {
			usuario: idUsuario,
			codRM: codRM,
			nome: nmUsuario,
			competencia: dtCompetencia,
			aprovadores: aprovador.split(','),
			gestor: gestorContrato,
			apontamentos: []
		};

		const nmProjeto = $("#nmProjeto").val();
		const nmTarefa = $("#nmTarefa").val();

		$('#vf-table-horas tbody tr').each(function () {
			payload.apontamentos.push({
				nmProjeto: nmProjeto,
				idProjeto: idProjeto,
				codProjeto: codProjeto,
				nmTarefa: nmTarefa,
				idTarefa: idTarefa,
				idISM: idISM,
				idTRF: idTRF,
				dtApontamento: $(this).find('.vf-data').val(),
				situacao: "Pendente aprovação",
				horas: $(this).find('.vf-horas').val(),
				observacao: $(this).find('.vf-obs').val()
			});
		});

		console.log("Payload:", payload);

		const origem = "painel";

		TimesheetWorkflow.iniciarProcesso(payload, myLoading, origem);
	}, 300);
});


$(document).on('click', '.vf-open-calendar, .vf-data', function () {
	
	var $row = $(this).closest('tr');

	inputDataAtual = $row.find('.vf-data');
	inputHoraAtual = $row.find('.vf-hora-atual');

	TimesheetCalendario.abrirCalendario({
		usuarioBase: "logado"
	});
});


$(document).on('click', '#btn-aprovar-lote', function () {
	
	var selecionados = [];

	$('.vf-check-aprov:checked').each(function () {
		selecionados.push({
			nrSolicitacao: $(this).data('id')
		});
	});

	if (selecionados.length === 0) {
		FLUIGC.toast({
			title: "Atenção: ",
			message: "Selecione ao menos uma solicitação",
			type: "warning",
			timeout: 5000
		});

		return;
	}

	FLUIGC.modal({
		class: 'vf-modal-aprovacao-lote',
		title: 'Aprovação em lote',
		content: `
	      	  <div class="vf-aprovacao-lote-modal">	
			      <div class="form-group">
		      		  <p>Foram selecionadas
			          <strong>${selecionados.length}</strong>
			          solicitações.</p>
			      </div>
			
			      <div class="form-group">
			          <label>
			              Justificativa
			          </label>
			
			          <textarea
			              id="txt-justificativa-lote"
			              class="form-control"
			              rows="4"
			              placeholder="Informe a justificativa para revisão/reprovação..."
			          ></textarea>
			      </div>
	
			      <div class="form-group">
			      	  <p>Escolha a ação desejada:</p>
	              </div>
	          </div>
	      `,
		id: 'fluig-modal-aprovacao-lote',
		size: 'normal',
		actions: [
			{
				label: 'Revisar',
				bind: 'data-revisar-lote',
				classType: 'btn-warning'
			},
			{
				label: 'Reprovar',
				bind: 'data-reprovar-lote',
				classType: 'btn-danger'
			},
			{
				label: 'Aprovar',
				bind: 'data-aprovar-lote',
				classType: 'btn-success'
			}
		]
	});

	$('#fluig-modal-aprovacao-lote').data('solicitacoes', selecionados);

	setTimeout(function () {
		$('#fluig-modal-aprovacao-lote .modal-footer').css({
			display: 'flex',
			justifyContent: 'center',
			gap: '10px',
			flexWrap: 'nowrap'
		});

		$('#fluig-modal-aprovacao-lote .modal-footer .btn').css({
			minWidth: '120px'
		});
	}, 100);
});


$(document).on('click', '#fluig-modal-aprovacao-lote [data-aprovar-lote],#fluig-modal-aprovacao-lote [data-reprovar-lote], #fluig-modal-aprovacao-lote [data-revisar-lote]', function () {

	var acao = '';

	if ($(this).is('[data-aprovar-lote]')) {
		acao = 'APROVAR';
	}

	if ($(this).is('[data-reprovar-lote]')) {
		acao = 'REPROVAR';
	}

	if ($(this).is('[data-revisar-lote]')) {
		acao = 'REVISAR';
	}

	TimesheetServices.executarAprovacaoLote(acao);
});


$(document).on('change', '.vf-check-aprov', function () {
	
	var total = $('.vf-check-aprov').length;
	var selecionados = $('.vf-check-aprov:checked').length;

	$('#vf-check-all-aprov').prop('checked', total === selecionados);

	ConsultaAprovacoes.atualizarBotaoLote();
});


$(document).on('change', '#vf-check-all-aprov', function () {
	
	var checked = $(this).is(':checked');

	$('.vf-check-aprov').prop('checked', checked);

	ConsultaAprovacoes.atualizarBotaoLote();
});


$(document).on('click', '.vf-aprovar', function () {
	
	var $tr = $(this).closest('tr');

	var dados = {
		nrSolicitacao: $tr.find('td:eq(8)').text().trim(),
		colaborador: $tr.find('td:eq(4)').text().trim(),
		data: $tr.find('td:eq(5)').text().trim(),
		projeto: $tr.find('td:eq(7)').text().trim(),
		tarefa: $tr.find('td:eq(3)').text().trim(),
		horas: $tr.find('td:eq(10)').text().trim()
	};

	TimesheetAprovacao.abrirModalAprovacao(dados);
});


$(document).on('click', '#fluig-modal-aprovacao [data-aprovar],#fluig-modal-aprovacao [data-reprovar],#fluig-modal-aprovacao [data-revisar]', function () {
	
	var acao = '';

	if ($(this).is('[data-aprovar]')) {
		acao = 'APROVAR';
	}

	if ($(this).is('[data-reprovar]')) {
		acao = 'REPROVAR';
	}

	if ($(this).is('[data-revisar]')) {
		acao = 'REVISAR';
	}

	TimesheetServices.executarAprovacao(acao);
});


$(document).on('click', '#btn-filtrar-aprov', function () {
	
	ConsultaAprovacoes.buscar();
});


$(document).on('change', '#vf-page-size', function () {
	
	var novoTamanho = parseInt($(this).val());

	ConsultaAprovacoes.pageSize = novoTamanho;
	ConsultaAprovacoes.pagina = 1;
	ConsultaAprovacoes.render();
});


$(document).on('click', '#btn-filtrar-aprov', function () {
	
	ConsultaAprovacoes.buscar();
});


$(document).on('click', '#btn-export-aprovacoes', function () {
	
	ConsultaAprovacoes.exportarExcel();
});

$(document).on('click', '#btn-export-aprovacao-massiva-excel', function () {
	
    TimesheetAprovacaoMassiva.exportarDetalhesExcel();
});


$(document).on('change', '#vf-page-size-aprov', function () {
	
	ConsultaAprovacoes.pageSize = parseInt($(this).val());
	ConsultaAprovacoes.pagina = 1;
	ConsultaAprovacoes.render();
});


$(document).on('click', '#ts-aprovacoes-pendentes', function () {

	var tipo = "matricula";
	var codigo = TimesheetServices.getUsuarioBase(tipo);

	var mes = TimesheetServices.carregaMesAno();
	var ano = mes.split("/")[1];
	mes = mes.split("/")[0];

	var codCompetencia = mes + "/" + ano;

	var c1 = DatasetFactory.createConstraint("MATRICULA", codigo, codigo, ConstraintType.MUST);
	var c2 = DatasetFactory.createConstraint("COMPETENCIA", codCompetencia, codCompetencia, ConstraintType.MUST);

	var ds = DatasetFactory.getDataset("ds_ts_horas_aprovacao", null, [c1, c2], null);

	TimesheetAprovacao.abrirDetalheProjetos(ds);
});


$(document).on('click', '#btnBuscarPendencias', function () {

	TimesheetServices.buscarPendencias();
});


$(document).on('click', '#btnIniciarAprovacaoMassiva', function () {

	TimesheetServices.iniciarAprovMassiva();
});


$(document).on('click', '#btnAtualizarHistoricoMassiva', function () {

	TimesheetAprovacaoMassiva.carregarHistorico();
});


$(document).ready(function () {
	
	// Inicializa filtro projeto
	TimesheetApontamento.initSelectProjeto($(document));

	// Inicializa filtro tarefa
	TimesheetApontamento.initSelectTarefa($(document));

	// Inicializa campo delegação
	TimesheetApontamento.initSelectDelegar();

});


$(document).on('click', '.vf-open-calendar-visualizacao', function () {
	
	calendarioSomenteLeitura = true;

	inputDataAtual = null;
	inputHoraAtual = null;

	TimesheetCalendario.abrirCalendario({
		readOnly: true,
		usuarioBase: "logado"
	});
});

$(document).on('click', '.vf-open-calendar-apont-visualizacao', function () {
	
	calendarioSomenteLeitura = true;

	inputDataAtual = null;
	inputHoraAtual = null;

	TimesheetCalendario.abrirCalendario({
		readOnly: true,
		usuarioBase: "delegacao"
	});
});


$(document).on('click', '#btn-export-apontamentos-excel', function () {
	
	TimesheetServices.exportarExcelDados(ConsultaApontamentos.dados);
});


$(document).on('click', '#fluig-modal-edicao [data-salvar]', function () {
	
	var $modal = $('#fluig-modal-edicao');

	TimesheetServices.executarEdicao($modal);
});


$(document).on('click', '#edit-data', function () {
	
	inputDataAtual = $(this);
	inputHoraAtual = null;

	TimesheetCalendario.abrirCalendario({
		usuarioBase: "delegacao"
	});
});


$(document).on('click', '#fluig-modal-cancelamento [data-confirmar]', function () {
	
	var $modal = $('#fluig-modal-cancelamento');
	var etapaMotivo = $modal.data('etapaMotivo') || false;

	// PRIMEIRO CLIQUE → MOSTRA MOTIVO
	if (!etapaMotivo) {
		$modal.find('#motivo-wrapper').show();
		$modal.data('etapaMotivo', true);
		return;
	}

	// SEGUNDO CLIQUE → VALIDAR
	var motivo = $modal.find('#motivo-cancelamento').val();

	if (!motivo) {
		FLUIGC.toast({
			title: "Atenção: ",
			message: "Informe o motivo do cancelamento",
			type: "warning",
			timeout: 5000
		});
		return;
	}

	var nrSolicitacao = $modal.data('nrSolicitacao');

	TimesheetServices.executarCancelamento(nrSolicitacao, motivo);
});


$(document).on('click', '.vf-excluir', function () {
	var nrSolicitacao = $(this).data('id');

	TimesheetApontamento.abrirModalCancelamento(nrSolicitacao);
});


$(document).on('click', '.vf-editar', function () {
	
	var $tr = $(this).closest('tr');

	var dados = {
		nrSolicitacao: $tr.find('td:eq(1)').text().trim(),
		data: $tr.find('td:eq(2)').text().trim(),
		nmProjeto: $tr.find('td:eq(3)').text().trim(),
		idProjeto: $tr.data('idprojeto') || '',
		codProjeto: $tr.find('td:eq(4)').text().trim(),
		nmTarefa: $tr.find('td:eq(5)').text().trim(),
		codTarefa: $tr.find('td:eq(6)').text().trim(),
		idISM: $tr.data('idism') || '',
		idTRF: $tr.data('idtrf') || '',
		observacao: $tr.data('observacao'),
		status: $tr.find('td:eq(7)').text().trim(),
		horas: $tr.find('td:eq(8)').text().trim(),
		aprovador: $tr.data('aprovador'),
		dataAprov: $tr.data('dataaprov'),
		hrAprov: $tr.data('hraprov'),
		statusAprov: $tr.data('statusaprov'),
		justificativa: $tr.data('justificativa')
	};

	TimesheetApontamento.abrirModalEdicao(dados);
});


$(document).on('click', '#btnAddApontHoras', function () {

	const $lastRow = $('#ts-apontamento-horas tbody tr:last');

	//=========================
	// Valores padrão
	//=========================
	let novaData = '';
	let horas = '';
	let observacao = '';

	let projetoText = '';
	let projetoId = '';
	let projetoCod = '';

	let tarefaText = '';
	let tarefaCod = '';
	let tarefaIdISM = '';
	let tarefaIdTRF = '';

	//=========================
	// Copiar dados da última linha
	//=========================
	if ($lastRow.length) {

		// Data
		const dataAtual = $lastRow.find('.vf-data-apontamento').val();

		if (dataAtual) {

			const parsedDate = TimesheetServices.vfParseDate(dataAtual);

			if (parsedDate) {

				const nextDate = TimesheetServices.vfAddDays(parsedDate, 1);

				novaData = TimesheetServices.vfFormatDate(nextDate);
			}
		}

		// Horas
		horas = $lastRow.find('.vf-horas-apontamento').val();

		// Observação
		observacao = $lastRow.find('.vf-obs-apontamento').val();

		// Projeto
		projetoText = $lastRow.find('.vf-zoom-projeto option:selected').text();
		projetoId = $lastRow.find('.vf-id-projeto-apontamento').val();
		projetoCod = $lastRow.find('.vf-cod-projeto-apontamento').val();

		// Tarefa
		tarefaText = $lastRow.find('.vf-zoom-tarefa option:selected').text();
		tarefaCod = $lastRow.find('.vf-cod-tarefa-apontamento').val();
		tarefaIdISM = $lastRow.find('.vf-idism-apontamento').val();
		tarefaIdTRF = $lastRow.find('.vf-idtrf-apontamento').val();
	}

	//=========================
	// Criar linha
	//=========================
	const $row = $(`
     <tr>
		
		 <td class="ts-linha-numero text-center"></td>
	
         <td>
             <select class="form-control vf-zoom-projeto" style="width:100%"></select>

             <input type="hidden" class="vf-id-projeto-apontamento">
             <input type="hidden" class="vf-cod-projeto-apontamento">
         </td>

         <td>
             <select class="form-control vf-zoom-tarefa" style="width:100%"></select>

             <input type="hidden" class="vf-cod-tarefa-apontamento">
             <input type="hidden" class="vf-idism-apontamento">
             <input type="hidden" class="vf-idtrf-apontamento">
         </td>

         <td>
             <div class="input-group">
                 <input 
                     type="text" 
                     class="form-control vf-data-apontamento" 
                     readonly
                     value="${novaData}">

                 <span class="input-group-addon vf-open-calendar-apontamento" style="cursor:pointer;">
                     <i class="flaticon flaticon-calendar"></i>
                 </span>
             </div>
         </td>

         <td>
             <input 
                 type="text" 
                 class="form-control vf-horas-apontamento" 
                 placeholder="00:00"
                 value="${horas}">

             <input type="hidden" class="form-control vf-hora-atual-apontamento">
         </td>

         <td>
             <input 
                 type="text" 
                 class="form-control vf-obs-apontamento" 
                 placeholder="Inserir observações"
                 value="${observacao}">
         </td>

         <td>
             <button class="btn btn-danger vf-remove-apontamento">
                 <i class="flaticon flaticon-close icon-sm" aria-hidden="true"></i>
             </button>
         </td>

     </tr>
 `);

	// Adiciona linha
	$('#ts-apontamento-horas tbody').append($row);
	
	TimesheetServices.renumerarTabelaHorasApontamento();

	// Máscara
	$row.find('.vf-horas-apontamento').mask('00:00');

	// Inicializa selects
	TimesheetApontamento.initSelectProjeto($row);

	TimesheetApontamento.initSelectTarefa($row);

	// Reatribui projeto
	if (projetoId) {

		const projetoOption = new Option(
			projetoText,
			projetoId,
			true,
			true
		);

		$row.find('.vf-zoom-projeto')
			.append(projetoOption)
			.trigger('change');

		$row.find('.vf-id-projeto-apontamento')
			.val(projetoId);

		$row.find('.vf-cod-projeto-apontamento')
			.val(projetoCod);
	}

	// Reatribui tarefa
	if (tarefaCod) {

		const tarefaOption = new Option(
			tarefaText,
			tarefaCod,
			true,
			true
		);

		$row.find('.vf-zoom-tarefa')
			.append(tarefaOption)
			.trigger('change');

		$row.find('.vf-cod-tarefa-apontamento')
			.val(tarefaCod);

		$row.find('.vf-idism-apontamento')
			.val(tarefaIdISM);

		$row.find('.vf-idtrf-apontamento')
			.val(tarefaIdTRF);
	}
});


$(document).on('click', '.vf-remove-apontamento', function () {
	$(this).closest('tr').remove();
	
	TimesheetServices.renumerarTabelaHorasApontamento();
});

$(document).on('click', '.vf-open-calendar-apontamento, .vf-data-apontamento', function () {
	var $row = $(this).closest('tr');

	inputDataAtual = $row.find('.vf-data-apontamento');
	inputHoraAtual = $row.find('.vf-hora-atual-apontamento');

	TimesheetCalendario.abrirCalendario({
		usuarioBase: "delegacao"
	});
});


$(document).on('click', '#btnEnviaHoras', function () {
	const $rows = $('#ts-apontamento-horas tbody tr');
	var tipo = "codigo";
	const idUsuario = TimesheetServices.getUsuarioBase(tipo);
	var tipo2 = "matricula";
	const matrUsuario = TimesheetServices.getUsuarioBase(tipo2);
	var codRM = TimesheetServices.obterCodRMParaApontamento();
	const competencia = $('#ts-fim-competencia').text();
	let idProjeto = "";
	let codProjeto = "";
	let idTarefa = "";
	let hrPrevista = "";

	var myLoading = FLUIGC.loading('#ts-apontamento-horas', {
		textMessage: 'Enviando apontamentos'
	});
	myLoading.show();

	setTimeout(function () {
		var c1 = DatasetFactory.createConstraint('CODIGO', idUsuario, idUsuario, ConstraintType.MUST);
		var tarefas = TimesheetDataset.getDataset('ds_ts_tarefas', [c1]);

		// VALIDA INSERÇÃO DE LINHA
		const erroLinhas = TimesheetServices.validarAddLinhaApont();

		if (erroLinhas.length > 0) {
			FLUIGC.toast({
				title: "Erro: ",
				message: erroLinhas.join("<br>"),
				type: "danger"
			});

			myLoading.hide();

			return;
		}

		$rows.each(function () {
			idProjeto = $(this).find('.vf-id-projeto-apontamento').val();
			codProjeto = $(this).find('.vf-cod-projeto-apontamento').val();
			idTarefa = $(this).find('.vf-cod-tarefa-apontamento').val();

			for (var i = 0; i < tarefas.values.length; i++) {
				var tarefa = tarefas.values[i].IDTAREFA;

				if (tarefa == idTarefa) {
					hrPrevista = tarefas.values[i].HORAPREVISTA;
				}
			}

			// VALIDA HORAS APONTADAS
			const errosHoras = TimesheetServices.validaTotalHorasApont(idUsuario, competencia, codProjeto, idTarefa, hrPrevista, $rows);

			if (errosHoras.length > 0) {
				FLUIGC.toast({
					title: "Erro: ",
					message: errosHoras.join("<br>"),
					type: "danger"
				});

				myLoading.hide();

				return;
			}

			// VALIDA MÊS ATUAL
			const errosMes = TimesheetServices.validarMesAtualApont($rows, competencia);

			if (errosMes.length > 0) {
				FLUIGC.toast({
					title: "Erro: ",
					message: errosMes.join("<br>"),
					type: "danger"
				});

				myLoading.hide();

				return;
			}

			// VALIDA CAMPOS
			const errosCampos = TimesheetServices.validarCamposApont($rows);

			if (errosCampos.length > 0) {
				FLUIGC.toast({
					title: "Erro: ",
					message: errosCampos.join("<br>"),
					type: "danger"
				});

				myLoading.hide();

				return;
			}

			const delegado = $('#delegar-apontamento').val();
			const nmUsuario = (!delegado || delegado === '')
				? $('#ts-usuario').text()
				: $('#delegar-apontamento-nome').val();
			//const nmUsuario   = $('#ts-usuario').text();

			let dtCompetencia = TimesheetServices.carregaMesAno();

			/*var retornoAprovador = TimesheetServices.obterAprovador(codProjeto);

			if (!retornoAprovador || retornoAprovador.success !== true) {
			    FLUIGC.toast({
			        title: "Erro: ",
			        message: retornoAprovador && retornoAprovador.message
			            ? retornoAprovador.message
			            : "Não foi possível obter os aprovadores do projeto " + idProjeto + ".",
			        type: "danger"
			    });

			    habilitarBotaoEnvioHoras();
			    
			    myLoading.hide();

			    return false;
			}

			var aprovador = retornoAprovador.aprovadores;
			var gestorContrato = retornoAprovador.gestor;*/
			var aprovador = "PS0108,AL04187,c4c0888e1b9a4840846cf3a6d19a7301,7a5f93fd5fa34b1d890c314e807383b5,389d76d65978460aabe7db6d21eac2ce";
			var gestorContrato = "WESLEY FALCON";

			const payload = {
				usuario: matrUsuario,
				codRM: codRM,
				nome: nmUsuario,
				competencia: dtCompetencia,
				aprovadores: aprovador.split(','),
				gestor: gestorContrato,
				apontamentos: []
			};

			const $projSelect = $(this).find('.vf-zoom-projeto');
			const nmProjeto = TimesheetServices.getTextoSelect2($projSelect);
			const $tarSelect = $(this).find('.vf-zoom-tarefa');
			const nmTarefa = TimesheetServices.getTextoSelect2($tarSelect);

			payload.apontamentos.push({
				nmProjeto: nmProjeto,
				idProjeto: idProjeto,
				codProjeto: codProjeto,
				nmTarefa: nmTarefa,
				idTarefa: idTarefa,
				idISM: $(this).find('.vf-idism-apontamento').val(),
				idTRF: $(this).find('.vf-idtrf-apontamento').val(),
				dtApontamento: $(this).find('.vf-data-apontamento').val(),
				situacao: "Pendente aprovação",
				horas: $(this).find('.vf-horas-apontamento').val(),
				observacao: $(this).find('.vf-obs-apontamento').val()
			});

			console.log("Payload:", payload);

			const origem = "apontamentos";

			TimesheetWorkflow.iniciarProcesso(payload, myLoading, origem);
		});
	}, 300);
});


$(document).on('select2:select', '#filtro-projeto', function (e) {
	
	var data = e.params.data;

	$('#filtro-id-projeto').val(data.id);
	$('#filtro-cod-projeto').val(data.codigo);

	// limpa tarefa (mesma lógica da linha)
	$('#filtro-tarefa').val(null).trigger('change');
	$('#filtro-cod-tarefa').val('');
});


$(document).on('select2:select', '#filtro-tarefa', function (e) {
	
	var data = e.params.data;

	$('#filtro-cod-tarefa').val(data.id);
});


id = "clear_event_proj"
$(document).on('select2:clear', '#filtro-projeto', function () {
	
	$('#filtro-id-projeto').val('');
	$('#filtro-cod-projeto').val('');

	// limpa tarefa junto
	$('#filtro-tarefa').val(null).trigger('change');
	$('#filtro-cod-tarefa').val('');
});


id = "clear_event_tarefa"
$(document).on('select2:clear', '#filtro-tarefa', function () {
	
	$('#filtro-cod-tarefa').val('');
});


$(document).on('click', '#btn-filtrar', function () {
	
	ConsultaApontamentos.buscar();
});


$(document).on('change', '#vf-page-size', function () {
	
	var novoTamanho = parseInt($(this).val());

	ConsultaApontamentos.pageSize = novoTamanho;
	ConsultaApontamentos.pagina = 1;

	ConsultaApontamentos.render();
});

/* =========================================================
   RELATÓRIO INFO USUÁRIOS
========================================================= */
$(document).off("click.infoUsuarios", "#btnFiltrarInfoUsuarios");
$(document).on("click.infoUsuarios", "#btnFiltrarInfoUsuarios", function () {
    TimesheetRelatorioInfoUsuarios.consultar();
});

$(document).off("click.infoUsuarios", "#btnAlertarPendenciasInfoUsuarios");
$(document).on("click.infoUsuarios", "#btnAlertarPendenciasInfoUsuarios", function () {
    TimesheetRelatorioInfoUsuarios.alertarPendencias();
});

$(document).off("click.infoUsuarios", "#btnExportarInfoUsuarios");
$(document).on("click.infoUsuarios", "#btnExportarInfoUsuarios", function () {
    TimesheetRelatorioInfoUsuarios.exportar();
});

$(document).off("click.infoUsuarios", ".btn-expandir-info-usuario");
$(document).on("click.infoUsuarios", ".btn-expandir-info-usuario", function () {
    TimesheetRelatorioInfoUsuarios.expandirLinha($(this));
});

$(document).off("click.infoUsuarios", ".btn-ajustar-conflito-info");
$(document).on("click.infoUsuarios", ".btn-ajustar-conflito-info", function () {
    TimesheetRelatorioInfoUsuarios.ajustarConflito($(this));
});

$(document).off("click.infoUsuarios", ".btn-revisar-conflito-info");
$(document).on("click.infoUsuarios", ".btn-revisar-conflito-info", function () {
    TimesheetRelatorioInfoUsuarios.revisarConflito($(this));
});

$(document).off("click.infoUsuarios", ".btn-cancelar-conflito-info");
$(document).on("click.infoUsuarios", ".btn-cancelar-conflito-info", function () {
    TimesheetRelatorioInfoUsuarios.cancelarConflito($(this));
});

$(document).off("click.infoUsuarios", "#fluig-modal-revisao-info [data-confirmar-revisao-info]");
$(document).on("click.infoUsuarios", "#fluig-modal-revisao-info [data-confirmar-revisao-info]", function () {
    TimesheetRelatorioInfoUsuarios.confirmarRevisaoConflito();
});

$(document).off("click.infoUsuarios", "#fluig-modal-cancelamento-info [data-confirmar-cancelamento-info]");
$(document).on("click.infoUsuarios", "#fluig-modal-cancelamento-info [data-confirmar-cancelamento-info]", function () {
    TimesheetRelatorioInfoUsuarios.confirmarCancelamentoConflito();
});

$(document).off("timesheet:infoUsuarios:ajusteSucesso.infoUsuarios");
$(document).on("timesheet:infoUsuarios:ajusteSucesso.infoUsuarios", function (event, payload, row) {
    TimesheetRelatorioInfoUsuarios.tratarAjusteSucesso(payload, row);
});

