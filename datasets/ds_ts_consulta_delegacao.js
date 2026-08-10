function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("documentid");
    dataset.addColumn("nmColaborador");
    dataset.addColumn("matrColaborador");
    dataset.addColumn("codRMColaborador");
    dataset.addColumn("nmResponsavel");
    dataset.addColumn("matrResponsavel");
    dataset.addColumn("status");
    dataset.addColumn("mensagem");

    var matrResponsavel = "";

    if (constraints) {
        for (var i = 0; i < constraints.length; i++) {
            if (constraints[i].fieldName == "MATRICULA") {
                matrResponsavel = constraints[i].initialValue;
            }
        }
    }

    try {
        if (!matrResponsavel) {
            dataset.addRow([
                "",
                "",
                "",
                "",
                "",
                "NOK",
                "Matrícula do responsável não informada"
            ]);

            return dataset;
        }
        
        var constraintsPai = [];
        constraintsPai.push(DatasetFactory.createConstraint("metadata#active", true, true, ConstraintType.MUST));
        constraintsPai.push(DatasetFactory.createConstraint("matrResponsavel", matrResponsavel, matrResponsavel, ConstraintType.MUST));

        var dsPai = DatasetFactory.getDataset("dsDelegarTimesheet", null, constraintsPai, null);

        // NÃO ENCONTROU
        if (!dsPai || dsPai.rowsCount === 0) {
            dataset.addRow([
                "",
                "",
                "",
                "",
                "",
                "",
                "NOK",
                "Responsável não possui delegações"
            ]);

            return dataset;
        }

        for (var i = 0; i < dsPai.rowsCount; i++) {
            var documentid = dsPai.getValue(i, "documentid");
            var nmResponsavel = dsPai.getValue(i, "nmResponsavel");
            var matrResponsavelPai = dsPai.getValue(i, "matrResponsavel");

            var constraintsFilho = [];
            constraintsFilho.push(DatasetFactory.createConstraint("metadata#active", true, true, ConstraintType.MUST));
            constraintsFilho.push(DatasetFactory.createConstraint("tableName", "tblDelegacao", "tblDelegacao", ConstraintType.MUST));
            constraintsFilho.push(DatasetFactory.createConstraint("documentid", documentid, documentid, ConstraintType.MUST));

            var dsFilho = DatasetFactory.getDataset("dsDelegarTimesheet", null, constraintsFilho, null);

            if (!dsFilho || dsFilho.rowsCount === 0) {
                dataset.addRow([
                    documentid,
                    "",
                    "",
                    "",
                    nmResponsavel,
                    matrResponsavelPai,
                    "OK",
                    "Responsável sem colaboradores"
                ]);

                continue;
            }
            for (var j = 0; j < dsFilho.rowsCount; j++) {
                dataset.addRow([
                    documentid,
                    dsFilho.getValue(j, "nmColaborador"),
                    dsFilho.getValue(j, "matrColaborador"),
                    dsFilho.getValue(j, "codRMColaborador"),
                    nmResponsavel,
                    matrResponsavelPai,
                    "OK",
                    ""
                ]);
            }
        }

    } catch (e) {
        dataset.addRow([
            "",
            "",
            "",
            "",
            "",
            "ERRO",
            e.message
        ]);
    }

    return dataset;
}