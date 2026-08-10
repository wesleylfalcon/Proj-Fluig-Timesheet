function createDataset(fields, constraints, sortFields) {
    var codSistema = "M";
    var codPrj = "";

    if (constraints !== null && constraints.length > 0) {
        for (var i = 0; i < constraints.length; i++) {
            if (constraints[i].fieldName == "CODPRJ") {
                codPrj = constraints[i].initialValue;
            }
        }
    }

    if (!codPrj || String(codPrj).trim() === "") {
        return criarDatasetErro("CODPRJ não informado.");
    }

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("ERRO");
    dataset.addColumn("GESTOR");
    dataset.addColumn("COORDENADOR");
    dataset.addColumn("ADM");
    dataset.addColumn("ADMINTS");
    dataset.addColumn("APROVADORES");

    var codSentenca = "APROVADORESPRJ";
    var papelAdmin = "AdminTimesheet";

    try {
        var credenciais = getCredenciais();
        var username = credenciais[0];
        var password = credenciais[1];

        if (!username || !password) {
            return criarDatasetErro("Credenciais RM não encontradas.");
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

        var result = authService.realizarConsultaSQL(
            codSentenca,
            1,
            codSistema,
            "CODPRJ=" + codPrj
        );

        var xml = new XML(result);
        var registros = xml.Resultado;

        if (!registros || registros.length() === 0) {
            return criarDatasetErro("Nenhum aprovador retornado pelo RM para o projeto " + codPrj + ".");
        }

        for each (var item in registros) {
            var emailGestor = getXmlValue(item.EMAIL_GESTOR);
            var emailCoord = getXmlValue(item.EMAIL_COORD);
            var emailAdm = getXmlValue(item.EMAIL_ADM);

            var matriculas = [];
            var emailsAdminTs = [];

            var errosMatricula = [];

            adicionarMatriculaPorEmail(matriculas, emailGestor, "GESTOR", errosMatricula);
            adicionarMatriculaPorEmail(matriculas, emailCoord, "COORDENADOR", errosMatricula);
            adicionarMatriculaPorEmail(matriculas, emailAdm, "ADM", errosMatricula);

            if (errosMatricula.length > 0) {
                return criarDatasetErro(
                    "E-mail(s) de aprovador não encontrado(s) no Fluig: "
                    + errosMatricula.join(" | ")
                );
            }

            adicionarUsuariosDoPapel(matriculas, emailsAdminTs, papelAdmin);

            matriculas = removerDuplicados(matriculas);
            emailsAdminTs = removerDuplicados(emailsAdminTs);

            if (matriculas.length === 0) {
                return criarDatasetErro(
                    "Nenhuma matrícula Fluig foi localizada para os aprovadores do projeto " + codPrj + "."
                );
            }

            var aprovadoresFinal = matriculas.join(",");
            var adminsFinal = emailsAdminTs.join(",");

            dataset.addRow([
                "",
                emailGestor,
                emailCoord,
                emailAdm,
                adminsFinal,
                aprovadoresFinal
            ]);
        }

    } catch (e) {
        return criarDatasetErro(
            "Erro ao consultar aprovadores do projeto " + codPrj + ": " + getErrorMessage(e)
        );
    }

    return dataset;
}

function criarDatasetErro(mensagem) {
	
    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("ERRO");

    dataset.addRow([
        String(mensagem || "Erro não identificado.")
    ]);

    return dataset;
}

function adicionarMatriculaPorEmail(lista, email, papel, errosMatricula) {
    email = String(email || "").trim();

    if (email === "") {
        return;
    }

    var matricula = buscarMatriculaPorEmail(email);

    if (matricula === "") {
        errosMatricula.push(
            "Papel: " + papel + " - E-mail: " + email
        );

        return;
    }

    lista.push(matricula);
}

function buscarMatriculaPorEmail(email) {
	
    var constraints = [];
    constraints.push(DatasetFactory.createConstraint("mail",email,email,ConstraintType.MUST));

    var ds = DatasetFactory.getDataset("colleague", null, constraints, null);

    if (!ds || ds.rowsCount === 0) {
        return "";
    }

    var matricula = ds.getValue(0, "colleaguePK.colleagueId");

    if (!matricula || String(matricula).trim() === "") {
        return "";
    }

    return String(matricula).trim();
}

function getXmlValue(value) {
	
    if (value === null || value === undefined) {
        return "";
    }

    return String(value.toString()).trim();
}

function removerDuplicados(lista) {
	
    var mapa = {};
    var resultado = [];

    for (var i = 0; i < lista.length; i++) {
        var valor = String(lista[i] || "").trim();

        if (valor !== "" && !mapa[valor]) {
            mapa[valor] = true;
            resultado.push(valor);
        }
    }

    return resultado;
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

function getCredenciais() {
	
    var user = "";
    var password = "";
    var credenciais = [];

    var constraints = [];
    constraints.push(DatasetFactory.createConstraint("SISTEMA","rm","rm",ConstraintType.MUST));

    var ds = DatasetFactory.getDataset("ds_ts_credenciais", null, constraints, null);

    if (ds && ds.rowsCount > 0) {
        user = ds.getValue(0, "nmUsuario");
        password = ds.getValue(0, "senhaUsuario");
    }

    credenciais.push(user);
    credenciais.push(password);

    return credenciais;
}

function adicionarUsuariosDoPapel(listaMatriculas, listaEmails, papelAdmin) {

    var constraints = [];

    constraints.push(
        DatasetFactory.createConstraint(
            "workflowColleagueRolePK.roleId",
            papelAdmin,
            papelAdmin,
            ConstraintType.MUST
        )
    );

    var ds = DatasetFactory.getDataset("workflowColleagueRole", null, constraints, null);

    if (!ds || ds.rowsCount === 0) {
        throw "Nenhum usuário encontrado no papel " + papelAdmin + ".";
    }

    for (var i = 0; i < ds.rowsCount; i++) {
        var matricula = ds.getValue(i, "workflowColleagueRolePK.colleagueId");

        if (!matricula || String(matricula).trim() === "") {
            continue;
        }

        matricula = String(matricula).trim();

        var email = buscarEmailPorMatricula(matricula);

        if (email === "") {
            throw "Usuário do papel " + papelAdmin
                + " sem e-mail cadastrado no Fluig"
                + " | Matrícula: " + matricula;
        }

        listaMatriculas.push(matricula);
        listaEmails.push(email);
    }
}

function buscarEmailPorMatricula(matricula) {
    var constraints = [];

    constraints.push(
        DatasetFactory.createConstraint(
            "colleaguePK.colleagueId",
            matricula,
            matricula,
            ConstraintType.MUST
        )
    );

    var ds = DatasetFactory.getDataset("colleague", null, constraints, null);

    if (!ds || ds.rowsCount === 0) {
        return "";
    }

    var email = ds.getValue(0, "mail");

    if (!email || String(email).trim() === "") {
        return "";
    }

    return String(email).trim();
}