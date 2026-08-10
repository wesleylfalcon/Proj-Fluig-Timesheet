// =====================================================
// Dataset: ds_ts_scheduler_criar_apontamentos_automaticos
// Objetivo: criar automaticamente apontamentos vindos do RM
//
// Arquitetura atual:
// - Sem mock.
// - Consulta RM INSUMOUNICO sem parâmetros, codSistema M.
// - Valida usuários no Fluig por e-mail antes de criar qualquer apontamento.
// - Se houver usuários RM sem matrícula Fluig, chama ds_ts_notifica_sem_matricula_fluig.
// - Faz DE/PARA entre RM INSUMOUNICO e GED dsApontamentoAutomatico por matrícula Fluig.
// - Busca aprovadores por projeto via ds_ts_aprovador_projeto.
// - Obtém CHAPA via ds_ts_usuario quando a INSUMOUNICO não retornar CHAPA.
// - Calcula dias úteis da competência e remove ausências RM por CHAPA.
// - Cria uma solicitação por usuário/projeto/tarefa com N apontamentos.
// =====================================================

var COD_SENTENCA_INSUMO_UNICO = "INSUMOUNICO";
var COD_SISTEMA_INSUMO_UNICO = "M";

var COD_SENTENCA_AUSENCIAS = "CONS.TIMESHEET.AUSENCIAS";
var COD_SISTEMA_AUSENCIAS = "P";

var COD_COLIGADA_RM = 1;

var HORAS_PADRAO_DIA = "08:00";

var DATASET_APROVADOR_PROJETO = "ds_ts_aprovador_projeto";
var DATASET_NOTIFICA_SEM_MATRICULA = "ds_ts_notifica_sem_matricula_fluig";
var DATASET_INICIA_SOLICITACAO = "ds_ts_inicia_solicitacao";
var DATASET_CADASTRO_AUTO = "dsApontamentoAutomatico";
var DATASET_USUARIO_RM = "ds_ts_usuario";

// Segurança operacional:
// - Em execução manual via createDataset, envie DRY_RUN=NAO para criar.
// - Em onSync deixei DRY_RUN=SIM por segurança. Altere para NAO somente após validação em HML.
var DEFAULT_DRY_RUN_ONSYNC = "SIM";

function defineStructure() {
    addColumn("STATUS");
    addColumn("MESSAGE");
    addColumn("TOTAL_RM");
    addColumn("TOTAL_GED");
    addColumn("CRIADAS");
    addColumn("IGNORADAS");
    addColumn("ERROS");
    addColumn("DRY_RUN");
    addColumn("ORIGEM");
    addColumn("EXECUTION_ID");
    addColumn("COMPETENCIA");
    addColumn("SOLICITACAO");
    addColumn("EMAIL_COLABORADOR");
    addColumn("NOME_COLABORADOR");
    addColumn("MATRICULA_FLUIG");
    addColumn("CHAPA");
    addColumn("CODPRJ");
    addColumn("IDPRJ");
    addColumn("CODTRF");
    addColumn("QTD_DIAS");
    addColumn("PAYLOAD_JSON");

    setKey(["STATUS", "MESSAGE", "EXECUTION_ID"]);
}

function onSync(lastSyncDate) {
    var constraints = [];

    constraints.push(DatasetFactory.createConstraint(
        "DRY_RUN",
        DEFAULT_DRY_RUN_ONSYNC,
        DEFAULT_DRY_RUN_ONSYNC,
        ConstraintType.MUST
    ));

    constraints.push(DatasetFactory.createConstraint(
        "COMPETENCIA",
        obterCompetenciaAtual(),
        obterCompetenciaAtual(),
        ConstraintType.MUST
    ));

    return executarDataset(null, constraints, null);
}

function createDataset(fields, constraints, sortFields) {
    return executarDataset(fields, constraints, sortFields);
}

