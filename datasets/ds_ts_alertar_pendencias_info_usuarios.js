function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");
    dataset.addColumn("TOTAL_ENVIADOS");
    dataset.addColumn("TOTAL_ERRO");
    dataset.addColumn("DETALHES_JSON");

    var TEMPLATE_CODE = "ts_notificacao_pendencias";
    var REMETENTE = "admin";
    
    var MODO_TESTE_EMAIL = false;
    var EMAIL_TESTE = "weslfalcon@gmail.com";
    
    var URL = "https://fluig.cloudtotvs.com.br";//HOM
    var COMPANYID = 1;

    var competencia = "";
    var usuariosJson = "";

    if (constraints) {
        for (var i = 0; i < constraints.length; i++) {
            if (constraints[i].fieldName == "COMPETENCIA") {
                competencia = safe(constraints[i].initialValue);
            }

            if (constraints[i].fieldName == "USUARIOS_JSON") {
                usuariosJson = safe(constraints[i].initialValue);
            }
        }
    }

    if (!competencia) {
        dataset.addRow([
            "ERRO",
            "Informe a constraint COMPETENCIA.",
            "0",
            "1",
            "[]"
        ]);
        return dataset;
    }

    if (!usuariosJson) {
        dataset.addRow([
            "ERRO",
            "Informe a constraint USUARIOS_JSON.",
            "0",
            "1",
            "[]"
        ]);
        return dataset;
    }

    try {
        var usuarios = JSON.parse(usuariosJson);

        var totalEnviados = 0;
        var totalErro = 0;
        var detalhes = [];

        for (var u = 0; u < usuarios.length; u++) {
            var usuario = usuarios[u];

            var matricula = safe(usuario.matricula);
            var colaborador = safe(usuario.colaborador);
            var email = safe(usuario.email);
            var horasPendentes = safe(usuario.horasPendentes || usuario.horas || usuario.HORAS);

            try {
                if (!colaborador) {
                    colaborador = matricula;
                }

                if (!email) {
                    throw "Usuário sem e-mail cadastrado.";
                }

                if (!horasPendentes) {
                    horasPendentes = "0,00";
                }

                var parametros = new java.util.HashMap();
                parametros.put("COLABORADOR", String(colaborador));
                parametros.put("COMPETENCIA", String(competencia));
                parametros.put("HORAS", String(horasPendentes));
                parametros.put("SERVER_URL", String(URL));
                parametros.put("TENANT_ID", String(COMPANYID));
                parametros.put("subject", "Timesheet - Apontamentos pendentes");

                var emailEnvio = MODO_TESTE_EMAIL ? String(EMAIL_TESTE) : String(email);

                var destinatarios = new java.util.ArrayList();
                destinatarios.add(emailEnvio);

                notifier.notify(
                    String(REMETENTE),
                    String(TEMPLATE_CODE),
                    parametros,
                    destinatarios,
                    "text/html"
                );

                totalEnviados++;

                detalhes.push({
                    matricula: matricula,
                    colaborador: colaborador,
                    email: mascararEmail(email),
                    emailEnvio: mascararEmail(emailEnvio),
                    horas: horasPendentes,
                    status: MODO_TESTE_EMAIL ? "ENVIADO_TESTE" : "ENVIADO",
                    mensagem: MODO_TESTE_EMAIL
                        ? "E-mail redirecionado para endereço de teste."
                        : "E-mail enviado com sucesso."
                });

            } catch (eUser) {
                totalErro++;

                detalhes.push({
                    matricula: matricula,
                    colaborador: colaborador,
                    email: mascararEmail(email),
                    horas: horasPendentes,
                    status: "ERRO",
                    mensagem: getErrorMessage(eUser)
                });
                
                dataset.addRow([
                    "ERRO",
                    eUser,
                    "0",
                    "1",
                    "[]"
                ]);

                log.error("### ds_ts_alertar_pendencias_info_usuarios ### ERRO USUARIO=" + matricula);
                log.error(eUser);
            }
        }

        dataset.addRow([
            totalErro > 0 ? "PARCIAL" : "OK",
            montarMensagemFinal(totalEnviados, totalErro),
            String(totalEnviados),
            String(totalErro),
            JSON.stringify(detalhes)
        ]);

    } catch (e) {
        log.error("### ds_ts_alertar_pendencias_info_usuarios ### ERRO GERAL");
        log.error(e);

        dataset.addRow([
            "ERRO",
            "Erro ao processar alertas de pendência: " + getErrorMessage(e),
            "0",
            "1",
            "[]"
        ]);
    }

    return dataset;
}

function montarMensagemFinal(totalEnviados, totalErro) {
    if (totalEnviados > 0 && totalErro === 0) {
        return "Alertas enviados com sucesso. Total enviado: " + totalEnviados + ".";
    }

    if (totalEnviados > 0 && totalErro > 0) {
        return "Alertas enviados parcialmente. Enviados: " + totalEnviados + ". Erros: " + totalErro + ".";
    }

    return "Nenhum alerta enviado. Erros: " + totalErro + ".";
}

function mascararEmail(email) {
    email = safe(email);

    if (email.indexOf("@") < 0) {
        return email;
    }

    var partes = email.split("@");
    var usuario = partes[0];
    var dominio = partes[1];

    if (usuario.length <= 2) {
        return "**@" + dominio;
    }

    return usuario.substring(0, 2) + "***@" + dominio;
}

function safe(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
}

function getErrorMessage(e) {
    if (!e) {
        return "Erro não identificado.";
    }

    if (e.message) {
        return e.message;
    }

    return String(e);
}