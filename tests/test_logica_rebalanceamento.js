const assert = require("node:assert/strict");
const {
  analisarRebalanceamento,
  classificarOcupacao,
  distanciaEmKm
} = require("../src/logica_rebalanceamento");

function respostaCadastro() {
  return {
    data: {
      stations: [
        { station_id: "A", name: [{ language: "pt", text: "Estação sem bikes" }], capacity: 10, lat: -12.9700, lon: -38.5100 },
        { station_id: "B", name: [{ language: "pt", text: "Estação doadora" }], capacity: 10, lat: -12.9710, lon: -38.5110 },
        { station_id: "C", name: [{ language: "pt", text: "Estação equilibrada" }], capacity: 20, lat: -12.9800, lon: -38.5200 },
        { station_id: "D", name: [{ language: "pt", text: "Estação indisponível" }], capacity: 10, lat: -12.9900, lon: -38.5300 }
      ]
    }
  };
}

function respostaStatus() {
  return {
    data: {
      stations: [
        { station_id: "A", num_vehicles_available: 0, num_docks_available: 10, is_installed: true, is_renting: true, is_returning: true },
        { station_id: "B", num_vehicles_available: 9, num_docks_available: 1, is_installed: true, is_renting: true, is_returning: true },
        { station_id: "C", num_vehicles_available: 10, num_docks_available: 10, is_installed: true, is_renting: true, is_returning: true },
        { station_id: "D", num_vehicles_available: 10, num_docks_available: 0, is_installed: true, is_renting: false, is_returning: false }
      ]
    }
  };
}

const parametrosFixos = {
  agora: "2026-10-02T12:00:00.000Z",
  fusoHorario: "America/Bahia"
};

const resultado = analisarRebalanceamento(respostaCadastro(), respostaStatus(), parametrosFixos);

assert.equal(resultado.resumo.total_estacoes, 4);
assert.equal(resultado.resumo.estacoes_operacionais, 3);
assert.equal(resultado.resumo.criticas, 1);
assert.equal(resultado.resumo.risco_lotacao, 0);
assert.equal(resultado.resumo.excesso, 1);
assert.equal(resultado.ordens.length, 1);
assert.equal(resultado.ordens[0].origem, "Estação doadora");
assert.equal(resultado.ordens[0].destino, "Estação sem bikes");
assert.equal(resultado.ordens[0].quantidade, 5);
assert.equal(resultado.ordens[0].prioridade, "Crítica");
assert.equal(resultado.ordens[0].chave_ordem, "2026-10-02_B_A");

assert.equal(classificarOcupacao(0.15, {
  limiteCritico: 0.15,
  limiteAtencao: 0.30,
  limiteDoadora: 0.80,
  limiteLotacao: 0.90
}), "Crítica");

assert.ok(distanciaEmKm(-12.9700, -38.5100, -12.9710, -38.5110) > 0);

const semDoadora = respostaStatus();
semDoadora.data.stations.find((item) => item.station_id === "B").num_vehicles_available = 6;
const resultadoSemDoadora = analisarRebalanceamento(respostaCadastro(), semDoadora, parametrosFixos);
assert.equal(resultadoSemDoadora.ordens.length, 0);

console.log("Testes da lógica concluídos com sucesso.");