function executarDataset(fields, constraints, sortFields) {
    var dataset = criarDatasetRetorno();

    var dryRun = "SIM";//String(getConstraint(constraints, "DRY_RUN") || "SIM").toUpperCase();
    var competencia = "03/2026";//String(getConstraint(constraints, "COMPETENCIA") || "").trim();
    var limite = "2";//parseInt(getConstraint(constraints, "LIMITE") || "0", 10);
    var executionId = gerarExecutionId();

    var totalRM = 0;
    var totalGED = 0;
    var criadas = 0;
    var ignoradas = 0;
    var erros = 0;

    try {
        if (dryRun !== "SIM" && dryRun !== "NAO") {
            throw "Constraint DRY_RUN inválida. Use SIM ou NAO.";
        }

        if (!competencia || !/^\d{2}\/\d{4}$/.test(competencia)) {
            throw "Constraint COMPETENCIA obrigatória no formato MM/AAAA.";
        }

        logInfoExec(executionId, "START | COMPETENCIA=" + competencia + " | DRY_RUN=" + dryRun);

        var cadastroGED = consultarCadastroApontamentoAutomatico();
        totalGED = cadastroGED.length;

        if (totalGED === 0) {
            addLinhaRetorno(dataset, {
                status: "ERRO",
                message: "Cadastro GED dsApontamentoAutomatico não retornou usuários. Nenhum apontamento foi criado.",
                totalRM: totalRM,
                totalGED: totalGED,
                criadas: criadas,
                ignoradas: ignoradas,
                erros: 1,
                dryRun: dryRun,
                origem: "GED",
                executionId: executionId,
                competencia: competencia
            });
            
            logErrorExec(executionId, "ERRO: Cadastro GED dsApontamentoAutomatico não retornou usuários. Nenhum apontamento foi criado.");

            return dataset;
        }

        var mapaCadastroGED = montarMapaCadastroPorMatricula(cadastroGED);

        var registrosRM = consultarInsumoUnicoRM();
        totalRM = registrosRM.length;

        if (totalRM === 0) {
            addLinhaRetorno(dataset, {
                status: "OK",
                message: "Nenhum registro retornado pela consulta RM INSUMOUNICO.",
                totalRM: totalRM,
                totalGED: totalGED,
                criadas: 0,
                ignoradas: 0,
                erros: 0,
                dryRun: dryRun,
                origem: "RM",
                executionId: executionId,
                competencia: competencia
            });
            
            logInfoExec(executionId, "Nenhum registro retornado pela consulta RM INSUMOUNICO.");

            return dataset;
        }

        var validacaoEstruturalRM = validarCamposObrigatoriosRM(registrosRM);

        if (validacaoEstruturalRM.erros.length > 0) {
            erros = validacaoEstruturalRM.erros.length;

            addLinhaRetorno(dataset, {
                status: "ERRO",
                message: "Registros RM com dados obrigatórios ausentes. Nenhum apontamento foi criado.",
                totalRM: totalRM,
                totalGED: totalGED,
                criadas: 0,
                ignoradas: 0,
                erros: erros,
                dryRun: dryRun,
                origem: "RM",
                executionId: executionId,
                competencia: competencia,
                payloadJson: JSON.stringify(validacaoEstruturalRM.erros)
            });
            
            logErrorExec(executionId, "ERRO: Registros RM com dados obrigatórios ausentes. Nenhum apontamento foi criado.");

            return dataset;
        }

        var validacaoUsuarios = validarUsuariosFluig(registrosRM);

        if (validacaoUsuarios.usuariosNaoEncontrados.length > 0) {
            notificarUsuariosSemMatriculaFluig(
                validacaoUsuarios.usuariosNaoEncontrados,
                competencia,
                executionId
            );

            erros = validacaoUsuarios.usuariosNaoEncontrados.length;

            addLinhaRetorno(dataset, {
                status: "ERRO",
                message: "Existem colaboradores do RM sem usuário correspondente no Fluig. Nenhum apontamento foi criado. Total: "
                    + validacaoUsuarios.usuariosNaoEncontrados.length,
                totalRM: totalRM,
                totalGED: totalGED,
                criadas: 0,
                ignoradas: 0,
                erros: erros,
                dryRun: dryRun,
                origem: "VALIDACAO_USUARIO_FLUIG",
                executionId: executionId,
                competencia: competencia,
                payloadJson: JSON.stringify(validacaoUsuarios.usuariosNaoEncontrados)
            });
            
            logErrorExec(executionId, "ERRO: Existem colaboradores do RM sem usuário correspondente no Fluig. Nenhum apontamento foi criado. Total: "+validacaoUsuarios.usuariosNaoEncontrados.length);

            return dataset;
        }

        registrosRM = validacaoUsuarios.registrosRM;

        var validacaoChapas = validarChapasUsuariosRM(registrosRM);

        if (validacaoChapas.erros.length > 0) {
            erros = validacaoChapas.erros.length;

            addLinhaRetorno(dataset, {
                status: "ERRO",
                message: "Não foi possível obter a CHAPA de todos os colaboradores via " + DATASET_USUARIO_RM + ". Nenhum apontamento foi criado.",
                totalRM: totalRM,
                totalGED: totalGED,
                criadas: 0,
                ignoradas: 0,
                erros: erros,
                dryRun: dryRun,
                origem: "VALIDACAO_CHAPA_RM",
                executionId: executionId,
                competencia: competencia,
                payloadJson: JSON.stringify(validacaoChapas.erros)
            });

            logErrorExec(executionId, "ERRO: Não foi possível obter a CHAPA de todos os colaboradores via " + DATASET_USUARIO_RM + ". Nenhum apontamento foi criado.");

            return dataset;
        }

        registrosRM = validacaoChapas.registrosRM;

        var validacaoAprovadores = validarAprovadoresProjetos(registrosRM);

        if (validacaoAprovadores.erros.length > 0) {
            erros = validacaoAprovadores.erros.length;

            addLinhaRetorno(dataset, {
                status: "ERRO",
                message: "Erro ao validar aprovadores. Nenhum apontamento foi criado.",
                totalRM: totalRM,
                totalGED: totalGED,
                criadas: 0,
                ignoradas: 0,
                erros: erros,
                dryRun: dryRun,
                origem: "VALIDACAO_APROVADORES",
                executionId: executionId,
                competencia: competencia,
                payloadJson: JSON.stringify(validacaoAprovadores.erros)
            });
            
            logErrorExec(executionId, "ERRO: Erro ao validar aprovadores. Nenhum apontamento foi criado.");

            return dataset;
        }

        var mapaAprovadoresPorProjeto = validacaoAprovadores.mapaAprovadoresPorProjeto;

        for (var i = 0; i < registrosRM.length; i++) {
            if (limite > 0 && criadas >= limite) {
                addLinhaRetorno(dataset, {
                    status: "LIMITE_ATINGIDO",
                    message: "Limite de criação atingido. LIMITE=" + limite,
                    totalRM: totalRM,
                    totalGED: totalGED,
                    criadas: criadas,
                    ignoradas: ignoradas,
                    erros: erros,
                    dryRun: dryRun,
                    origem: "CONTROLE",
                    executionId: executionId,
                    competencia: competencia
                });
                
                logInfoExec(executionId, "Limite de criação atingido. LIMITE=" + limite);

                break;
            }

            var rm = registrosRM[i];
            var cadastroUsuario = mapaCadastroGED[rm.matriculaFluig];

            if (!cadastroUsuario) {
                ignoradas++;

                addLinhaRetorno(dataset, {
                    status: "IGNORADO",
                    message: "Usuário existe no RM/Fluig, mas não está no cadastro GED dsApontamentoAutomatico.",
                    totalRM: totalRM,
                    totalGED: totalGED,
                    criadas: criadas,
                    ignoradas: ignoradas,
                    erros: erros,
                    dryRun: dryRun,
                    origem: "DE_PARA_GED_RM",
                    executionId: executionId,
                    competencia: competencia,
                    emailColaborador: rm.email,
                    nomeColaborador: rm.nomeFuncionario,
                    matriculaFluig: rm.matriculaFluig,
                    chapa: rm.chapa,
                    codPrj: rm.codPrj,
                    idPrj: rm.idPrj,
                    codTrf: rm.codTrf
                });
                
                logInfoExec(executionId, "Usuário existe no RM/Fluig, mas não está no cadastro GED dsApontamentoAutomatico.");

                continue;
            }

            var diasDisponiveis = obterDiasDisponiveisUsuario(rm.chapa, competencia);

            if (diasDisponiveis.length === 0) {
                ignoradas++;

                addLinhaRetorno(dataset, {
                    status: "IGNORADO",
                    message: "Nenhum dia disponível para apontamento após descontar ausências.",
                    totalRM: totalRM,
                    totalGED: totalGED,
                    criadas: criadas,
                    ignoradas: ignoradas,
                    erros: erros,
                    dryRun: dryRun,
                    origem: "DIAS_DISPONIVEIS",
                    executionId: executionId,
                    competencia: competencia,
                    emailColaborador: rm.email,
                    nomeColaborador: rm.nomeFuncionario,
                    matriculaFluig: rm.matriculaFluig,
                    chapa: rm.chapa,
                    codPrj: rm.codPrj,
                    idPrj: rm.idPrj,
                    codTrf: rm.codTrf,
                    qtdDias: 0
                });
                
                logInfoExec(executionId, "Nenhum dia disponível para apontamento após descontar ausências.");

                continue;
            }

            var aprovadores = mapaAprovadoresPorProjeto[rm.codPrj];

            var payload = montarPayloadAutomatico(
                rm,
                cadastroUsuario,
                diasDisponiveis,
                competencia,
                dadosAprovacao.aprovadores,
                dadosAprovacao.gestor
            );

            if (dryRun === "SIM") {
                ignoradas++;

                addLinhaRetorno(dataset, {
                    status: "DRY_RUN",
                    message: "Payload montado. Solicitação não criada.",
                    totalRM: totalRM,
                    totalGED: totalGED,
                    criadas: criadas,
                    ignoradas: ignoradas,
                    erros: erros,
                    dryRun: dryRun,
                    origem: "DRY_RUN",
                    executionId: executionId,
                    competencia: competencia,
                    emailColaborador: rm.email,
                    nomeColaborador: rm.nomeFuncionario,
                    matriculaFluig: rm.matriculaFluig,
                    chapa: rm.chapa,
                    codPrj: rm.codPrj,
                    idPrj: rm.idPrj,
                    codTrf: rm.codTrf,
                    qtdDias: diasDisponiveis.length,
                    payloadJson: JSON.stringify(payload)
                });
                
                logInfoExec(executionId, "Payload montado. Solicitação não criada.");

                continue;
            }

            var retorno = iniciarSolicitacao(payload, executionId);

            if (retorno.status === "OK") {
                criadas++;

                addLinhaRetorno(dataset, {
                    status: "OK",
                    message: retorno.message || "Solicitação criada com sucesso.",
                    totalRM: totalRM,
                    totalGED: totalGED,
                    criadas: criadas,
                    ignoradas: ignoradas,
                    erros: erros,
                    dryRun: dryRun,
                    origem: "CRIACAO",
                    executionId: executionId,
                    competencia: competencia,
                    solicitacao: retorno.solicitacao,
                    emailColaborador: rm.email,
                    nomeColaborador: rm.nomeFuncionario,
                    matriculaFluig: rm.matriculaFluig,
                    chapa: rm.chapa,
                    codPrj: rm.codPrj,
                    idPrj: rm.idPrj,
                    codTrf: rm.codTrf,
                    qtdDias: diasDisponiveis.length
                });
                
                
                logInfoExec(executionId, retorno.message || "Solicitação criada com sucesso.");

            } else {
                erros++;

                addLinhaRetorno(dataset, {
                    status: "ERRO",
                    message: retorno.message || "Erro ao criar solicitação.",
                    totalRM: totalRM,
                    totalGED: totalGED,
                    criadas: criadas,
                    ignoradas: ignoradas,
                    erros: erros,
                    dryRun: dryRun,
                    origem: "CRIACAO",
                    executionId: executionId,
                    competencia: competencia,
                    solicitacao: retorno.solicitacao,
                    emailColaborador: rm.email,
                    nomeColaborador: rm.nomeFuncionario,
                    matriculaFluig: rm.matriculaFluig,
                    chapa: rm.chapa,
                    codPrj: rm.codPrj,
                    idPrj: rm.idPrj,
                    codTrf: rm.codTrf,
                    qtdDias: diasDisponiveis.length
                });
                
                logErrorExec(executionId, retorno.message || "Erro ao criar solicitação.");
            }
        }

        addLinhaRetorno(dataset, {
            status: "RESUMO",
            message: "TotalRM=" + totalRM
                + " | TotalGED=" + totalGED
                + " | Criadas=" + criadas
                + " | Ignoradas=" + ignoradas
                + " | Erros=" + erros
                + " | DRY_RUN=" + dryRun,
            totalRM: totalRM,
            totalGED: totalGED,
            criadas: criadas,
            ignoradas: ignoradas,
            erros: erros,
            dryRun: dryRun,
            origem: "RESUMO",
            executionId: executionId,
            competencia: competencia
        });
        
        logInfoExec(executionId, "RESUMO: TotalRM=" + totalRM
            + " | TotalGED=" + totalGED
            + " | Criadas=" + criadas
            + " | Ignoradas=" + ignoradas
            + " | Erros=" + erros
            + " | DRY_RUN=" + dryRun);

    } catch (e) {
        erros++;

        addLinhaRetorno(dataset, {
            status: "ERRO",
            message: getErrorMessage(e),
            totalRM: totalRM,
            totalGED: totalGED,
            criadas: criadas,
            ignoradas: ignoradas,
            erros: erros,
            dryRun: dryRun,
            origem: "EXCEPTION",
            executionId: executionId,
            competencia: competencia
        });

        logErrorExec(executionId, "EXCEPTION | " + getErrorMessage(e));
    }

    return dataset;
}

