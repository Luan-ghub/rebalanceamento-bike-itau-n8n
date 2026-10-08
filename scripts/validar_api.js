const { analisarRebalanceamento } = require("../src/logica_rebalanceamento");

const URL_CADASTRO = "https://salvador.publicbikesystem.net/customer/gbfs/v3.0/station_information";
const URL_STATUS = "https://salvador.publicbikesystem.net/customer/gbfs/v3.0/station_status";

async function consultarJson(url) {
  const resposta = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "portfolio-rebalanceamento-bikes/1.0"
    },
    signal: AbortSignal.timeout(30000)
  });

  if (!resposta.ok) {
    throw new Error(`A consulta retornou o código HTTP ${resposta.status}.`);
  }

  return resposta.json();
}

async function executar() {
  console.log("Consultando o cadastro e a posição atual das estações...");

  const [cadastro, status] = await Promise.all([
    consultarJson(URL_CADASTRO),
    consultarJson(URL_STATUS)
  ]);

  const resultado = analisarRebalanceamento(cadastro, status);

  console.table([resultado.resumo]);

  if (resultado.ordens.length > 0) {
    console.log("\nPrimeiras ordens sugeridas:");
    console.table(resultado.ordens.slice(0, 10).map((ordem) => ({
      prioridade: ordem.prioridade,
      origem: ordem.origem,
      destino: ordem.destino,
      quantidade: ordem.quantidade,
      distancia_km: ordem.distancia_km
    })));
  }
}

executar().catch((erro) => {
  console.error(`Não foi possível validar a API: ${erro.message}`);
  process.exitCode = 1;
});
