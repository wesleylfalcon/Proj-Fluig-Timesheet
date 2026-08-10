function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("DATA");

    var anoCompetencia = "";
    var mes = "";

    // Captura constraints
    if (constraints != null) {
        for (var i = 0; i < constraints.length; i++) {
            if (constraints[i].fieldName == "ANO") {
                anoCompetencia = constraints[i].initialValue;
            }
            if (constraints[i].fieldName == "MES") {
                mes = constraints[i].initialValue;
            }
        }
    }

    if (!anoCompetencia || !mes) {
        throw "Constraints obrigatórias: anoCompetencia e mes";
    }

    // Mapa mês → campo
    var mapaMes = {
        "01": "dtJaneiro",
        "02": "dtFevereiro",
        "03": "dtMarco",
        "04": "dtAbril",
        "05": "dtMaio",
        "06": "dtJunho",
        "07": "dtJulho",
        "08": "dtAgosto",
        "09": "dtSetembro",
        "10": "dtOutubro",
        "11": "dtNovembro",
        "12": "dtDezembro"
    };

    var campoMes = mapaMes[mes];

    if (!campoMes) {
        throw "Mês inválido: " + mes;
    }

    // Constraint para dataset original
    var c1 = DatasetFactory.createConstraint("anoCompetencia", anoCompetencia, anoCompetencia, ConstraintType.MUST);
    var c2 = DatasetFactory.createConstraint("userSecurityId", "admin", "admin", ConstraintType.MUST);
    var ds = DatasetFactory.getDataset("dsDatasCompetencia", null, [c1, c2], null );

    if (ds == null || ds.rowsCount == 0) {
        throw "Nenhum registro encontrado para anoCompetencia: " + anoCompetencia;
    }

    var dataMes = ds.getValue(0, campoMes);

    dataset.addRow([
        dataMes
    ]);

    return dataset;
}