// =====================================================
// Consulta RM
// =====================================================
function consultarInsumoUnicoRM() {
    var result = executarConsultaSQLRM(
        COD_SENTENCA_INSUMO_UNICO,
        COD_COLIGADA_RM,
        COD_SISTEMA_INSUMO_UNICO,
        ""
    );

    return parseInsumoUnicoRM(result);
}

function consultarAusenciasRM(chapa, competencia) {
    if (!chapa) {
        throw "CHAPA não informada para consultar ausências.";
    }

    var result = executarConsultaSQLRM(
        COD_SENTENCA_AUSENCIAS,
        COD_COLIGADA_RM,
        COD_SISTEMA_AUSENCIAS,
        "CHAPA=" + chapa
    );

    return parseAusenciasRM(result, competencia);
}

function executarConsultaSQLRM(codSentenca, codColigada, codSistema, parametros) {
    var credenciais = getCredenciais();
    var username = credenciais[0];
    var password = credenciais[1];

    if (!username || !password) {
        throw "Credenciais RM não localizadas.";
    }

    var service = ServiceManager.getServiceInstance("wsConsultaSQL");
    var instancia = service.instantiate("com.totvs.WsConsultaSQL");
    var ws = instancia.getRMIwsConsultaSQL();
    var helper = service.getBean();

    var client = helper.getBasicAuthenticatedClient(
        ws,
        "com.totvs.IwsConsultaSQL",
        username,
        password
    );

    return client.realizarConsultaSQL(
        codSentenca,
        codColigada,
        codSistema,
        parametros || ""
    );
}

