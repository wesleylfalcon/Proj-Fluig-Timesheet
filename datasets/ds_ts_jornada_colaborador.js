function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");
    dataset.addColumn("CODCOLIGADA");
    dataset.addColumn("CHAPA");
    dataset.addColumn("NOME");
    dataset.addColumn("CODHORARIO");
    dataset.addColumn("DESCRICAO_HORARIO");
    dataset.addColumn("DIAS_APONTAMENTO");
    dataset.addColumn("DIAS_SEMANA");
    dataset.addColumn("HORAS_DIA");
    dataset.addColumn("HORAS_DIA_DECIMAL");
    dataset.addColumn("DIAS_PERMITIDOS_JSON");

    var chapa = getConstraintValue(constraints, "CHAPA");

    if (safe(chapa) === "") {
        dataset.addRow([
            "ERRO",
            "Constraint CHAPA é obrigatória.",
            "", "", "", "", "", "", "", "", "", ""
        ]);
        return dataset;
    }

    try {
        var result = executarConsultaJornadaRM(chapa);
        var xmlResultado = extrairXmlResultadoConsultaSQL(result);

        if (safe(xmlResultado) === "") {
            dataset.addRow([
                "ERRO",
                "Consulta não retornou XML válido para a CHAPA " + chapa + ".",
                "", chapa, "", "", "", "", "", "", "", ""
            ]);
            return dataset;
        }

        var xml = new XML(xmlResultado);
        var registros = xml.Resultado;

        if (!registros || registros.length() === 0) {
            dataset.addRow([
                "ERRO",
                "Consulta não retornou jornada para a CHAPA " + chapa + ".",
                "", chapa, "", "", "", "", "", "", "", ""
            ]);
            return dataset;
        }

        for each (var row in registros) {
            var descricaoHorario = getXmlChildValue(row, "DESCRICAO_HORARIO");
            var diasSemana = getXmlChildValue(row, "DIAS_SEMANA");
            var horasDia = calcularHorasDiaPorDescricao(descricaoHorario);
            var diasPermitidos = parseDiasSemana(diasSemana);

            if (diasPermitidos.length === 0) {
                dataset.addRow([
                    "ERRO",
                    "Não foi possível interpretar DIAS_SEMANA da jornada. Valor retornado: " + diasSemana,
                    getXmlChildValue(row, "CODCOLIGADA"),
                    getXmlChildValue(row, "CHAPA"),
                    getXmlChildValue(row, "NOME"),
                    getXmlChildValue(row, "CODHORARIO"),
                    descricaoHorario,
                    getXmlChildValue(row, "DIAS_APONTAMENTO"),
                    diasSemana,
                    horasDia,
                    String(horaParaDecimal(horasDia)),
                    "[]"
                ]);
                continue;
            }

            dataset.addRow([
                "OK",
                "",
                getXmlChildValue(row, "CODCOLIGADA"),
                getXmlChildValue(row, "CHAPA"),
                getXmlChildValue(row, "NOME"),
                getXmlChildValue(row, "CODHORARIO"),
                descricaoHorario,
                getXmlChildValue(row, "DIAS_APONTAMENTO"),
                diasSemana,
                horasDia,
                String(horaParaDecimal(horasDia)),
                arrayNumericoParaJson(diasPermitidos)
            ]);
        }

    } catch (e) {
        dataset.addRow([
            "ERRO",
            "Erro ao consultar jornada RM: " + getErrorMessage(e),
            "", chapa, "", "", "", "", "", "", "", ""
        ]);
    }

    return dataset;
}

function executarConsultaJornadaRM(chapa) {
    var credenciais = getCredenciais();
    var username = credenciais[0];
    var password = credenciais[1];

    if (!username || !password) {
        throw "Credenciais RM não localizadas no dataset ds_ts_credenciais.";
    }

    var servico = ServiceManager.getServiceInstance("wsConsultaSQL");
    var instancia = servico.instantiate("com.totvs.WsConsultaSQL");
    var ws = instancia.getRMIwsConsultaSQL();
    var serviceHelper = servico.getBean();
    var authService = serviceHelper.getBasicAuthenticatedClient(
        ws,
        "com.totvs.IwsConsultaSQL",
        username,
        password
    );

    return authService.realizarConsultaSQL(
        "CONS.TIMESHEET.JORNADA",
        1,
        "P",
        "CHAPA=" + chapa
    );
}

function extrairXmlResultadoConsultaSQL(xmlString) {
    var texto = String(xmlString || "").trim();

    if (texto === "") {
        return "";
    }

    if (texto.indexOf("<NewDataSet") >= 0 && texto.indexOf("<s:Envelope") < 0) {
        return texto;
    }

    var inicioCdata = texto.indexOf("<![CDATA[");
    var fimCdata = texto.indexOf("]]>");

    if (inicioCdata >= 0 && fimCdata > inicioCdata) {
        return texto.substring(inicioCdata + 9, fimCdata).trim();
    }

    var inicioNewDataSet = texto.indexOf("<NewDataSet");
    var fimNewDataSet = texto.lastIndexOf("</NewDataSet>");

    if (inicioNewDataSet >= 0 && fimNewDataSet > inicioNewDataSet) {
        return texto.substring(
            inicioNewDataSet,
            fimNewDataSet + "</NewDataSet>".length
        ).trim();
    }

    return "";
}

