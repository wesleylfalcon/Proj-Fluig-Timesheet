function createDataset(fields, constraints, sortFields) {

    var dataset = DatasetBuilder.newDataset();

    dataset.addColumn("STATUS");
    dataset.addColumn("MESSAGE");

    dataset.addColumn("documentId");
    dataset.addColumn("statusProcessamento");

    dataset.addColumn("total");
    dataset.addColumn("processados");
    dataset.addColumn("sucesso");
    dataset.addColumn("erro");

    dataset.addColumn("percentual");

    dataset.addColumn("dataInicio");
    dataset.addColumn("dataFim");

    try {

        // =====================================================
        // PARAMS
        // =====================================================

        var documentId = "";

        if (constraints != null) {

            for (var i = 0; i < constraints.length; i++) {

                var c = constraints[i];

                if (c.fieldName == "documentId") {
                    documentId = c.initialValue;
                }
            }
        }

        // =====================================================
        // VALIDACAO
        // =====================================================

        if (documentId == "") {

            dataset.addRow([
                "ERRO",
                "documentId nao informado",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                ""
            ]);

            return dataset;
        }

        // =====================================================
        // DATASET FULL
        // =====================================================

        var dsControleFull = DatasetFactory.getDataset(
            "dsControleAprovacaoTotal",
            null,
            null,
            null
        );

        // =====================================================
        // LOCALIZA CONTROLE
        // =====================================================

        var controleIndex = -1;

        for (var i = 0; i < dsControleFull.rowsCount; i++) {

            var idAtual = dsControleFull.getValue(
                i,
                "metadata#id"
            );

            if (String(idAtual) != String(documentId)) {
                continue;
            }

            if (controleIndex == -1 || compararVersaoDataset(dsControleFull, i, controleIndex) >= 0) {
                controleIndex = i;
            }
        }

        // =====================================================
        // NAO ENCONTRADO
        // =====================================================

        if (controleIndex == -1) {

            dataset.addRow([
                "ERRO",
                "Controle nao encontrado",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                ""
            ]);

            return dataset;
        }

        // =====================================================
        // DADOS
        // =====================================================

        var status = dsControleFull.getValue(
            controleIndex,
            "status"
        );

        var total = parseInt(
            dsControleFull.getValue(
                controleIndex,
                "total"
            ) || "0"
        );

        var processados = parseInt(
            dsControleFull.getValue(
                controleIndex,
                "processados"
            ) || "0"
        );

        var sucesso = parseInt(
            dsControleFull.getValue(
                controleIndex,
                "sucesso"
            ) || "0"
        );

        var erro = parseInt(
            dsControleFull.getValue(
                controleIndex,
                "erro"
            ) || "0"
        );

        var dataInicio = dsControleFull.getValue(
            controleIndex,
            "dataInicio"
        );

        var dataFim = dsControleFull.getValue(
            controleIndex,
            "dataFim"
        );

        // =====================================================
        // PERCENTUAL
        // =====================================================

        var percentual = 0;

        if (total > 0) {

            percentual = (
                (processados / total) * 100
            ).toFixed(2);
        }

        // =====================================================
        // RESULT
        // =====================================================

        dataset.addRow([
            "OK",
            "Controle localizado",

            String(documentId),
            status,

            String(total),
            String(processados),
            String(sucesso),
            String(erro),

            String(percentual),

            dataInicio,
            dataFim
        ]);

    } catch (e) {

        dataset.addRow([
            "ERRO",
            e.message || String(e),

            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
        ]);
    }

    return dataset;
}

function compararVersaoDataset(ds, indexNovo, indexAtual) {
    var versaoNovo = parseInt(ds.getValue(indexNovo, "metadata#version") || ds.getValue(indexNovo, "version") || "0", 10);
    var versaoAtual = parseInt(ds.getValue(indexAtual, "metadata#version") || ds.getValue(indexAtual, "version") || "0", 10);

    if (isNaN(versaoNovo)) versaoNovo = 0;
    if (isNaN(versaoAtual)) versaoAtual = 0;

    if (versaoNovo > versaoAtual) return 1;
    if (versaoNovo < versaoAtual) return -1;
    return 0;
}