function parseInsumoUnicoRM(xmlString) {
    var registros = [];

    if (!xmlString) {
        return registros;
    }

    var xml = new XML(xmlString);

    for each (var row in xml.Resultado) {
        registros.push({
            email: safe(getXmlChildValue(row, "EMAIL")).toLowerCase(),
            nomeFuncionario: getXmlChildValue(row, "NOME_FUNCIONARIO"),
            tipoVinculo: getXmlChildValue(row, "TIPO_VINCULO"),
            chapa: getXmlChildValue(row, "CHAPA"),
            codPrj: getXmlChildValue(row, "CODPRJ"),
            nomeProjeto: getXmlChildValue(row, "NOME_PROJETO"),
            codTrf: getXmlChildValue(row, "CODTRF"),
            nomeTarefa: getXmlChildValue(row, "NOME_TAREFA"),
            idPrj: getXmlChildValue(row, "IDPRJ"),
            matriculaFluig: "",
            nomeFluig: ""
        });
    }

    return registros;
}

function parseAusenciasRM(xmlString, competencia) {
    var ausencias = [];

    if (!xmlString) {
        return ausencias;
    }

    var xml = new XML(xmlString);

    for each (var row in xml.Resultado) {
        var dia = normalizarDataBR(getXmlChildValue(row, "DIA"));

        if (obterCompetenciaPorDataBR(dia) !== competencia) {
            continue;
        }

        ausencias.push({
            codColigada: getXmlChildValue(row, "CODCOLIGADA"),
            chapa: getXmlChildValue(row, "CHAPA"),
            nome: getXmlChildValue(row, "NOME"),
            tipo: getXmlChildValue(row, "TIPO"),
            evento: getXmlChildValue(row, "EVENTO"),
            dia: dia,
            horas: normalizarHora(getXmlChildValue(row, "HORAS"))
        });
    }

    return ausencias;
}

function getXmlChildValue(row, tagName) {
    try {
        var value = row[tagName].toString();

        if (value === null || value === undefined) {
            return "";
        }

        return String(value).trim();

    } catch (e) {
        return "";
    }
}

// =====================================================
// GED - Cadastro de usuários habilitados para automático
// =====================================================
function consultarCadastroApontamentoAutomatico() {
    var ds = DatasetFactory.getDataset(
        DATASET_CADASTRO_AUTO,
        null,
        null,
        null
    );

    var registros = [];

    if (!ds || ds.rowsCount === 0) {
        return registros;
    }

    for (var i = 0; i < ds.rowsCount; i++) {
        var nmUsuario = safe(getDatasetValue(ds, i, ["nmUsuario", "NMUSUARIO", "nomeUsuario", "NOMEUSUARIO"]));
        var matrUsuario = safe(getDatasetValue(ds, i, ["matrUsuario", "MATRUSUARIO", "matricula", "MATRICULA"]));

        if (matrUsuario !== "") {
            registros.push({
                nmUsuario: nmUsuario,
                matrUsuario: matrUsuario
            });
        }
    }

    return registros;
}

function montarMapaCadastroPorMatricula(registros) {
    var mapa = {};

    for (var i = 0; i < registros.length; i++) {
        var matricula = safe(registros[i].matrUsuario);

        if (matricula !== "") {
            mapa[matricula] = registros[i];
        }
    }

    return mapa;
}