function parseDiasSemana(diasSemana) {
    var texto = normalizarTexto(diasSemana);
    var mapa = {
        "DOMINGO": 0,
        "SEGUNDA": 1,
        "TERCA": 2,
        "QUARTA": 3,
        "QUINTA": 4,
        "SEXTA": 5,
        "SABADO": 6
    };

    if (texto === "SEGUNDA A SEXTA") {
        return [1, 2, 3, 4, 5];
    }

    if (texto === "SEGUNDA A QUINTA") {
        return [1, 2, 3, 4];
    }

    if (texto === "TERCA A SABADO") {
        return [2, 3, 4, 5, 6];
    }

    if (texto === "SEGUNDA A SABADO") {
        return [1, 2, 3, 4, 5, 6];
    }

    if (texto === "DOMINGO A QUINTA") {
        return [0, 1, 2, 3, 4];
    }

    if (texto === "SABADO E DOMINGO") {
        return [6, 0];
    }

    if (texto.indexOf(" A ") >= 0) {
        var partes = texto.split(" A ");
        var inicio = mapa[safe(partes[0]).trim()];
        var fim = mapa[safe(partes[1]).trim()];

        if (inicio !== undefined && fim !== undefined) {
            return montarIntervaloDias(inicio, fim);
        }
    }

    var dias = [];

    for (var nome in mapa) {
        if (texto.indexOf(nome) >= 0) {
            dias.push(mapa[nome]);
        }
    }

    return removerDuplicadosNumeros(dias);
}

function montarIntervaloDias(inicio, fim) {
    var dias = [];
    var atual = inicio;

    for (var i = 0; i < 7; i++) {
        dias.push(atual);

        if (atual === fim) {
            break;
        }

        atual++;

        if (atual > 6) {
            atual = 0;
        }
    }

    return dias;
}

function calcularHorasDiaPorDescricao(descricao) {
    descricao = normalizarTexto(descricao);

    var regex = /(\d{1,2}:\d{2})\s+AS\s+(\d{1,2}:\d{2})/g;
    var match;
    var totalMinutos = 0;

    while ((match = regex.exec(descricao)) !== null) {
        totalMinutos += diffMinutos(match[1], match[2]);
    }

    if (totalMinutos <= 0) {
        return "08:00";
    }

    return minutosParaHora(totalMinutos);
}

function diffMinutos(inicio, fim) {
    var ini = horaParaMinutos(inicio);
    var f = horaParaMinutos(fim);

    if (f < ini) {
        f += 24 * 60;
    }

    return f - ini;
}

function horaParaMinutos(hora) {
    var partes = String(hora || "00:00").split(":");
    var h = parseInt(partes[0], 10);
    var m = parseInt(partes[1], 10);

    if (isNaN(h)) h = 0;
    if (isNaN(m)) m = 0;

    return (h * 60) + m;
}

function minutosParaHora(minutos) {
    minutos = parseInt(minutos || 0, 10);

    var h = Math.floor(minutos / 60);
    var m = minutos % 60;

    return pad2(h) + ":" + pad2(m);
}

function horaParaDecimal(hora) {
    return horaParaMinutos(hora) / 60;
}

function arrayNumericoParaJson(lista) {
    var valores = [];

    for (var i = 0; i < lista.length; i++) {
        valores.push(String(parseInt(lista[i], 10)));
    }

    return "[" + valores.join(",") + "]";
}

function removerDuplicadosNumeros(lista) {
    var mapa = {};
    var retorno = [];

    for (var i = 0; i < lista.length; i++) {
        var valor = parseInt(lista[i], 10);

        if (isNaN(valor)) {
            continue;
        }

        if (mapa[String(valor)] !== true) {
            mapa[String(valor)] = true;
            retorno.push(valor);
        }
    }

    return retorno;
}

function normalizarTexto(valor) {
    return String(valor || "")
        .toUpperCase()
        .replace(/[ÁÀÂÃ]/g, "A")
        .replace(/[ÉÈÊ]/g, "E")
        .replace(/[ÍÌÎ]/g, "I")
        .replace(/[ÓÒÔÕ]/g, "O")
        .replace(/[ÚÙÛ]/g, "U")
        .replace(/Ç/g, "C")
        .replace(/\s+/g, " ")
        .trim();
}

function getConstraintValue(constraints, fieldName) {
    if (constraints !== null && constraints !== undefined && constraints.length > 0) {
        for (var i = 0; i < constraints.length; i++) {
            if (constraints[i].fieldName === fieldName) {
                return constraints[i].initialValue;
            }
        }
    }

    return "";
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

function getCredenciais() {
    var user = "";
    var password = "";
    var credenciais = [];
    var constraints = [];

    constraints.push(DatasetFactory.createConstraint("SISTEMA", "rm", "rm", ConstraintType.MUST));

    var ds = DatasetFactory.getDataset("ds_ts_credenciais", null, constraints, null);

    if (ds && ds.rowsCount > 0) {
        user = ds.getValue(0, "nmUsuario");
        password = ds.getValue(0, "senhaUsuario");
    }

    credenciais.push(user);
    credenciais.push(password);

    return credenciais;
}

function pad2(valor) {
    valor = parseInt(valor, 10);

    if (isNaN(valor)) {
        valor = 0;
    }

    return valor < 10 ? "0" + valor : String(valor);
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
