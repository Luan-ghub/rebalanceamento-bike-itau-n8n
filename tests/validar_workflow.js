const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const arquivoWorkflow = path.join(
  __dirname,
  "..",
  "workflows",
  "bike_itau_rebalanceamento.json"
);

const workflow = JSON.parse(fs.readFileSync(arquivoWorkflow, "utf8"));
const nomes = workflow.nodes.map((node) => node.name);
const nomesUnicos = new Set(nomes);

assert.equal(nomes.length, nomesUnicos.size, "Existem nós com nomes repetidos.");
assert.ok(nomes.includes("Analisar e gerar ordens"));
assert.ok(nomes.includes("Registrar novas ordens"));
assert.ok(nomes.includes("Registrar execução"));

for (const [origem, saidas] of Object.entries(workflow.connections)) {
  assert.ok(nomesUnicos.has(origem), `A conexão parte de um nó inexistente: ${origem}`);

  for (const grupo of saidas.main || []) {
    for (const conexao of grupo) {
      assert.ok(
        nomesUnicos.has(conexao.node),
        `A conexão aponta para um nó inexistente: ${conexao.node}`
      );
    }
  }
}

const codigos = workflow.nodes
  .filter((node) => node.type === "n8n-nodes-base.code")
  .map((node) => ({ nome: node.name, codigo: node.parameters.jsCode }));

for (const item of codigos) {
  assert.doesNotThrow(
    () => new Function(item.codigo),
    `O código do nó ${item.nome} possui erro de sintaxe.`
  );
}

const tabelaOrdens = workflow.nodes.find((node) => node.name === "Preparar tabela de ordens");
const colunasOrdens = tabelaOrdens.parameters.columns.column.map((coluna) => coluna.name);
assert.ok(colunasOrdens.includes("chave_ordem"));
assert.ok(colunasOrdens.includes("status"));
assert.ok(colunasOrdens.includes("execucao_id"));

console.log("Estrutura e sintaxe do workflow validadas com sucesso.");