// =====================================================
// Validação de usuários Fluig
// =====================================================
function validarCamposObrigatoriosRM(registrosRM) {
    var erros = [];

    for (var i = 0; i < registrosRM.length; i++) {
        var rm = registrosRM[i];
        var prefixo = "Linha RM " + (i + 1) + " | EMAIL=" + safe(rm.email) + " | ";

        if (!rm.email) {
            erros.push(prefixo + "EMAIL não informado.");
        }

        if (!rm.nomeFuncionario) {
            erros.push(prefixo + "NOME_FUNCIONARIO não informado.");
        }

        // CHAPA não é obrigatória no retorno da INSUMOUNICO.
        // Ela será enriquecida depois via dataset ds_ts_usuario, usando o e-mail do colaborador.

        if (!rm.codPrj) {
            erros.push(prefixo + "CODPRJ não informado.");
        }

        if (!rm.nomeProjeto) {
            erros.push(prefixo + "NOME_PROJETO não informado.");
        }

        if (!rm.codTrf) {
            erros.push(prefixo + "CODTRF não informado.");
        }

        if (!rm.nomeTarefa) {
            erros.push(prefixo + "NOME_TAREFA não informada.");
        }

        if (!rm.idPrj) {
            erros.push(prefixo + "IDPRJ não informado.");
        }
    }

    return {
        erros: erros
    };
}

function validarUsuariosFluig(registrosRM) {
    var usuariosNaoEncontrados = [];
    var registrosValidos = [];
    var cacheEmail = {};

    for (var i = 0; i < registrosRM.length; i++) {
        var rm = registrosRM[i];
        var email = safe(rm.email).toLowerCase();

        var usuarioFluig = null;

        if (cacheEmail[email] !== undefined) {
            usuarioFluig = cacheEmail[email];
        } else {
            usuarioFluig = buscarUsuarioFluigPorEmail(email);
            cacheEmail[email] = usuarioFluig;
        }

        if (!usuarioFluig || !usuarioFluig.matricula) {
            usuariosNaoEncontrados.push({
                email: email,
                nomeFuncionario: rm.nomeFuncionario,
                chapa: rm.chapa,
                codPrj: rm.codPrj,
                codTrf: rm.codTrf,
                motivo: "Usuário não encontrado no Fluig pelo e-mail retornado pela consulta INSUMOUNICO."
            });

            continue;
        }

        rm.matriculaFluig = usuarioFluig.matricula;
        rm.nomeFluig = usuarioFluig.nome;

        registrosValidos.push(rm);
    }

    return {
        usuariosNaoEncontrados: removerDuplicadosObjetos(usuariosNaoEncontrados, "email"),
        registrosRM: registrosValidos
    };
}

function validarChapasUsuariosRM(registrosRM) {
    var erros = [];
    var registrosValidos = [];
    var cacheChapaPorEmail = {};

    for (var i = 0; i < registrosRM.length; i++) {
        var rm = registrosRM[i];
        var email = safe(rm.email).toLowerCase();

        if (safe(rm.chapa) !== "") {
            registrosValidos.push(rm);
            continue;
        }

        var usuarioRM = null;

        if (cacheChapaPorEmail[email] !== undefined) {
            usuarioRM = cacheChapaPorEmail[email];
        } else {
            usuarioRM = buscarUsuarioRMPorEmail(email);
            cacheChapaPorEmail[email] = usuarioRM;
        }

        if (!usuarioRM || safe(usuarioRM.chapa) === "") {
            erros.push({
                email: email,
                nomeFuncionario: rm.nomeFuncionario,
                matriculaFluig: rm.matriculaFluig,
                codPrj: rm.codPrj,
                codTrf: rm.codTrf,
                motivo: "CHAPA não localizada no dataset " + DATASET_USUARIO_RM + " pelo e-mail do colaborador."
            });

            continue;
        }

        rm.chapa = usuarioRM.chapa;
        rm.codRM = usuarioRM.chapa;

        registrosValidos.push(rm);
    }

    return {
        erros: removerDuplicadosObjetos(erros, "email"),
        registrosRM: registrosValidos
    };
}

function buscarUsuarioRMPorEmail(email) {
    email = safe(email).toLowerCase();

    if (email === "") {
        return null;
    }

    var tentativasCampoEmail = ["EMAIL", "email", "mail"];

    for (var i = 0; i < tentativasCampoEmail.length; i++) {
        var campoEmail = tentativasCampoEmail[i];

        var constraints = [];
        constraints.push(
            DatasetFactory.createConstraint(
                campoEmail,
                email,
                email,
                ConstraintType.MUST
            )
        );

        var ds = DatasetFactory.getDataset(
            DATASET_USUARIO_RM,
            null,
            constraints,
            null
        );

        if (!ds || ds.rowsCount === 0) {
            continue;
        }

        var status = safe(getDatasetValue(ds, 0, ["STATUS", "status"]));
        var message = safe(getDatasetValue(ds, 0, ["MESSAGE", "message", "ERRO", "erro"]));

        if (status !== "" && status !== "OK") {
            return {
                chapa: "",
                message: message || ("Dataset " + DATASET_USUARIO_RM + " retornou status " + status + ".")
            };
        }

        var chapa = safe(getDatasetValue(ds, 0, [
             "CODIGO",
             "codigo",
             "CHAPA",
             "chapa",
             "CODRM",
             "codRM",
             "codRm",
             "COD_RM",
             "CODUSUARIO",
             "codUsuario"
         ]));

        if (chapa !== "") {
            return {
                chapa: chapa,
                email: safe(getDatasetValue(ds, 0, ["EMAIL", "email", "mail"])),
                nome: safe(getDatasetValue(ds, 0, ["NOME", "nome", "NOME_FUNCIONARIO", "nomeFuncionario"]))
            };
        }
    }

    return null;
}

function buscarUsuarioFluigPorEmail(email) {
    if (!email) {
        return null;
    }

    var constraints = [];

    constraints.push(
        DatasetFactory.createConstraint(
            "mail",
            String(email),
            String(email),
            ConstraintType.MUST
        )
    );

    var ds = DatasetFactory.getDataset(
        "colleague",
        null,
        constraints,
        null
    );

    if (!ds || ds.rowsCount === 0) {
        return null;
    }

    return {
        matricula: safe(ds.getValue(0, "colleaguePK.colleagueId")),
        nome: safe(ds.getValue(0, "colleagueName")),
        email: safe(ds.getValue(0, "mail"))
    };
}

// =====================================================
// Notificação de usuários RM sem matrícula Fluig
// =====================================================
function notificarUsuariosSemMatriculaFluig(usuariosNaoEncontrados, competencia, executionId) {
    var payload = {
        competencia: competencia,
        executionId: executionId,
        total: usuariosNaoEncontrados.length,
        usuarios: usuariosNaoEncontrados
    };

    var constraints = [];

    constraints.push(
        DatasetFactory.createConstraint(
            "COMPETENCIA",
            competencia,
            competencia,
            ConstraintType.MUST
        )
    );

    constraints.push(
        DatasetFactory.createConstraint(
            "EXECUTION_ID",
            executionId,
            executionId,
            ConstraintType.MUST
        )
    );

    constraints.push(
        DatasetFactory.createConstraint(
            "DATA_JSON",
            JSON.stringify(payload),
            JSON.stringify(payload),
            ConstraintType.MUST
        )
    );

    try {
        var ds = DatasetFactory.getDataset(
            DATASET_NOTIFICA_SEM_MATRICULA,
            null,
            constraints,
            null
        );

        if (!ds || ds.rowsCount === 0) {
            logWarnExec(
                executionId,
                "Dataset " + DATASET_NOTIFICA_SEM_MATRICULA + " não retornou dados."
            );

            return;
        }

        var status = safe(ds.getValue(0, "STATUS"));
        var message = safe(ds.getValue(0, "MESSAGE"));

        logInfoExec(
            executionId,
            "NOTIFICACAO_SEM_MATRICULA | STATUS=" + status + " | MESSAGE=" + message
        );

    } catch (e) {
        logErrorExec(
            executionId,
            "ERRO_NOTIFICACAO_SEM_MATRICULA | " + getErrorMessage(e)
        );
    }
}

// =====================================================
// Aprovadores
// =====================================================
function validarAprovadoresProjetos(registrosRM) {
    var mapaAprovadoresPorProjeto = {};
    var erros = [];

    for (var i = 0; i < registrosRM.length; i++) {
        var codPrj = safe(registrosRM[i].codPrj);

        if (!codPrj) {
            erros.push("Registro RM sem CODPRJ para o e-mail " + safe(registrosRM[i].email));
            continue;
        }

        if (mapaAprovadoresPorProjeto[codPrj]) {
            continue;
        }

        var retorno = obterAprovadoresProjeto(codPrj);

        if (!retorno.success) {
            erros.push(retorno.message);
            continue;
        }

        mapaAprovadoresPorProjeto[codPrj] = {
    	    aprovadores: retorno.aprovadores,
    	    gestor: retorno.gestor
    	};
    }

    return {
        mapaAprovadoresPorProjeto: mapaAprovadoresPorProjeto,
        erros: erros
    };
}

function obterAprovadoresProjeto(codPrj) {
    var constraints = [];

    constraints.push(
        DatasetFactory.createConstraint(
            "CODPRJ",
            codPrj,
            codPrj,
            ConstraintType.MUST
        )
    );

    var ds = DatasetFactory.getDataset(
        DATASET_APROVADOR_PROJETO,
        null,
        constraints,
        null
    );

    if (!ds || ds.rowsCount === 0) {
        return {
            success: false,
            aprovadores: "",
            message: "Dataset " + DATASET_APROVADOR_PROJETO + " não retornou aprovadores para o projeto " + codPrj + "."
        };
    }

    var erro = safe(ds.getValue(0, "ERRO"));

    if (erro !== "") {
        return {
            success: false,
            aprovadores: "",
            message: "Erro ao buscar aprovadores do projeto " + codPrj + ": " + erro
        };
    }

    var aprovadores = safe(ds.getValue(0, "APROVADORES"));

    if (aprovadores === "") {
        return {
            success: false,
            aprovadores: "",
            message: "Projeto " + codPrj + " sem aprovadores retornados."
        };
    }

    var gestor = safe(ds.getValue(0, "GESTOR"));

    return {
        success: true,
        aprovadores: aprovadores,
        gestor: gestor,
        message: ""
    };
}

// =====================================================
// Dias úteis e ausências
// =====================================================
function obterDiasDisponiveisUsuario(chapa, competencia) {
    var diasUteis = obterDiasUteisCompetencia(competencia);
    var ausencias = consultarAusenciasRM(chapa, competencia);

    var mapaAusencias = {};

    for (var i = 0; i < ausencias.length; i++) {
        if (ausencias[i].dia) {
            mapaAusencias[ausencias[i].dia] = true;
        }
    }

    var disponiveis = [];

    for (var j = 0; j < diasUteis.length; j++) {
        if (!mapaAusencias[diasUteis[j]]) {
            disponiveis.push(diasUteis[j]);
        }
    }

    return disponiveis;
}

function obterDiasUteisCompetencia(competencia) {
    var partes = String(competencia || "").split("/");

    if (partes.length !== 2) {
        throw "Competência inválida: " + competencia + ". Use MM/AAAA.";
    }

    var mes = parseInt(partes[0], 10);
    var ano = parseInt(partes[1], 10);

    if (isNaN(mes) || isNaN(ano) || mes < 1 || mes > 12) {
        throw "Competência inválida: " + competencia + ". Use MM/AAAA.";
    }

    var dias = [];
    var ultimoDia = new Date(ano, mes, 0).getDate();

    for (var dia = 1; dia <= ultimoDia; dia++) {
        var data = new Date(ano, mes - 1, dia);
        var diaSemana = data.getDay();

        if (diaSemana !== 0 && diaSemana !== 6) {
            dias.push(pad2(dia) + "/" + pad2(mes) + "/" + ano);
        }
    }

    return dias;
}

// =====================================================
// Payload e criação
// =====================================================
function montarPayloadAutomatico(rm, cadastroUsuario, diasDisponiveis, competencia, aprovadores, gestor) {
    var apontamentos = [];

    for (var i = 0; i < diasDisponiveis.length; i++) {
        apontamentos.push({
            nmProjeto: rm.nomeProjeto,
            idProjeto: rm.idPrj,
            codProjeto: rm.codPrj,
            nmTarefa: rm.nomeTarefa,
            idTarefa: rm.codTrf,
            codTarefa: rm.codTrf,
            dtApontamento: diasDisponiveis[i],
            situacao: "Pendente aprovação",
            horas: HORAS_PADRAO_DIA,
            observacao: "Apontamento criado automaticamente pelo agendador mensal."
        });
    }

    return {
        usuario: rm.matriculaFluig,
        codRM: rm.chapa,
        nome: rm.nomeFluig || rm.nomeFuncionario || cadastroUsuario.nmUsuario,
        competencia: competencia,
        aprovadores: splitAprovadores(aprovadores),
        gestor: gestor,
        apontamentos: apontamentos
    };
}

function splitAprovadores(aprovadores) {
    var lista = [];
    var partes = String(aprovadores || "").split(",");

    for (var i = 0; i < partes.length; i++) {
        var valor = safe(partes[i]).trim();

        if (valor !== "") {
            lista.push(valor);
        }
    }

    return lista;
}

function iniciarSolicitacao(payload, executionId) {
    try {
        var dataJson = JSON.stringify(payload);
        var constraints = [];

        constraints.push(
            DatasetFactory.createConstraint(
                "DATA",
                dataJson,
                dataJson,
                ConstraintType.MUST
            )
        );

        logInfoExec(
            executionId,
            "DATASET_INICIA_SOLICITACAO_CALL | DATA_LENGTH=" + dataJson.length
        );

        var ds = DatasetFactory.getDataset(
            DATASET_INICIA_SOLICITACAO,
            null,
            constraints,
            null
        );

        logInfoExec(
            executionId,
            "DATASET_INICIA_SOLICITACAO_RETURN | ROWS=" + (ds ? ds.rowsCount : "NULL")
        );

        if (!ds || ds.rowsCount === 0) {
            return {
                status: "ERRO",
                message: DATASET_INICIA_SOLICITACAO + " não retornou dados.",
                solicitacao: ""
            };
        }

        var status = safe(ds.getValue(0, "STATUS"));
        var message = safe(ds.getValue(0, "MESSAGE"));

        var solicitacao =
            safe(ds.getValue(0, "SOLICITACAO")) ||
            safe(ds.getValue(0, "NR_SOLICITACAO")) ||
            safe(ds.getValue(0, "NUM_PROCES")) ||
            safe(ds.getValue(0, "PROCESS_INSTANCE_ID")) ||
            safe(ds.getValue(0, "processInstanceId")) ||
            safe(ds.getValue(0, "iProcess"));

        logInfoExec(
            executionId,
            "DATASET_INICIA_SOLICITACAO_STATUS | STATUS=" + status
                + " | SOLICITACAO=" + solicitacao
                + " | MESSAGE=" + message
        );

        if (status === "OK") {
            return {
                status: "OK",
                message: message,
                solicitacao: solicitacao
            };
        }

        return {
            status: "ERRO",
            message: message || "Erro não informado pelo " + DATASET_INICIA_SOLICITACAO + ".",
            solicitacao: solicitacao
        };

    } catch (e) {
        logErrorExec(
            executionId,
            "DATASET_INICIA_SOLICITACAO_EXCEPTION | MESSAGE=" + getErrorMessage(e)
        );

        return {
            status: "ERRO",
            message: getErrorMessage(e),
            solicitacao: ""
        };
    }
}

// =====================================================
// Credenciais RM
// =====================================================
function getCredenciais() {
    var user = "";
    var password = "";
    var credenciais = [];

    var constraints = [];
    constraints.push(DatasetFactory.createConstraint("SISTEMA", "rm", "rm", ConstraintType.MUST));

    var ds = DatasetFactory.getDataset("ds_ts_credenciais", null, constraints, null);

    if (ds && ds.rowsCount > 0) {
        user = safe(ds.getValue(0, "nmUsuario"));
        password = safe(ds.getValue(0, "senhaUsuario"));
    }

    credenciais.push(user);
    credenciais.push(password);

    return credenciais;
}

// =====================================================
// Dataset de retorno
// =====================================================
function criarDatasetRetorno() {
    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");
    dataset.addColumn("TOTAL_RM");
    dataset.addColumn("TOTAL_GED");
    dataset.addColumn("CRIADAS");
    dataset.addColumn("IGNORADAS");
    dataset.addColumn("ERROS");
    dataset.addColumn("DRY_RUN");
    dataset.addColumn("ORIGEM");
    dataset.addColumn("EXECUTION_ID");
    dataset.addColumn("COMPETENCIA");
    dataset.addColumn("SOLICITACAO");
    dataset.addColumn("EMAIL_COLABORADOR");
    dataset.addColumn("NOME_COLABORADOR");
    dataset.addColumn("MATRICULA_FLUIG");
    dataset.addColumn("CHAPA");
    dataset.addColumn("CODPRJ");
    dataset.addColumn("IDPRJ");
    dataset.addColumn("CODTRF");
    dataset.addColumn("QTD_DIAS");
    dataset.addColumn("PAYLOAD_JSON");

    return dataset;
}

function addLinhaRetorno(dataset, dados) {
    dataset.addRow([
        safe(dados.status),
        safe(dados.message),
        safe(dados.totalRM),
        safe(dados.totalGED),
        safe(dados.criadas),
        safe(dados.ignoradas),
        safe(dados.erros),
        safe(dados.dryRun),
        safe(dados.origem),
        safe(dados.executionId),
        safe(dados.competencia),
        safe(dados.solicitacao),
        safe(dados.emailColaborador),
        safe(dados.nomeColaborador),
        safe(dados.matriculaFluig),
        safe(dados.chapa),
        safe(dados.codPrj),
        safe(dados.idPrj),
        safe(dados.codTrf),
        safe(dados.qtdDias),
        safe(dados.payloadJson)
    ]);
}

// =====================================================
// Helpers de data/hora
// =====================================================
function obterCompetenciaAtual() {
    var d = new Date();

    return pad2(d.getMonth() + 1) + "/" + d.getFullYear();
}

function normalizarDataBR(data) {
    if (!data) {
        return "";
    }

    data = String(data).trim();

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
        return data;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        var p = data.split("-");
        return p[2] + "/" + p[1] + "/" + p[0];
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(data)) {
        var p2 = data.substring(0, 10).split("-");
        return p2[2] + "/" + p2[1] + "/" + p2[0];
    }

    return data;
}

function obterCompetenciaPorDataBR(dataBR) {
    if (!dataBR) {
        return "";
    }

    var partes = String(dataBR).split("/");

    if (partes.length !== 3) {
        return "";
    }

    return partes[1] + "/" + partes[2];
}

function normalizarHora(hora) {
    if (hora === null || hora === undefined) {
        return "";
    }

    hora = String(hora).trim();

    if (/^\d{1,2}$/.test(hora)) {
        return ("0" + hora).slice(-2) + ":00";
    }

    if (/^\d+(\.\d+)?$/.test(hora)) {
        var decimal = parseFloat(hora);
        var h = Math.floor(decimal);
        var m = Math.round((decimal - h) * 60);

        return ("0" + h).slice(-2) + ":" + ("0" + m).slice(-2);
    }

    if (/^\d{1,2}:\d{2}$/.test(hora)) {
        var partes = hora.split(":");
        return ("0" + partes[0]).slice(-2) + ":" + partes[1];
    }

    return hora;
}

// =====================================================
// Helpers gerais
// =====================================================
function getConstraint(constraints, name) {
    if (!constraints) {
        return "";
    }

    name = String(name || "").toUpperCase();

    for (var i = 0; i < constraints.length; i++) {
        var fieldName = "";

        try {
            fieldName = constraints[i].fieldName;
        } catch (e1) {}

        if (!fieldName) {
            try {
                fieldName = constraints[i]._field;
            } catch (e2) {}
        }

        if (!fieldName) {
            try {
                fieldName = constraints[i].field;
            } catch (e3) {}
        }

        if (String(fieldName || "").toUpperCase() === name) {
            var value = "";

            try {
                value = constraints[i].initialValue;
            } catch (e4) {}

            if (value === null || value === undefined || value === "") {
                try {
                    value = constraints[i]._initialValue;
                } catch (e5) {}
            }

            if (value === null || value === undefined || value === "") {
                try {
                    value = constraints[i].value;
                } catch (e6) {}
            }

            return value === null || value === undefined ? "" : String(value);
        }
    }

    return "";
}

function getDatasetValue(ds, row, columns) {
    for (var i = 0; i < columns.length; i++) {
        try {
            var value = ds.getValue(row, columns[i]);

            if (value !== null && value !== undefined && String(value).trim() !== "") {
                return value;
            }
        } catch (e) {}
    }

    return "";
}

function removerDuplicadosObjetos(lista, chave) {
    var mapa = {};
    var resultado = [];

    for (var i = 0; i < lista.length; i++) {
        var valor = safe(lista[i][chave]);

        if (valor !== "" && !mapa[valor]) {
            mapa[valor] = true;
            resultado.push(lista[i]);
        }
    }

    return resultado;
}

function safe(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
}

function gerarExecutionId() {
    var d = new Date();

    return ""
        + d.getFullYear()
        + pad2(d.getMonth() + 1)
        + pad2(d.getDate())
        + pad2(d.getHours())
        + pad2(d.getMinutes())
        + pad2(d.getSeconds())
        + String(d.getMilliseconds());
}

function pad2(value) {
    return ("0" + value).slice(-2);
}

function logInfoExec(executionId, message) {
    log.info("### TS_AUTO_APONT ### [" + executionId + "] " + message);
}

function logWarnExec(executionId, message) {
    log.warn("### TS_AUTO_APONT ### [" + executionId + "] " + message);
}

function logErrorExec(executionId, message) {
    log.error("### TS_AUTO_APONT ### [" + executionId + "] " + message);
}

function getErrorMessage(e) {
    if (e === null || e === undefined) {
        return "Erro não identificado.";
    }

    if (e.message) {
        return e.message;
    }

    return String(e);
}